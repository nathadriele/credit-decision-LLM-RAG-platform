// =============================================================================
// REDIS CONFIGURATION - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import Joi from 'joi';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database: number;
  keyPrefix: string;
  maxRetries: number;
  retryDelayOnFailover: number;
  enableOfflineQueue: boolean;
  connectTimeout: number;
  commandTimeout: number;
}

const redisSchema = Joi.object({
  host: Joi.string().required(),
  port: Joi.number().port().default(6379),
  password: Joi.string().optional(),
  database: Joi.number().min(0).max(15).default(0),
  keyPrefix: Joi.string().default('credit_decision:'),
  maxRetries: Joi.number().min(0).default(3),
  retryDelayOnFailover: Joi.number().min(100).default(100),
  enableOfflineQueue: Joi.boolean().default(false),
  connectTimeout: Joi.number().min(1000).default(10000),
  commandTimeout: Joi.number().min(1000).default(5000),
});

export const getRedisConfig = (): RedisConfig => {
  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    database: parseInt(process.env.REDIS_DATABASE || '0'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'credit_decision:',
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
    enableOfflineQueue: process.env.REDIS_ENABLE_OFFLINE_QUEUE === 'true',
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
    commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000'),
  };

  const { error, value } = redisSchema.validate(config);
  if (error) {
    throw new Error(`Redis configuration error: ${error.message}`);
  }

  return value;
};
