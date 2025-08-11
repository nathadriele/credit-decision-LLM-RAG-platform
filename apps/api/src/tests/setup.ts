// =============================================================================
// TEST SETUP - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { DatabaseService } from '../services/database';
import { CacheService } from '../services/cache';

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 
  'postgresql://postgres:postgres@localhost:5432/credit_decision_test_db';

const TEST_REDIS_URL = process.env.TEST_REDIS_URL || 
  'redis://localhost:6379/1';

// Global test services
let testDatabase: DatabaseService;
let testCache: CacheService;

// Setup before all tests
beforeAll(async () => {
  // Initialize test database
  testDatabase = new DatabaseService({
    connectionString: TEST_DATABASE_URL,
    ssl: false,
    maxConnections: 5,
  });

  await testDatabase.connect();

  // Initialize test cache
  testCache = new CacheService({
    url: TEST_REDIS_URL,
    keyPrefix: 'test:',
  });

  await testCache.connect();

  // Run migrations
  await runTestMigrations();
});

// Cleanup after all tests
afterAll(async () => {
  if (testDatabase) {
    await testDatabase.disconnect();
  }

  if (testCache) {
    await testCache.disconnect();
  }
});

// Setup before each test
beforeEach(async () => {
  // Clear test data
  await clearTestData();
});

// Cleanup after each test
afterEach(async () => {
  // Clear any remaining test data
  await clearTestData();
});

// Helper functions
async function runTestMigrations() {
  const migrations = [
    `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      permissions JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS credit_applications (
      id VARCHAR(255) PRIMARY KEY,
      application_number VARCHAR(50) UNIQUE NOT NULL,
      applicant_id VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
      requested_amount DECIMAL(15,2) NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      purpose VARCHAR(50) NOT NULL,
      term_months INTEGER NOT NULL,
      applicant_data JSONB NOT NULL,
      submitted_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS risk_assessments (
      id VARCHAR(255) PRIMARY KEY,
      application_id VARCHAR(255) NOT NULL,
      overall_risk_score DECIMAL(5,2) NOT NULL,
      risk_grade VARCHAR(10) NOT NULL,
      probability_of_default DECIMAL(5,4) NOT NULL,
      expected_loss DECIMAL(5,4) NOT NULL,
      risk_factors JSONB NOT NULL DEFAULT '[]',
      risk_mitigants JSONB NOT NULL DEFAULT '[]',
      model_outputs JSONB NOT NULL DEFAULT '[]',
      recommendations JSONB NOT NULL DEFAULT '[]',
      ai_insights JSONB NOT NULL DEFAULT '[]',
      processing_time INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS credit_decisions (
      id VARCHAR(255) PRIMARY KEY,
      application_id VARCHAR(255) NOT NULL,
      decision VARCHAR(50) NOT NULL,
      approved_amount DECIMAL(15,2),
      interest_rate DECIMAL(8,6),
      term_months INTEGER,
      conditions JSONB NOT NULL DEFAULT '[]',
      reasons JSONB NOT NULL DEFAULT '[]',
      confidence DECIMAL(5,4) NOT NULL DEFAULT 0.5,
      ai_recommendation JSONB NOT NULL DEFAULT '{}',
      risk_assessment_id VARCHAR(255) NOT NULL,
      decided_by VARCHAR(255) NOT NULL,
      decided_at TIMESTAMP WITH TIME ZONE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
    `,
  ];

  for (const migration of migrations) {
    await testDatabase.query(migration);
  }
}

async function clearTestData() {
  const tables = [
    'credit_decisions',
    'risk_assessments', 
    'credit_applications',
    'users'
  ];

  for (const table of tables) {
    await testDatabase.query(`TRUNCATE TABLE ${table} CASCADE`);
  }

  // Clear cache
  await testCache.flushAll();
}

// Test data factories
export const TestDataFactory = {
  createUser: (overrides: any = {}) => ({
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: `test${Date.now()}@example.com`,
    passwordHash: '$2b$10$test.hash.for.testing.purposes.only',
    firstName: 'Test',
    lastName: 'User',
    role: 'CREDIT_ANALYST',
    permissions: ['applications:view', 'applications:create'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  createApplication: (overrides: any = {}) => ({
    id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    applicationNumber: `APP-${Date.now()}`,
    applicantId: 'test-user-id',
    status: 'SUBMITTED',
    requestedAmount: 50000,
    currency: 'USD',
    purpose: 'PERSONAL',
    termMonths: 60,
    applicantData: {
      personal: {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1985-06-15',
        ssn: '123-45-6789',
        email: 'john.doe@email.com',
        phone: '555-123-4567',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'USA',
          residenceType: 'OWN',
          monthsAtAddress: 24,
        },
        maritalStatus: 'MARRIED',
        dependents: 2,
        citizenship: 'US',
      },
      financial: {
        annualIncome: 75000,
        monthlyIncome: 6250,
        monthlyExpenses: 3500,
        creditScore: 720,
        debtToIncomeRatio: 0.35,
        existingDebts: [],
        assets: [],
        bankingHistory: {
          primaryBank: 'Test Bank',
          accountAge: 60,
          averageBalance: 8000,
          overdraftHistory: 1,
          returnedChecks: 0,
        },
      },
      employment: {
        employerName: 'Test Corp',
        jobTitle: 'Software Engineer',
        employmentType: 'FULL_TIME',
        monthsEmployed: 36,
        industryType: 'TECHNOLOGY',
      },
    },
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  createRiskAssessment: (overrides: any = {}) => ({
    id: `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    applicationId: 'test-app-id',
    overallRiskScore: 35.5,
    riskGrade: 'A',
    probabilityOfDefault: 0.05,
    expectedLoss: 0.025,
    riskFactors: [
      {
        category: 'CREDIT_HISTORY',
        factor: 'Good Credit Score',
        impact: 15,
        weight: 0.3,
        severity: 'LOW',
        description: 'Credit score of 720 indicates good credit management',
      },
    ],
    riskMitigants: [],
    modelOutputs: [],
    recommendations: ['Application shows low risk - recommend approval'],
    aiInsights: ['Strong credit profile with stable employment'],
    processingTime: 1500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),
};

// Export test services
export { testDatabase, testCache };

// Mock implementations for testing
export const MockServices = {
  mockLLMService: {
    generateCompletion: jest.fn().mockResolvedValue({
      content: 'Mock AI response',
      usage: { totalTokens: 100 },
    }),
    generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  },

  mockVectorDB: {
    addDocuments: jest.fn().mockResolvedValue(true),
    search: jest.fn().mockResolvedValue([
      {
        id: 'doc1',
        content: 'Mock document content',
        metadata: { source: 'test' },
        score: 0.9,
      },
    ]),
    deleteCollection: jest.fn().mockResolvedValue(true),
  },

  mockRAGService: {
    query: jest.fn().mockResolvedValue({
      answer: 'Mock RAG response',
      sources: ['doc1'],
      confidence: 0.9,
    }),
  },
};

// Test utilities
export const TestUtils = {
  generateToken: (userId: string) => {
    // Mock JWT token for testing
    return `mock.jwt.token.${userId}`;
  },

  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  expectValidationError: (error: any, field: string) => {
    expect(error.name).toBe('ValidationError');
    expect(error.details).toContain(field);
  },

  expectDatabaseError: (error: any) => {
    expect(error.name).toBe('DatabaseError');
  },
};
