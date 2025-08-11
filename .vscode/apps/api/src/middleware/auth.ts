// =============================================================================
// AUTHENTICATION MIDDLEWARE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthenticationError, AuthorizationError } from './error-handler';
import { loggers } from '../utils/logger';
import { RedisService } from '../services/redis';
import { DatabaseService } from '../services/database';
import { ITokenPayload, IUserSafe } from '@credit-decision/types';

// =============================================================================
// EXTEND REQUEST INTERFACE
// =============================================================================

declare global {
  namespace Express {
    interface Request {
      user?: IUserSafe;
      token?: string;
      sessionId?: string;
    }
  }
}

// =============================================================================
// JWT UTILITIES
// =============================================================================

export class JWTService {
  private static readonly SECRET = config.security.jwtSecret;
  private static readonly EXPIRES_IN = config.security.jwtExpiresIn;

  static generateToken(payload: Omit<ITokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.SECRET, {
      expiresIn: this.EXPIRES_IN,
      issuer: 'credit-decision-api',
      audience: 'credit-decision-platform',
    });
  }

  static verifyToken(token: string): ITokenPayload {
    try {
      return jwt.verify(token, this.SECRET, {
        issuer: 'credit-decision-api',
        audience: 'credit-decision-platform',
      }) as ITokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      }
      throw new AuthenticationError('Token verification failed');
    }
  }

  static generateRefreshToken(): string {
    return jwt.sign(
      { type: 'refresh' },
      this.SECRET,
      { expiresIn: '7d' }
    );
  }

  static decodeToken(token: string): any {
    return jwt.decode(token);
  }
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

export class SessionService {
  private static redis = RedisService.getInstance();

  static async createSession(
    userId: string,
    sessionId: string,
    metadata: any = {}
  ): Promise<void> {
    const sessionKey = `session:${sessionId}`;
    const userSessionsKey = `user_sessions:${userId}`;
    
    const sessionData = {
      userId,
      sessionId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      isActive: true,
      ...metadata,
    };

    // Store session data
    await this.redis.setex(sessionKey, 86400, JSON.stringify(sessionData)); // 24 hours
    
    // Add to user's active sessions
    await this.redis.sadd(userSessionsKey, sessionId);
    await this.redis.expire(userSessionsKey, 86400);
  }

  static async getSession(sessionId: string): Promise<any | null> {
    const sessionKey = `session:${sessionId}`;
    const sessionData = await this.redis.get(sessionKey);
    
    if (!sessionData) {
      return null;
    }

    return JSON.parse(sessionData);
  }

  static async updateSessionActivity(sessionId: string): Promise<void> {
    const sessionKey = `session:${sessionId}`;
    const sessionData = await this.getSession(sessionId);
    
    if (sessionData) {
      sessionData.lastActivity = new Date().toISOString();
      await this.redis.setex(sessionKey, 86400, JSON.stringify(sessionData));
    }
  }

  static async invalidateSession(sessionId: string): Promise<void> {
    const sessionKey = `session:${sessionId}`;
    const sessionData = await this.getSession(sessionId);
    
    if (sessionData) {
      const userSessionsKey = `user_sessions:${sessionData.userId}`;
      await this.redis.srem(userSessionsKey, sessionId);
    }
    
    await this.redis.del(sessionKey);
  }

  static async invalidateAllUserSessions(userId: string): Promise<void> {
    const userSessionsKey = `user_sessions:${userId}`;
    const sessionIds = await this.redis.smembers(userSessionsKey);
    
    for (const sessionId of sessionIds) {
      await this.redis.del(`session:${sessionId}`);
    }
    
    await this.redis.del(userSessionsKey);
  }

