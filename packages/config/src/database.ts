// =============================================================================
// DATABASE CONFIGURATION - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import Joi from 'joi';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
}

const databaseSchema = Joi.object({
  host: Joi.string().required(),
  port: Joi.number().port().default(5432),
  database: Joi.string().required(),
  username: Joi.string().required(),
  password: Joi.string().required(),
  ssl: Joi.boolean().default(false),
  maxConnections: Joi.number().min(1).max(100).default(20),
  connectionTimeout: Joi.number().min(1000).default(30000),
  idleTimeout: Joi.number().min(1000).default(10000),
});

export const getDatabaseConfig = (): DatabaseConfig => {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'credit_decision_db',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '10000'),
  };

  const { error, value } = databaseSchema.validate(config);
  if (error) {
    throw new Error(`Database configuration error: ${error.message}`);
  }

  return value;
};
