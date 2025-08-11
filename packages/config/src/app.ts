// =============================================================================
// APPLICATION CONFIGURATION - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import Joi from 'joi';

export interface AppConfig {
  port: number;
  host: string;
  nodeEnv: string;
  logLevel: string;
  corsOrigins: string[];
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  rateLimitRequests: number;
  rateLimitWindow: number;
  maxFileSize: number;
  uploadDir: string;
}

const appSchema = Joi.object({
  port: Joi.number().port().default(3001),
  host: Joi.string().default('0.0.0.0'),
  nodeEnv: Joi.string().valid('development', 'production', 'test').default('development'),
  logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  corsOrigins: Joi.array().items(Joi.string()).default(['http://localhost:3000']),
  jwtSecret: Joi.string().min(32).required(),
  jwtExpiresIn: Joi.string().default('24h'),
  bcryptRounds: Joi.number().min(4).max(15).default(10),
  rateLimitRequests: Joi.number().min(1).default(100),
  rateLimitWindow: Joi.number().min(60000).default(900000), // 15 minutes
  maxFileSize: Joi.number().min(1024).default(10485760), // 10MB
  uploadDir: Joi.string().default('./uploads'),
});

export const getAppConfig = (): AppConfig => {
  const config = {
    port: parseInt(process.env.PORT || '3001'),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
    rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
    uploadDir: process.env.UPLOAD_DIR || './uploads',
  };

  const { error, value } = appSchema.validate(config);
  if (error) {
    throw new Error(`Application configuration error: ${error.message}`);
  }

  return value;
};
