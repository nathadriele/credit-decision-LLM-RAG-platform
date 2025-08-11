// =============================================================================
// COMMON TYPES
// =============================================================================

// =============================================================================
// BASE ENTITY TYPES
// =============================================================================

export interface IBaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ITimestamps {
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ISoftDelete {
  deletedAt?: Date;
  isDeleted: boolean;
}

// =============================================================================
// PAGINATION TYPES
// =============================================================================

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

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

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

export interface ISuccessResponse<T> extends IApiResponse<T> {
  success: true;
  data: T;
}

export interface IErrorResponse extends IApiResponse<never> {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// =============================================================================
// HEALTH CHECK TYPES
// =============================================================================

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
// UTILITY TYPES
// =============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Maybe<T> = T | undefined;

export type NonEmptyArray<T> = [T, ...T[]];

// =============================================================================
// ENUM TYPES
// =============================================================================

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// =============================================================================
// DATE/TIME TYPES
// =============================================================================

export interface IDateRange {
  startDate: Date;
  endDate: Date;
}

export interface ITimeRange {
  startTime: string;
  endTime: string;
}

export interface ITimezone {
  name: string;
  offset: number;
  abbreviation: string;
}

// =============================================================================
// FILE TYPES
// =============================================================================

export interface IFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  metadata?: Record<string, unknown>;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface IFileUpload {
  file: File | Buffer;
  filename: string;
  mimeType: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// GEOLOCATION TYPES
// =============================================================================

export interface ICoordinates {
  latitude: number;
  longitude: number;
}

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: ICoordinates;
}

// =============================================================================
// CONTACT TYPES
// =============================================================================

export interface IContactInfo {
  email?: string;
  phone?: string;
  address?: IAddress;
  website?: string;
  socialMedia?: Record<string, string>;
}

// =============================================================================
// CURRENCY TYPES
// =============================================================================

export interface ICurrency {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface IMonetaryAmount {
  amount: number;
  currency: string;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface IValidationRule {
  field: string;
  rules: string[];
  message?: string;
}

export interface IValidationError {
  field: string;
  value: unknown;
  message: string;
  code: string;
}

export interface IValidationResult {
  isValid: boolean;
  errors: IValidationError[];
}

// =============================================================================
// AUDIT TYPES
// =============================================================================

export interface IAuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  userId: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// FEATURE FLAG TYPES
// =============================================================================

export interface IFeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  conditions?: IFeatureFlagCondition[];
  rolloutPercentage?: number;
  metadata?: Record<string, unknown>;
}

export interface IFeatureFlagCondition {
  field: string;
  operator: string;
  value: unknown;
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export interface INotification {
  id: string;
  type: string;
  title: string;
  message: string;
  recipient: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// RATE LIMITING TYPES
// =============================================================================

export interface IRateLimit {
  limit: number;
  window: number;
  remaining: number;
  resetTime: Date;
}

// =============================================================================
// CACHE TYPES
// =============================================================================

export interface ICacheEntry<T> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
}
