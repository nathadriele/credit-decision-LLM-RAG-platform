// =============================================================================
// CREDIT DECISION LLM RAG PLATFORM - SHARED TYPES
// =============================================================================

export * from './credit';
export * from './llm';
export * from './rag';
export * from './auth';
export * from './api';
export * from './monitoring';
export * from './common';

// =============================================================================
// COMMON TYPES
// =============================================================================

export interface IBaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface IPaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

export interface IHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  services: {
    database: IServiceHealth;
    redis: IServiceHealth;
    vectorDb: IServiceHealth;
    llm: IServiceHealth;
  };
}

export interface IServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  lastCheck: string;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export enum ErrorCode {
  // General
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Authentication
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',

  // Credit Decision
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  CREDIT_POLICY_VIOLATION = 'CREDIT_POLICY_VIOLATION',
  RISK_THRESHOLD_EXCEEDED = 'RISK_THRESHOLD_EXCEEDED',

  // LLM/AI
  LLM_SERVICE_UNAVAILABLE = 'LLM_SERVICE_UNAVAILABLE',
  PROMPT_GENERATION_FAILED = 'PROMPT_GENERATION_FAILED',
  EMBEDDING_GENERATION_FAILED = 'EMBEDDING_GENERATION_FAILED',
  RAG_RETRIEVAL_FAILED = 'RAG_RETRIEVAL_FAILED',

  // Vector Database
  VECTOR_DB_CONNECTION_FAILED = 'VECTOR_DB_CONNECTION_FAILED',
  VECTOR_SEARCH_FAILED = 'VECTOR_SEARCH_FAILED',
  DOCUMENT_INDEXING_FAILED = 'DOCUMENT_INDEXING_FAILED',
}

export interface ICustomError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: unknown;
  timestamp: string;
  requestId?: string;
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

export interface IAppConfig {
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    port: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  database: {
    url: string;
    poolSize: number;
    ssl: boolean;
  };
  redis: {
    url: string;
    password?: string;
    db: number;
  };
  llm: {
    provider: 'openai' | 'bedrock' | 'azure';
    model: string;
    apiKey: string;
    maxTokens: number;
    temperature: number;
  };
  vectorDb: {
    type: 'faiss' | 'pinecone' | 'chromadb';
    config: Record<string, unknown>;
  };
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    s3Bucket: string;
  };
  monitoring: {
    dynatrace?: {
      url: string;
      apiToken: string;
    };
    grafana?: {
      url: string;
      apiKey: string;
    };
  };
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    bcryptRounds: number;
    corsOrigins: string[];
    rateLimiting: {
      windowMs: number;
      maxRequests: number;
    };
  };
}
