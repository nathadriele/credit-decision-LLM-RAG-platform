// =============================================================================
// AUTHENTICATION TESTS - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import request from 'supertest';
import { Application } from '../index';
import { JWTService, SessionService } from '../middleware/auth';
import { testUtils } from '../test/setup';

describe('Authentication', () => {
  let app: Application;
  let server: any;

  beforeAll(async () => {
    app = new Application();
    server = app.app;
  });

  afterAll(async () => {
    if (app) {
      await app.stop();
    }
  });

  describe('JWT Service', () => {
    describe('token generation', () => {
      it('should generate a valid JWT token', () => {
        const payload = {
          userId: global.testUtils.randomUUID(),
          sessionId: global.testUtils.randomUUID(),
        };

        const token = JWTService.generateToken(payload);
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
      });

      it('should include required claims in token', () => {
        const payload = {
          userId: global.testUtils.randomUUID(),
          sessionId: global.testUtils.randomUUID(),
        };

        const token = JWTService.generateToken(payload);
        const decoded = JWTService.decodeToken(token);

        expect(decoded).toHaveProperty('userId', payload.userId);
        expect(decoded).toHaveProperty('sessionId', payload.sessionId);
        expect(decoded).toHaveProperty('iat');
        expect(decoded).toHaveProperty('exp');
        expect(decoded).toHaveProperty('iss', 'credit-decision-api');
        expect(decoded).toHaveProperty('aud', 'credit-decision-platform');
      });
    });

    describe('token verification', () => {
      it('should verify a valid token', () => {
        const payload = {
          userId: global.testUtils.randomUUID(),
          sessionId: global.testUtils.randomUUID(),
        };

        const token = JWTService.generateToken(payload);
        const verified = JWTService.verifyToken(token);

        expect(verified.userId).toBe(payload.userId);
        expect(verified.sessionId).toBe(payload.sessionId);
      });

      it('should reject an invalid token', () => {
        const invalidToken = 'invalid.token.here';

        expect(() => {
          JWTService.verifyToken(invalidToken);
        }).toThrow('Invalid token');
      });

      it('should reject an expired token', () => {
        // Create a token that expires immediately
        const jwt = require('jsonwebtoken');
        const expiredToken = jwt.sign(
          { userId: 'test', exp: Math.floor(Date.now() / 1000) - 1 },
          process.env.JWT_SECRET
        );

        expect(() => {
          JWTService.verifyToken(expiredToken);
        }).toThrow('Token has expired');
      });

      it('should reject token with wrong issuer', () => {
        const jwt = require('jsonwebtoken');
        const wrongIssuerToken = jwt.sign(
          { userId: 'test', iss: 'wrong-issuer' },
          process.env.JWT_SECRET
        );

        expect(() => {
          JWTService.verifyToken(wrongIssuerToken);
        }).toThrow('Invalid token');
      });
    });

    describe('refresh tokens', () => {
      it('should generate a refresh token', () => {
        const refreshToken = JWTService.generateRefreshToken();
        expect(typeof refreshToken).toBe('string');
        expect(refreshToken.split('.')).toHaveLength(3);
      });
    });
  });

  describe('Session Service', () => {
    const userId = global.testUtils.randomUUID();
    const sessionId = global.testUtils.randomUUID();

    describe('session creation', () => {
      it('should create a new session', async () => {
        await expect(
          SessionService.createSession(userId, sessionId, { ip: '127.0.0.1' })
        ).resolves.not.toThrow();
      });

      it('should store session data correctly', async () => {
        const metadata = { ip: '127.0.0.1', userAgent: 'test-agent' };
        
        await SessionService.createSession(userId, sessionId, metadata);
        const session = await SessionService.getSession(sessionId);

        expect(session).toHaveProperty('userId', userId);
        expect(session).toHaveProperty('sessionId', sessionId);
        expect(session).toHaveProperty('isActive', true);
        expect(session).toHaveProperty('ip', metadata.ip);
        expect(session).toHaveProperty('userAgent', metadata.userAgent);
      });
    });

    describe('session retrieval', () => {
      beforeEach(async () => {
        await SessionService.createSession(userId, sessionId);
      });

      it('should retrieve existing session', async () => {
        const session = await SessionService.getSession(sessionId);
        expect(session).not.toBeNull();
        expect(session.userId).toBe(userId);
      });

      it('should return null for non-existent session', async () => {
        const session = await SessionService.getSession('non-existent-session');
        expect(session).toBeNull();
      });
    });

    describe('session validation', () => {
      beforeEach(async () => {
        await SessionService.createSession(userId, sessionId);
      });

      it('should validate active session', async () => {
        const isValid = await SessionService.isSessionValid(sessionId);
        expect(isValid).toBe(true);
      });

      it('should invalidate non-existent session', async () => {
        const isValid = await SessionService.isSessionValid('non-existent');
        expect(isValid).toBe(false);
      });
    });

    describe('session invalidation', () => {
      beforeEach(async () => {
        await SessionService.createSession(userId, sessionId);
      });

      it('should invalidate single session', async () => {
        await SessionService.invalidateSession(sessionId);
        const isValid = await SessionService.isSessionValid(sessionId);
        expect(isValid).toBe(false);
      });

      it('should invalidate all user sessions', async () => {
        const sessionId2 = global.testUtils.randomUUID();
        await SessionService.createSession(userId, sessionId2);

        await SessionService.invalidateAllUserSessions(userId);

        const isValid1 = await SessionService.isSessionValid(sessionId);
        const isValid2 = await SessionService.isSessionValid(sessionId2);

        expect(isValid1).toBe(false);
        expect(isValid2).toBe(false);
      });
    });

    describe('session activity tracking', () => {
      beforeEach(async () => {
        await SessionService.createSession(userId, sessionId);
      });

      it('should update session activity', async () => {
        const originalSession = await SessionService.getSession(sessionId);
        
        // Wait a bit to ensure timestamp difference
        await global.testUtils.wait(100);
        
        await SessionService.updateSessionActivity(sessionId);
        const updatedSession = await SessionService.getSession(sessionId);

        expect(new Date(updatedSession.lastActivity).getTime())
          .toBeGreaterThan(new Date(originalSession.lastActivity).getTime());
      });
    });
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        const response = await request(server)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user).toHaveProperty('email', 'test@example.com');
      });

      it('should reject invalid credentials', async () => {
        const response = await request(server)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword',
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toHaveProperty('code', 'AUTHENTICATION_ERROR');
      });

      it('should reject non-existent user', async () => {
        const response = await request(server)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'password123',
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('success', false);
      });

      it('should validate request body', async () => {
        const response = await request(server)
          .post('/api/auth/login')
          .send({
            email: 'invalid-email',
            password: '',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should logout authenticated user', async () => {
        const token = global.testUtils.generateTestToken();

        const response = await request(server)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
      });

      it('should reject unauthenticated request', async () => {
        const response = await request(server)
          .post('/api/auth/logout');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/auth/me', () => {
      it('should return current user info', async () => {
        const token = global.testUtils.generateTestToken();

        const response = await request(server)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user).toHaveProperty('id');
        expect(response.body.data.user).toHaveProperty('email');
      });

      it('should reject unauthenticated request', async () => {
        const response = await request(server)
          .get('/api/auth/me');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('success', false);
      });

      it('should reject invalid token', async () => {
        const response = await request(server)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('success', false);
      });
    });
  });

  describe('Authentication Middleware', () => {
    describe('protected routes', () => {
      it('should allow access with valid token', async () => {
        const token = global.testUtils.generateTestToken();

        const response = await request(server)
          .get('/api/users')
          .set('Authorization', `Bearer ${token}`);

        // Should not be 401 (might be 200 or other status depending on implementation)
        expect(response.status).not.toBe(401);
      });

      it('should deny access without token', async () => {
        const response = await request(server)
          .get('/api/users');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toHaveProperty('code', 'AUTHENTICATION_ERROR');
      });

      it('should deny access with malformed token', async () => {
        const response = await request(server)
          .get('/api/users')
          .set('Authorization', 'Bearer malformed-token');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('success', false);
      });

      it('should deny access with expired token', async () => {
        const jwt = require('jsonwebtoken');
        const expiredToken = jwt.sign(
          { 
            userId: 'test',
            sessionId: 'test',
            exp: Math.floor(Date.now() / 1000) - 1 
          },
          process.env.JWT_SECRET
        );

        const response = await request(server)
          .get('/api/users')
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.status).toBe(401);
        expect(response.body.error).toHaveProperty('message', 'Token has expired');
      });
    });
  });
});
