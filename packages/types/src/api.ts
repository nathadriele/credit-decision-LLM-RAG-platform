// =============================================================================
// API TYPES
// =============================================================================

// =============================================================================
// HTTP TYPES
// =============================================================================

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export enum HttpStatusCode {
  // Success
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,

  // Redirection
  MOVED_PERMANENTLY = 301,
  FOUND = 302,
  NOT_MODIFIED = 304,

  // Client Error
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,

  // Server Error
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

export interface IApiRequest<T = unknown> {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: T;
  timeout?: number;
  retries?: number;
}

export interface IApiResponse<T = unknown> {
  status: HttpStatusCode;
  statusText: string;
  headers: Record<string, string>;
  data: T;
  meta?: IResponseMeta;
}

export interface IResponseMeta {
  timestamp: string;
  requestId: string;
  version: string;
  processingTime: number;
  rateLimit?: IRateLimitInfo;
}

export interface IRateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface IApiError {
  code: string;
  message: string;
  details?: unknown;
  field?: string;
  timestamp: string;
  requestId: string;
  path: string;
  method: string;
}

export interface IValidationError extends IApiError {
  field: string;
  value: unknown;
  constraint: string;
}

export interface IApiErrorResponse {
  success: false;
  error: IApiError;
  errors?: IValidationError[];
  meta: IResponseMeta;
}

// =============================================================================
// PAGINATION TYPES
// =============================================================================

export interface IPaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage?: number;
  prevPage?: number;
}

export interface IPaginatedApiResponse<T> {
  success: true;
  data: T[];
  pagination: IPaginationMeta;
  meta: IResponseMeta;
}

// =============================================================================
// FILTER TYPES
// =============================================================================

export interface IFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
  type?: FilterType;
}

export enum FilterOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  IN = 'in',
  NOT_IN = 'nin',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
  BETWEEN = 'between',
  REGEX = 'regex',
}

export enum FilterType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  ARRAY = 'array',
  OBJECT = 'object',
}

// =============================================================================
// SORTING TYPES
// =============================================================================

export interface ISort {
  field: string;
  order: SortOrder;
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

// =============================================================================
// SEARCH TYPES
// =============================================================================

export interface ISearchQuery {
  query: string;
  fields?: string[];
  fuzzy?: boolean;
  boost?: Record<string, number>;
  filters?: IFilter[];
  facets?: string[];
  highlight?: IHighlightConfig;
}

export interface IHighlightConfig {
  fields: string[];
  preTag: string;
  postTag: string;
  maxLength: number;
}

export interface ISearchResult<T> {
  item: T;
  score: number;
  highlights?: Record<string, string[]>;
  explanation?: string;
}

export interface ISearchResponse<T> {
  results: ISearchResult<T>[];
  total: number;
  facets?: Record<string, IFacet[]>;
  suggestions?: string[];
  searchTime: number;
}

export interface IFacet {
  value: string;
  count: number;
}

// =============================================================================
// WEBHOOK TYPES
// =============================================================================

export interface IWebhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  headers?: Record<string, string>;
  retryPolicy: IRetryPolicy;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
}

export interface IWebhookEvent {
  id: string;
  webhookId: string;
  event: string;
  payload: unknown;
  timestamp: Date;
  attempts: IWebhookAttempt[];
  status: WebhookStatus;
}

export interface IWebhookAttempt {
  timestamp: Date;
  statusCode: number;
  responseBody?: string;
  error?: string;
  duration: number;
}

export enum WebhookStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  EXHAUSTED = 'EXHAUSTED',
}

// =============================================================================
// BATCH OPERATION TYPES
// =============================================================================

export interface IBatchRequest<T> {
  operations: IBatchOperation<T>[];
  options?: IBatchOptions;
}

export interface IBatchOperation<T> {
  id: string;
  method: HttpMethod;
  path: string;
  body?: T;
  headers?: Record<string, string>;
}

export interface IBatchOptions {
  continueOnError: boolean;
  maxConcurrency: number;
  timeout: number;
}

export interface IBatchResponse<T> {
  results: IBatchResult<T>[];
  summary: IBatchSummary;
}

export interface IBatchResult<T> {
  id: string;
  status: HttpStatusCode;
  data?: T;
  error?: IApiError;
}

export interface IBatchSummary {
  total: number;
  successful: number;
  failed: number;
  duration: number;
}

// =============================================================================
// FILE UPLOAD TYPES
// =============================================================================

export interface IFileUploadRequest {
  file: File | Buffer;
  filename: string;
  mimeType: string;
  metadata?: Record<string, unknown>;
}

export interface IFileUploadResponse {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
  metadata?: Record<string, unknown>;
  uploadedAt: Date;
}

export interface IFileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number;
  timeRemaining: number;
}

// =============================================================================
// CACHE TYPES
// =============================================================================

export interface ICacheConfig {
  ttl: number;
  maxSize: number;
  strategy: CacheStrategy;
  tags?: string[];
}

export enum CacheStrategy {
  LRU = 'LRU',
  LFU = 'LFU',
  FIFO = 'FIFO',
  TTL = 'TTL',
}

export interface ICacheEntry<T> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  accessedAt: Date;
  tags: string[];
}

// =============================================================================
// MIDDLEWARE TYPES
// =============================================================================

export interface IMiddleware {
  name: string;
  order: number;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface IRequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

// =============================================================================
// HEALTH CHECK TYPES
// =============================================================================

export interface IHealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  version: string;
  uptime: number;
  checks: Record<string, IHealthCheck>;
}

export interface IHealthCheck {
  status: HealthStatus;
  message?: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded',
}
