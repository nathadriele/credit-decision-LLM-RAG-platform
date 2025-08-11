// =============================================================================
// ERROR HANDLER MIDDLEWARE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ValidationError } from 'joi';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { logApiError, loggers } from '../utils/logger';
import { config } from '../config';

// =============================================================================
// CUSTOM ERROR CLASSES
// =============================================================================

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    code?: string,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationAppError extends AppError {
  constructor(message: string, details?: any) {
    super(message, StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', details);
    this.name = 'ValidationAppError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, StatusCodes.UNAUTHORIZED, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, StatusCodes.FORBIDDEN, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, StatusCodes.NOT_FOUND, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, StatusCodes.CONFLICT, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, StatusCodes.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(
      message || `External service ${service} is unavailable`,
      StatusCodes.SERVICE_UNAVAILABLE,
      'EXTERNAL_SERVICE_ERROR'
    );
    this.name = 'ExternalServiceError';
    this.details = { service };
  }
}

// =============================================================================
// ERROR RESPONSE FORMATTER
// =============================================================================

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
  meta: {
    timestamp: string;
    requestId: string;
    path: string;
    method: string;
  };
}

function formatErrorResponse(
  error: Error,
  req: Request,
  includeStack: boolean = false
): ErrorResponse {
  const isAppError = error instanceof AppError;
  
  return {
    success: false,
    error: {
      code: isAppError ? error.code || 'INTERNAL_SERVER_ERROR' : 'INTERNAL_SERVER_ERROR',
      message: error.message,
      details: isAppError ? error.details : undefined,
      stack: includeStack ? error.stack : undefined,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown',
      path: req.path,
      method: req.method,
    },
  };
}

// =============================================================================
// ERROR HANDLER MIDDLEWARE
// =============================================================================

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let appError: AppError;

  // Handle different types of errors
  if (error instanceof AppError) {
    appError = error;
    statusCode = error.statusCode;
  } else if (error instanceof ValidationError) {
    appError = new ValidationAppError(
      'Validation failed',
      error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }))
    );
    statusCode = StatusCodes.BAD_REQUEST;
  } else if (error instanceof JsonWebTokenError) {
    if (error instanceof TokenExpiredError) {
      appError = new AuthenticationError('Token has expired');
    } else {
      appError = new AuthenticationError('Invalid token');
    }
    statusCode = StatusCodes.UNAUTHORIZED;
  } else if (error.name === 'CastError') {
    appError = new ValidationAppError('Invalid ID format');
    statusCode = StatusCodes.BAD_REQUEST;
  } else if (error.name === 'MongoError' && (error as any).code === 11000) {
    appError = new ConflictError('Duplicate field value');
    statusCode = StatusCodes.CONFLICT;
  } else if (error.name === 'MulterError') {
    appError = new ValidationAppError(`File upload error: ${error.message}`);
    statusCode = StatusCodes.BAD_REQUEST;
  } else {
    // Unknown error - create a generic AppError
    appError = new AppError(
      config.app.environment === 'production' 
        ? 'Internal server error' 
        : error.message,
      StatusCodes.INTERNAL_SERVER_ERROR,
      'INTERNAL_SERVER_ERROR'
    );
  }

  // Log the error
  logApiError(appError, req, statusCode, {
    originalError: error.name !== appError.name ? {
      name: error.name,
      message: error.message,
    } : undefined,
  });

  // Send error response
  const includeStack = config.app.environment === 'development';
  const errorResponse = formatErrorResponse(appError, req, includeStack);

  res.status(statusCode).json(errorResponse);
}

// =============================================================================
// ASYNC ERROR WRAPPER
// =============================================================================

export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// =============================================================================
// ERROR UTILITIES
// =============================================================================

export function createError(
  message: string,
  statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
  code?: string,
  details?: any
): AppError {
  return new AppError(message, statusCode, code, details);
}

export function throwIfNotFound<T>(
  item: T | null | undefined,
  resource: string = 'Resource'
): T {
  if (!item) {
    throw new NotFoundError(resource);
  }
  return item;
}

export function throwIfExists<T>(
  item: T | null | undefined,
  message: string = 'Resource already exists'
): void {
  if (item) {
    throw new ConflictError(message);
  }
}

// =============================================================================
// VALIDATION ERROR HELPERS
// =============================================================================

export function createValidationError(
  field: string,
  message: string,
  value?: any
): ValidationAppError {
  return new ValidationAppError('Validation failed', [{
    field,
    message,
    value,
  }]);
}

export function validateRequired<T>(
  value: T | null | undefined,
  fieldName: string
): T {
  if (value === null || value === undefined || value === '') {
    throw createValidationError(fieldName, `${fieldName} is required`);
  }
  return value;
}

// =============================================================================
// HTTP STATUS HELPERS
// =============================================================================

export function isClientError(statusCode: number): boolean {
  return statusCode >= 400 && statusCode < 500;
}

export function isServerError(statusCode: number): boolean {
  return statusCode >= 500;
}

export function isOperationalError(error: Error): boolean {
  return error instanceof AppError && error.isOperational;
}

// =============================================================================
// ERROR MONITORING
// =============================================================================

export function reportError(error: Error, context?: any): void {
  // In production, you might want to send errors to external monitoring services
  // like Sentry, Bugsnag, or custom monitoring solutions
  
  if (config.app.environment === 'production') {
    // Example: Send to external monitoring service
    // Sentry.captureException(error, { extra: context });
    
    loggers.monitoring.error('Error reported to monitoring service', error, context);
  }
}

// =============================================================================
// GRACEFUL ERROR HANDLING
// =============================================================================

export function handleUncaughtException(error: Error): void {
  loggers.app.error('Uncaught Exception', error);
  reportError(error, { type: 'uncaught_exception' });
  
  // Graceful shutdown
  process.exit(1);
}

export function handleUnhandledRejection(reason: any, promise: Promise<any>): void {
  loggers.app.error('Unhandled Rejection', new Error(reason), { promise });
  reportError(new Error(reason), { type: 'unhandled_rejection', promise });
  
  // Graceful shutdown
  process.exit(1);
}