  static async isSessionValid(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return session && session.isActive;
  }
}

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT token
    const payload = JWTService.verifyToken(token);
    
    // Check if session is still valid
    if (!(await SessionService.isSessionValid(payload.sessionId))) {
      throw new AuthenticationError('Session has expired');
    }

    // Get user from database
    const db = DatabaseService.getInstance();
    const user = await db.query(
      `SELECT 
        u.id, u.email, u.username, u.first_name, u.last_name, 
        u.is_active, u.last_login_at,
        ARRAY_AGG(DISTINCT r.name) as roles,
        ARRAY_AGG(DISTINCT p.name) as permissions
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1 AND u.is_active = true AND u.deleted_at IS NULL
      GROUP BY u.id`,
      [payload.userId]
    );

    if (!user.rows[0]) {
      throw new AuthenticationError('User not found or inactive');
    }

    const userData = user.rows[0];
    
    // Create user object for request
    req.user = {
      id: userData.id,
      email: userData.email,
      username: userData.username,
      firstName: userData.first_name,
      lastName: userData.last_name,
      isActive: userData.is_active,
      roles: userData.roles.filter(Boolean),
      permissions: userData.permissions.filter(Boolean),
      profile: {}, // Will be populated if needed
      lastLoginAt: userData.last_login_at,
    };

    req.token = token;
    req.sessionId = payload.sessionId;

    // Update session activity
    await SessionService.updateSessionActivity(payload.sessionId);

    // Log authentication success
    loggers.auth.debug('User authenticated successfully', {
      userId: req.user.id,
      sessionId: req.sessionId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    next();
  } catch (error) {
    // Log authentication failure
    loggers.auth.warn('Authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
    });

    next(error);
  }
}

// =============================================================================
// AUTHORIZATION MIDDLEWARE
// =============================================================================

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('User not authenticated'));
    }

    if (!req.user.permissions.includes(permission)) {
      loggers.auth.warn('Authorization failed - insufficient permissions', {
        userId: req.user.id,
        requiredPermission: permission,
        userPermissions: req.user.permissions,
        path: req.path,
      });

      return next(new AuthorizationError(`Permission '${permission}' required`));
    }

    next();
  };
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('User not authenticated'));
    }

    if (!req.user.roles.includes(role)) {
      loggers.auth.warn('Authorization failed - insufficient role', {
        userId: req.user.id,
        requiredRole: role,
        userRoles: req.user.roles,
        path: req.path,
      });

      return next(new AuthorizationError(`Role '${role}' required`));
    }

    next();
  };
}

export function requireAnyRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('User not authenticated'));
    }

    const hasRole = roles.some(role => req.user!.roles.includes(role));
    
    if (!hasRole) {
      loggers.auth.warn('Authorization failed - no required roles', {
        userId: req.user.id,
        requiredRoles: roles,
        userRoles: req.user.roles,
        path: req.path,
      });

      return next(new AuthorizationError(`One of roles [${roles.join(', ')}] required`));
    }

    next();
  };
}

export function requireAnyPermission(permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('User not authenticated'));
    }

    const hasPermission = permissions.some(permission => 
      req.user!.permissions.includes(permission)
    );
    
    if (!hasPermission) {
      loggers.auth.warn('Authorization failed - no required permissions', {
        userId: req.user.id,
        requiredPermissions: permissions,
        userPermissions: req.user.permissions,
        path: req.path,
      });

      return next(new AuthorizationError(`One of permissions [${permissions.join(', ')}] required`));
    }

    next();
  };
}

// =============================================================================
// OPTIONAL AUTHENTICATION MIDDLEWARE
// =============================================================================

export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await authMiddleware(req, res, next);
    } else {
      next();
    }
  } catch (error) {
    // For optional auth, we don't fail on auth errors
    next();
  }
}

// =============================================================================
// API KEY AUTHENTICATION
// =============================================================================

export async function apiKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      throw new AuthenticationError('API key required');
    }

    // Verify API key in database
    const db = DatabaseService.getInstance();
    const result = await db.query(
      `SELECT ak.*, u.id as user_id, u.email, u.is_active
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.key_hash = $1 AND ak.is_active = true AND u.is_active = true`,
      [apiKey] // In production, you should hash the API key
    );

    if (!result.rows[0]) {
      throw new AuthenticationError('Invalid API key');
    }

    const apiKeyData = result.rows[0];

    // Check expiration
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      throw new AuthenticationError('API key has expired');
    }

    // Update last used timestamp
    await db.query(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [apiKeyData.id]
    );

    // Set user context (simplified for API key auth)
    req.user = {
      id: apiKeyData.user_id,
      email: apiKeyData.email,
      username: '',
      firstName: '',
      lastName: '',
      isActive: apiKeyData.is_active,
      roles: [],
      permissions: [],
      profile: {},
    };

    loggers.auth.debug('API key authentication successful', {
      userId: req.user.id,
      apiKeyId: apiKeyData.id,
      ip: req.ip,
    });

    next();
  } catch (error) {
    loggers.auth.warn('API key authentication failed', {
      error: error.message,
      ip: req.ip,
      path: req.path,
    });

    next(error);
  }
}
