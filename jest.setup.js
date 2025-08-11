// =============================================================================
// JEST GLOBAL SETUP - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

// Global test configuration
require('dotenv').config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/credit_decision_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.CHROMADB_HOST = 'localhost';
process.env.CHROMADB_PORT = '8000';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods in test environment
if (process.env.NODE_ENV === 'test') {
  // Suppress console.log in tests unless explicitly needed
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Global test utilities
global.testUtils = {
  // Wait for a specified amount of time
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate random test data
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
  
  // Generate random email
  randomEmail: () => {
    return `test-${global.testUtils.randomString(8)}@example.com`;
  },
  
  // Generate random UUID
  randomUUID: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
};

// Global mocks for external services
global.mockServices = {
  // Mock OpenAI API
  openai: {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          id: 'chatcmpl-test',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-4',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'This is a test response from OpenAI API mock.',
            },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        }),
      },
    },
    embeddings: {
      create: jest.fn().mockResolvedValue({
        object: 'list',
        data: [{
          object: 'embedding',
          embedding: new Array(1536).fill(0).map(() => Math.random()),
          index: 0,
        }],
        model: 'text-embedding-ada-002',
        usage: {
          prompt_tokens: 5,
          total_tokens: 5,
        },
      }),
    },
  },
  
  // Mock ChromaDB
  chromadb: {
    heartbeat: jest.fn().mockResolvedValue({}),
    createCollection: jest.fn().mockResolvedValue({}),
    getCollection: jest.fn().mockResolvedValue({
      add: jest.fn().mockResolvedValue({}),
      query: jest.fn().mockResolvedValue({
        ids: [['doc1', 'doc2']],
        documents: [['Document 1 content', 'Document 2 content']],
        metadatas: [[{}, {}]],
        distances: [[0.1, 0.2]],
      }),
      get: jest.fn().mockResolvedValue({
        ids: ['doc1'],
        documents: ['Document 1 content'],
        metadatas: [{}],
      }),
      count: jest.fn().mockResolvedValue(10),
    }),
    listCollections: jest.fn().mockResolvedValue([]),
  },
  
  // Mock Redis
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    sadd: jest.fn().mockResolvedValue(1),
    srem: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue([]),
  },
};

// Global test data factories
global.testData = {
  // User factory
  createUser: (overrides = {}) => ({
    id: global.testUtils.randomUUID(),
    email: global.testUtils.randomEmail(),
    username: global.testUtils.randomString(8),
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    roles: ['CREDIT_ANALYST'],
    permissions: ['APPLICATION_READ', 'APPLICATION_CREATE'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),
  
  // Credit application factory
  createCreditApplication: (overrides = {}) => ({
    id: global.testUtils.randomUUID(),
    applicantId: global.testUtils.randomUUID(),
    applicationNumber: `APP-${Date.now()}`,
    status: 'SUBMITTED',
    requestedAmount: 50000,
    currency: 'USD',
    purpose: 'BUSINESS',
    termMonths: 36,
    applicantData: {
      personal: {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1985-06-15',
        ssn: '123-45-6789',
        email: 'john.doe@example.com',
        phone: '+1-555-0123',
      },
      financial: {
        annualIncome: 120000,
        monthlyIncome: 10000,
        creditScore: 750,
        debtToIncomeRatio: 0.3,
      },
      employment: {
        employerName: 'Tech Solutions Inc',
        jobTitle: 'Senior Software Engineer',
        employmentType: 'FULL_TIME',
        monthsEmployed: 48,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),
  
  // Risk assessment factory
  createRiskAssessment: (overrides = {}) => ({
    id: global.testUtils.randomUUID(),
    applicationId: global.testUtils.randomUUID(),
    overallRiskScore: 72.5,
    riskGrade: 'A',
    probabilityOfDefault: 0.025,
    expectedLoss: 0.0125,
    riskFactors: [
      {
        category: 'CREDIT_HISTORY',
        factor: 'High credit score',
        impact: 15.0,
        weight: 0.3,
      },
    ],
    modelOutputs: {
      creditScoreModel: {
        score: 750,
        features: {
          paymentHistory: 0.95,
          creditUtilization: 0.25,
        },
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),
  
  // Credit decision factory
  createCreditDecision: (overrides = {}) => ({
    id: global.testUtils.randomUUID(),
    applicationId: global.testUtils.randomUUID(),
    decision: 'APPROVED',
    approvedAmount: 45000,
    interestRate: 0.0675,
    termMonths: 36,
    conditions: ['Provide quarterly financial statements'],
    reasons: ['Strong credit history', 'Stable income'],
    confidence: 0.87,
    aiRecommendation: {
      decision: 'APPROVED',
      confidence: 0.87,
      reasoning: ['Excellent credit score', 'Stable employment'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),
};

// Cleanup function for tests
global.cleanup = async () => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Clear any test data
  // This would typically involve cleaning up test database, etc.
};

// Global error handler for unhandled promises in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global beforeEach and afterEach hooks
beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(async () => {
  // Cleanup after each test
  await global.cleanup();
});
