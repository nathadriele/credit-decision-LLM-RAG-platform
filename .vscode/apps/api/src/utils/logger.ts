// =============================================================================
// LOGGER UTILITY - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import winston from 'winston';
import { config } from '../config';

// =============================================================================
// CUSTOM LOG FORMATS
// =============================================================================

const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const logObject = {
      timestamp,
      level,
      message,
      environment: config.app.environment,
      service: 'credit-decision-api',
      version: config.app.version,
      ...meta,
    };

    if (stack) {
      logObject.stack = stack;
    }

    return JSON.stringify(logObject);
  })
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss',
  }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// =============================================================================
// LOGGER CONFIGURATION
// =============================================================================

const transports: winston.transport[] = [];

// Console transport for development
if (config.app.environment === 'development') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: config.app.logLevel,
    })
  );
} else {
  // JSON format for production (better for log aggregation)
  transports.push(
    new winston.transports.Console({
      format: customFormat,
      level: config.app.logLevel,
    })
  );
}

// File transports for production
if (config.app.environment === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// =============================================================================
// LOGGER INSTANCE
// =============================================================================

export const logger = winston.createLogger({
  level: config.app.logLevel,
  format: customFormat,
  defaultMeta: {
    service: 'credit-decision-api',
    environment: config.app.environment,
    version: config.app.version,
  },
  transports,
  exitOnError: false,
});

// =============================================================================
// LOGGER UTILITIES
// =============================================================================

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: string, message: string, meta?: any): void {
    logger.log(level, message, {
      context: this.context,
      ...meta,
    });
  }

  debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error | any, meta?: any): void {
    const errorMeta = error instanceof Error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    } : { error };

    this.log('error', message, {
      ...errorMeta,
      ...meta,
    });
  }

  // Specific logging methods for different scenarios
  apiRequest(method: string, url: string, statusCode: number, responseTime: number, meta?: any): void {
    this.info('API Request', {
      type: 'api_request',
      method,
      url,
      statusCode,
      responseTime,
      ...meta,
    });
  }

  databaseQuery(query: string, duration: number, meta?: any): void {
    this.debug('Database Query', {
      type: 'database_query',
      query: query.substring(0, 200), // Truncate long queries
      duration,
      ...meta,
    });
  }

  llmRequest(model: string, tokens: number, cost: number, duration: number, meta?: any): void {
    this.info('LLM Request', {
      type: 'llm_request',
      model,
      tokens,
      cost,
      duration,
      ...meta,
    });
  }

  ragQuery(query: string, resultsCount: number, duration: number, meta?: any): void {
    this.info('RAG Query', {
      type: 'rag_query',
      query: query.substring(0, 100), // Truncate long queries
      resultsCount,
      duration,
      ...meta,
    });
  }

  securityEvent(event: string, userId?: string, meta?: any): void {
    this.warn('Security Event', {
      type: 'security_event',
      event,
      userId,
      ...meta,
    });
  }

  businessEvent(event: string, entityType: string, entityId: string, meta?: any): void {
    this.info('Business Event', {
      type: 'business_event',
      event,
      entityType,
      entityId,
      ...meta,
    });
  }

  performanceMetric(metric: string, value: number, unit: string, meta?: any): void {
    this.info('Performance Metric', {
      type: 'performance_metric',
      metric,
      value,
      unit,
      ...meta,
    });
  }
}

// =============================================================================
// LOGGER FACTORY
// =============================================================================

export function createLogger(context: string): Logger {
  return new Logger(context);
}

// =============================================================================
// STRUCTURED LOGGING HELPERS
// =============================================================================

export const loggers = {
  app: createLogger('Application'),
  auth: createLogger('Authentication'),
  database: createLogger('Database'),
  redis: createLogger('Redis'),
  llm: createLogger('LLM'),
  rag: createLogger('RAG'),
  api: createLogger('API'),
  security: createLogger('Security'),
  business: createLogger('Business'),
  monitoring: createLogger('Monitoring'),
};

// =============================================================================
// ERROR LOGGING UTILITIES
// =============================================================================

export function logError(error: Error, context?: string, meta?: any): void {
  const contextLogger = context ? createLogger(context) : logger;
  
  if (contextLogger instanceof Logger) {
    contextLogger.error(error.message, error, meta);
  } else {
    logger.error(error.message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      ...meta,
    });
  }
}

export function logApiError(
  error: Error,
  req: any,
  statusCode: number,
  meta?: any
): void {
  loggers.api.error('API Error', error, {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    ...meta,
  });
}

// =============================================================================
// PERFORMANCE LOGGING
// =============================================================================

export function createPerformanceLogger(operation: string) {
  const startTime = Date.now();
  
  return {
    end: (meta?: any) => {
      const duration = Date.now() - startTime;
      loggers.monitoring.performanceMetric(operation, duration, 'ms', meta);
      return duration;
    },
  };
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

export function logAuditEvent(
  action: string,
  entityType: string,
  entityId: string,
  userId: string,
  changes?: any,
  meta?: any
): void {
  loggers.business.info('Audit Event', {
    type: 'audit_event',
    action,
    entityType,
    entityId,
    userId,
    changes,
    timestamp: new Date().toISOString(),
    ...meta,
  });
}

// =============================================================================
// HEALTH CHECK LOGGING
// =============================================================================

export function logHealthCheck(
  service: string,
  status: 'healthy' | 'unhealthy' | 'degraded',
  responseTime?: number,
  error?: string
): void {
  const level = status === 'healthy' ? 'info' : 'warn';
  
  loggers.monitoring.log(level, `Health Check: ${service}`, {
    type: 'health_check',
    service,
    status,
    responseTime,
    error,
  });
}

// Handle uncaught exceptions and unhandled rejections
if (config.app.environment !== 'test') {
  logger.exceptions.handle(
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  );

  logger.rejections.handle(
    new winston.transports.File({ filename: 'logs/rejections.log' })
  );
}
