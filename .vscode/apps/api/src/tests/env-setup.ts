// =============================================================================
// TEST ENVIRONMENT SETUP - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Database configuration for testing
process.env.TEST_DATABASE_URL = 
  process.env.TEST_DATABASE_URL || 
  'postgresql://postgres:postgres@localhost:5432/credit_decision_test_db';

// Redis configuration for testing
process.env.TEST_REDIS_URL = 
  process.env.TEST_REDIS_URL || 
  'redis://localhost:6379/1';

// ChromaDB configuration for testing
process.env.TEST_CHROMADB_URL = 
  process.env.TEST_CHROMADB_URL || 
  'http://localhost:8000';

// JWT configuration for testing
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';

// Encryption configuration for testing
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';

// OpenAI configuration for testing (use mock by default)
process.env.OPENAI_API_KEY = 
  process.env.OPENAI_API_KEY || 
  'sk-test-mock-key-for-testing-purposes';

// Disable external services in tests unless explicitly enabled
process.env.ENABLE_EXTERNAL_APIS = 'false';
process.env.ENABLE_REAL_AI_CALLS = 'false';
process.env.ENABLE_EMAIL_NOTIFICATIONS = 'false';

// Rate limiting (disabled for tests)
process.env.ENABLE_RATE_LIMITING = 'false';

// Cache configuration
process.env.ENABLE_CACHING = 'true';
process.env.CACHE_TTL = '300'; // 5 minutes for tests

// File upload configuration
process.env.MAX_FILE_SIZE = '10485760'; // 10MB
process.env.UPLOAD_DIR = '/tmp/test-uploads';

// Security configuration
process.env.BCRYPT_ROUNDS = '4'; // Faster for tests
process.env.SESSION_TIMEOUT = '3600000'; // 1 hour

// Feature flags for testing
process.env.ENABLE_AI_DECISIONS = 'true';
process.env.ENABLE_AUTO_DECISIONS = 'true';
process.env.ENABLE_CONVERSATION_MEMORY = 'true';
process.env.ENABLE_AUDIT_LOGGING = 'true';

// Performance settings for tests
process.env.DATABASE_POOL_SIZE = '5';
process.env.REDIS_POOL_SIZE = '5';
process.env.MAX_CONCURRENT_REQUESTS = '50';

// Timeout settings
process.env.REQUEST_TIMEOUT = '30000';
process.env.AI_REQUEST_TIMEOUT = '10000';
process.env.DATABASE_TIMEOUT = '5000';

console.log('Test environment configured');
