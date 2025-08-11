// =============================================================================
// AI UTILITIES - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

// =============================================================================
// TEXT PROCESSING UTILITIES
// =============================================================================

export class TextProcessor {
  /**
   * Clean and normalize text for processing
   */
  static cleanText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .replace(/[^\w\s.,!?;:()\-]/g, '');
  }

  /**
   * Extract key phrases from text
   */
  static extractKeyPhrases(text: string, maxPhrases: number = 10): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const phrases: Map<string, number> = new Map();

    // Extract 2-3 word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const phrase2 = `${words[i]} ${words[i + 1]}`;
      phrases.set(phrase2, (phrases.get(phrase2) || 0) + 1);

      if (i < words.length - 2) {
        const phrase3 = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        phrases.set(phrase3, (phrases.get(phrase3) || 0) + 1);
      }
    }

    // Sort by frequency and return top phrases
    return Array.from(phrases.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxPhrases)
      .map(([phrase]) => phrase);
  }

  /**
   * Calculate text similarity using Jaccard index
   */
  static calculateJaccardSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Truncate text to specified token limit
   */
  static truncateToTokens(text: string, maxTokens: number): string {
    const estimatedTokens = Math.ceil(text.length / 4);
    if (estimatedTokens <= maxTokens) {
      return text;
    }

    const ratio = maxTokens / estimatedTokens;
    const targetLength = Math.floor(text.length * ratio);
    
    // Try to cut at sentence boundary
    const truncated = text.substring(0, targetLength);
    const lastSentence = truncated.lastIndexOf('.');
    
    return lastSentence > targetLength * 0.8 
      ? truncated.substring(0, lastSentence + 1)
      : truncated + '...';
  }
}

// =============================================================================
// VECTOR UTILITIES
// =============================================================================

export class VectorUtils {
  /**
   * Calculate cosine similarity between two vectors
   */
  static cosineSimilarity(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      norm1 += vector1[i] * vector1[i];
      norm2 += vector2[i] * vector2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Calculate Euclidean distance between two vectors
   */
  static euclideanDistance(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let sum = 0;
    for (let i = 0; i < vector1.length; i++) {
      const diff = vector1[i] - vector2[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Normalize vector to unit length
   */
  static normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude === 0 ? vector : vector.map(val => val / magnitude);
  }

  /**
   * Calculate centroid of multiple vectors
   */
  static centroid(vectors: number[][]): number[] {
    if (vectors.length === 0) {
      throw new Error('Cannot calculate centroid of empty vector set');
    }

    const dimension = vectors[0].length;
    const centroid = new Array(dimension).fill(0);

    for (const vector of vectors) {
      if (vector.length !== dimension) {
        throw new Error('All vectors must have the same dimension');
      }
      for (let i = 0; i < dimension; i++) {
        centroid[i] += vector[i];
      }
    }

    return centroid.map(val => val / vectors.length);
  }
}

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  static startTimer(operationId: string): void {
    this.timers.set(operationId, Date.now());
  }

  /**
   * End timing and return duration
   */
  static endTimer(operationId: string): number {
    const startTime = this.timers.get(operationId);
    if (!startTime) {
      throw new Error(`Timer ${operationId} not found`);
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operationId);
    return duration;
  }

  /**
   * Measure execution time of a function
   */
  static async measureAsync<T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;

    if (operationName) {
      console.log(`${operationName} completed in ${duration}ms`);
    }

    return { result, duration };
  }

  /**
   * Measure execution time of a synchronous function
   */
  static measure<T>(
    operation: () => T,
    operationName?: string
  ): { result: T; duration: number } {
    const startTime = Date.now();
    const result = operation();
    const duration = Date.now() - startTime;

    if (operationName) {
      console.log(`${operationName} completed in ${duration}ms`);
    }

    return { result, duration };
  }
}

// =============================================================================
// CACHING UTILITIES
// =============================================================================

export class CacheManager {
  private cache: Map<string, { value: any; expiry: number }> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 300000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  /**
   * Set a value in cache with optional TTL
   */
  set(key: string, value: any, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// =============================================================================
// RETRY UTILITIES
// =============================================================================

export class RetryManager {
  /**
   * Retry an async operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      baseDelay?: number;
      maxDelay?: number;
      backoffFactor?: number;
      retryCondition?: (error: Error) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      retryCondition = () => true,
    } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxAttempts || !retryCondition(lastError)) {
          throw lastError;
        }

        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt - 1),
          maxDelay
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

export class ValidationUtils {
  /**
   * Validate embedding vector
   */
  static validateEmbedding(embedding: number[], expectedDimension?: number): boolean {
    if (!Array.isArray(embedding)) {
      return false;
    }

    if (embedding.length === 0) {
      return false;
    }

    if (expectedDimension && embedding.length !== expectedDimension) {
      return false;
    }

    return embedding.every(val => typeof val === 'number' && !isNaN(val));
  }

  /**
   * Validate text content
   */
  static validateText(text: string, minLength: number = 1, maxLength: number = 100000): boolean {
    return typeof text === 'string' && 
           text.trim().length >= minLength && 
           text.length <= maxLength;
  }

  /**
   * Validate search parameters
   */
  static validateSearchParams(params: {
    topK?: number;
    threshold?: number;
    query?: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (params.topK !== undefined) {
      if (!Number.isInteger(params.topK) || params.topK < 1 || params.topK > 100) {
        errors.push('topK must be an integer between 1 and 100');
      }
    }

    if (params.threshold !== undefined) {
      if (typeof params.threshold !== 'number' || params.threshold < 0 || params.threshold > 1) {
        errors.push('threshold must be a number between 0 and 1');
      }
    }

    if (params.query !== undefined) {
      if (!this.validateText(params.query, 1, 10000)) {
        errors.push('query must be a non-empty string with max length 10000');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

export class AIError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.details = details;
  }
}

export class AIErrorHandler {
  /**
   * Handle and categorize AI service errors
   */
  static handleError(error: any): AIError {
    if (error instanceof AIError) {
      return error;
    }

    // OpenAI API errors
    if (error.response?.status === 429) {
      return new AIError(
        'Rate limit exceeded',
        'RATE_LIMIT_EXCEEDED',
        { retryAfter: error.response.headers['retry-after'] }
      );
    }

    if (error.response?.status === 401) {
      return new AIError(
        'Invalid API key',
        'INVALID_API_KEY'
      );
    }

    if (error.response?.status === 400) {
      return new AIError(
        'Invalid request parameters',
        'INVALID_REQUEST',
        { details: error.response.data }
      );
    }

    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new AIError(
        'Service unavailable',
        'SERVICE_UNAVAILABLE',
        { originalError: error.code }
      );
    }

    // Timeout errors
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return new AIError(
        'Request timeout',
        'TIMEOUT',
        { timeout: error.timeout }
      );
    }

    // Generic error
    return new AIError(
      error.message || 'Unknown AI service error',
      'UNKNOWN_ERROR',
      { originalError: error }
    );
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  TextProcessor,
  VectorUtils,
  PerformanceMonitor,
  CacheManager,
  RetryManager,
  ValidationUtils,
  AIError,
  AIErrorHandler,
};
