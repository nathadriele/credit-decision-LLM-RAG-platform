// =============================================================================
// API CONFIGURATION - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import dotenv from 'dotenv';
import { IAppConfig } from '@credit-decision/types';

// Load environment variables
dotenv.config();

// =============================================================================
// CONFIGURATION VALIDATION
// =============================================================================

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

function getEnvNumber(name: string, defaultValue?: number): number {
  const value = process.env[name];
  if (value) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${name} must be a number`);
    }
    return parsed;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`Environment variable ${name} is required`);
}

function getEnvBoolean(name: string, defaultValue?: boolean): boolean {
  const value = process.env[name];
  if (value) {
    return value.toLowerCase() === 'true';
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`Environment variable ${name} is required`);
}

function getEnvArray(name: string, defaultValue?: string[]): string[] {
  const value = process.env[name];
  if (value) {
    return value.split(',').map(item => item.trim());
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`Environment variable ${name} is required`);
}

// =============================================================================
// CONFIGURATION OBJECT
// =============================================================================

export const config: IAppConfig = {
  app: {
    name: getEnvVar('APP_NAME', 'Credit Decision LLM RAG Platform'),
    version: getEnvVar('APP_VERSION', '1.0.0'),
    environment: getEnvVar('NODE_ENV', 'development') as 'development' | 'staging' | 'production',
    port: getEnvNumber('PORT', 3001),
    logLevel: getEnvVar('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',
  },

  database: {
    url: getEnvVar('DATABASE_URL'),
    poolSize: getEnvNumber('DATABASE_POOL_SIZE', 10),
    ssl: getEnvBoolean('DATABASE_SSL', false),
  },

  redis: {
    url: getEnvVar('REDIS_URL'),
    password: process.env.REDIS_PASSWORD,
    db: getEnvNumber('REDIS_DB', 0),
  },

  llm: {
    provider: getEnvVar('LLM_PROVIDER', 'openai') as 'openai' | 'bedrock' | 'azure',
    model: getEnvVar('OPENAI_MODEL', 'gpt-4-turbo-preview'),
    apiKey: getEnvVar('OPENAI_API_KEY'),
    maxTokens: getEnvNumber('OPENAI_MAX_TOKENS', 4096),
    temperature: parseFloat(getEnvVar('OPENAI_TEMPERATURE', '0.1')),
  },

  vectorDb: {
    type: getEnvVar('VECTOR_DB_TYPE', 'chromadb') as 'faiss' | 'pinecone' | 'chromadb',
    config: {
      host: getEnvVar('CHROMADB_HOST', 'localhost'),
      port: getEnvNumber('CHROMADB_PORT', 8000),
      authToken: process.env.CHROMADB_AUTH_TOKEN,
      collectionName: getEnvVar('CHROMADB_COLLECTION_NAME', 'credit_documents'),
    },
  },

  aws: {
    region: getEnvVar('AWS_REGION', 'us-east-1'),
    accessKeyId: getEnvVar('AWS_ACCESS_KEY_ID'),
    secretAccessKey: getEnvVar('AWS_SECRET_ACCESS_KEY'),
    s3Bucket: getEnvVar('AWS_S3_BUCKET'),
  },

  monitoring: {
    dynatrace: process.env.DYNATRACE_URL ? {
      url: getEnvVar('DYNATRACE_URL'),
      apiToken: getEnvVar('DYNATRACE_API_TOKEN'),
    } : undefined,
    grafana: process.env.GRAFANA_URL ? {
      url: getEnvVar('GRAFANA_URL'),
      apiKey: getEnvVar('GRAFANA_API_KEY'),
    } : undefined,
  },

  security: {
    jwtSecret: getEnvVar('JWT_SECRET'),
    jwtExpiresIn: getEnvVar('JWT_EXPIRES_IN', '24h'),
    bcryptRounds: getEnvNumber('BCRYPT_ROUNDS', 12),
    corsOrigins: getEnvArray('CORS_ORIGIN', ['http://localhost:3000']),
    rateLimiting: {
      windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
      maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
    },
  },
};

// =============================================================================
// ADDITIONAL CONFIGURATION
// =============================================================================

export const embeddingConfig = {
  model: getEnvVar('EMBEDDING_MODEL', 'text-embedding-ada-002'),
  dimension: getEnvNumber('EMBEDDING_DIMENSION', 1536),
  chunkSize: getEnvNumber('CHUNK_SIZE', 1000),
  chunkOverlap: getEnvNumber('CHUNK_OVERLAP', 200),
};

export const ragConfig = {
  topK: getEnvNumber('RAG_TOP_K', 5),
  threshold: parseFloat(getEnvVar('RAG_THRESHOLD', '0.7')),
  maxContextLength: getEnvNumber('RAG_MAX_CONTEXT_LENGTH', 8000),
  enableReranking: getEnvBoolean('RAG_ENABLE_RERANKING', false),
};

export const featureFlags = {
  enableAdvancedRag: getEnvBoolean('ENABLE_ADVANCED_RAG', true),
  enableMultiModelInference: getEnvBoolean('ENABLE_MULTI_MODEL_INFERENCE', false),
  enableRealTimeMonitoring: getEnvBoolean('ENABLE_REAL_TIME_MONITORING', true),
  enableAuditLogging: getEnvBoolean('ENABLE_AUDIT_LOGGING', true),
  enableABTesting: getEnvBoolean('ENABLE_A_B_TESTING', false),
};

// =============================================================================
// CONFIGURATION VALIDATION
// =============================================================================

export function validateConfig(): void {
  const requiredEnvVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'OPENAI_API_KEY',
    'JWT_SECRET',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate JWT secret length
  if (config.security.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  // Validate environment
  const validEnvironments = ['development', 'staging', 'production'];
  if (!validEnvironments.includes(config.app.environment)) {
    throw new Error(`NODE_ENV must be one of: ${validEnvironments.join(', ')}`);
  }

  // Validate LLM provider
  const validLLMProviders = ['openai', 'bedrock', 'azure'];
  if (!validLLMProviders.includes(config.llm.provider)) {
    throw new Error(`LLM_PROVIDER must be one of: ${validLLMProviders.join(', ')}`);
  }

  // Validate vector DB type
  const validVectorDbTypes = ['faiss', 'pinecone', 'chromadb'];
  if (!validVectorDbTypes.includes(config.vectorDb.type)) {
    throw new Error(`VECTOR_DB_TYPE must be one of: ${validVectorDbTypes.join(', ')}`);
  }
}

// =============================================================================
// ENVIRONMENT-SPECIFIC CONFIGURATIONS
// =============================================================================

export const isDevelopment = config.app.environment === 'development';
export const isProduction = config.app.environment === 'production';
export const isTest = config.app.environment === 'test';

// Development-specific settings
if (isDevelopment) {
  // Enable more verbose logging in development
  if (!process.env.LOG_LEVEL) {
    config.app.logLevel = 'debug';
  }
}

// Production-specific settings
if (isProduction) {
  // Ensure secure settings in production
  if (config.security.corsOrigins.includes('*')) {
    throw new Error('CORS origins cannot include wildcard (*) in production');
  }
  
  if (config.security.jwtSecret === 'your-super-secret-jwt-key-here') {
    throw new Error('Default JWT secret cannot be used in production');
  }
}

// Validate configuration on import
validateConfig();
