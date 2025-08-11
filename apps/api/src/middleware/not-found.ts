// =============================================================================
// NOT FOUND MIDDLEWARE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { loggers } from '../utils/logger';

export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the 404 for monitoring
  loggers.api.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
  });

  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown',
      path: req.path,
      method: req.method,
    },
  });
}
