// =============================================================================
// REQUEST LOGGER MIDDLEWARE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { loggers } from '../utils/logger';

// =============================================================================
// EXTEND REQUEST INTERFACE
// =============================================================================

declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
    }
  }
}

// =============================================================================
// REQUEST LOGGER MIDDLEWARE
// =============================================================================

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate unique request ID
  req.id = uuidv4();
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.id);

  // Log request start
  loggers.api.info('Request started', {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    referer: req.get('Referer'),
    userId: req.user?.id,
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - req.startTime;
    
    // Log response
    loggers.api.info('Request completed', {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      contentLength: res.get('Content-Length'),
      userId: req.user?.id,
    });

    // Log performance metrics
    loggers.monitoring.performanceMetric('api_response_time', responseTime, 'ms', {
      method: req.method,
      endpoint: req.route?.path || req.path,
      statusCode: res.statusCode,
    });

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

// =============================================================================
// AUDIT LOGGER MIDDLEWARE
// =============================================================================

export function auditLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only log certain operations for audit
  const auditMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  const auditPaths = [
    '/api/applications',
    '/api/decisions',
    '/api/users',
    '/api/documents',
  ];

  if (auditMethods.includes(req.method) && 
      auditPaths.some(path => req.path.startsWith(path))) {
    
    // Override res.end to log audit event
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      // Only log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        loggers.business.businessEvent(
          `${req.method}_${req.path.split('/')[2]?.toUpperCase()}`,
          req.path.split('/')[2] || 'unknown',
          req.params.id || 'unknown',
          {
            requestId: req.id,
            userId: req.user?.id,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            body: sanitizeBody(req.body),
          }
        );
      }

      originalEnd.call(this, chunk, encoding);
    };
  }

  next();
}

// =============================================================================
// SECURITY LOGGER MIDDLEWARE
// =============================================================================

export function securityLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log security-relevant events
  const securityPaths = [
    '/api/auth',
    '/api/users',
  ];

  if (securityPaths.some(path => req.path.startsWith(path))) {
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const isFailure = res.statusCode >= 400;
      
      if (isFailure) {
        loggers.security.securityEvent(
          `${req.method}_${req.path}_FAILED`,
          req.user?.id,
          {
            requestId: req.id,
            statusCode: res.statusCode,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
          }
        );
      }

      originalEnd.call(this, chunk, encoding);
    };
  }

  next();
}

// =============================================================================
// RATE LIMIT LOGGER MIDDLEWARE
// =============================================================================

export function rateLimitLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log rate limit hits
  res.on('finish', () => {
    if (res.statusCode === 429) {
      loggers.security.securityEvent(
        'RATE_LIMIT_EXCEEDED',
        req.user?.id,
        {
          requestId: req.id,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          rateLimitHeaders: {
            limit: res.get('X-RateLimit-Limit'),
            remaining: res.get('X-RateLimit-Remaining'),
            reset: res.get('X-RateLimit-Reset'),
          },
        }
      );
    }
  });

  next();
}

// =============================================================================
// ERROR LOGGER MIDDLEWARE
// =============================================================================

export function errorLogger(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error with request context
  loggers.api.error('Request error', error, {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: sanitizeBody(req.body),
    params: req.params,
    query: req.query,
  });

  next(error);
}

// =============================================================================
// SLOW REQUEST LOGGER MIDDLEWARE
// =============================================================================

export function slowRequestLogger(threshold: number = 5000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const responseTime = Date.now() - req.startTime;
      
      if (responseTime > threshold) {
        loggers.monitoring.warn('Slow request detected', {
          requestId: req.id,
          method: req.method,
          url: req.originalUrl,
          responseTime,
          threshold,
          statusCode: res.statusCode,
          userId: req.user?.id,
        });
      }

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'confirmPassword',
    'currentPassword',
    'newPassword',
    'token',
    'apiKey',
    'secret',
    'ssn',
    'creditCardNumber',
    'bankAccountNumber',
  ];

  function removeSensitiveData(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(removeSensitiveData);
    }
    
    if (obj && typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        )) {
          cleaned[key] = '[REDACTED]';
        } else {
          cleaned[key] = removeSensitiveData(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  return removeSensitiveData(sanitized);
}

// =============================================================================
// COMBINED MIDDLEWARE
// =============================================================================

export function createRequestLogger() {
  return [
    requestLogger,
    auditLogger,
    securityLogger,
    rateLimitLogger,
    slowRequestLogger(),
  ];
}
