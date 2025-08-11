// =============================================================================
// API TEST SETUP - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { config } from '../config';
import { DatabaseService } from '../services/database';
import { RedisService } from '../services/redis';

// =============================================================================
// TEST DATABASE SETUP
// =============================================================================

export class TestDatabaseService {
  private static instance: TestDatabaseService;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  static getInstance(): TestDatabaseService {
    if (!TestDatabaseService.instance) {
      TestDatabaseService.instance = new TestDatabaseService();
    }
    return TestDatabaseService.instance;
  }

  async setup(): Promise<void> {
    // Initialize test database
    await this.db.initialize();
    
    // Run migrations
    await this.runMigrations();
    
    // Seed test data
    await this.seedTestData();
  }

  async cleanup(): Promise<void> {
    // Clean up test data
    await this.cleanupTestData();
  }

  async teardown(): Promise<void> {
    // Close database connections
    await this.db.cleanup();
  }

  private async runMigrations(): Promise<void> {
    // Run database migrations for test environment
    const migrations = [
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
      
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        is_email_verified BOOLEAN DEFAULT false,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );`,
      
      // Roles table
      `CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      
      // User roles junction table
      `CREATE TABLE IF NOT EXISTS user_roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_by UUID REFERENCES users(id),
        UNIQUE(user_id, role_id)
      );`,
      
      // Credit applications table
      `CREATE TABLE IF NOT EXISTS credit_applications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        applicant_id UUID NOT NULL,
        application_number VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        requested_amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        purpose VARCHAR(100) NOT NULL,
        term_months INTEGER NOT NULL,
        applicant_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        submitted_at TIMESTAMP,
        processed_at TIMESTAMP
      );`,
      
      // Risk assessments table
      `CREATE TABLE IF NOT EXISTS risk_assessments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        application_id UUID NOT NULL REFERENCES credit_applications(id) ON DELETE CASCADE,
        overall_risk_score DECIMAL(5,2),
        risk_grade VARCHAR(10),
        probability_of_default DECIMAL(8,6),
        expected_loss DECIMAL(8,6),
        risk_factors JSONB,
        risk_mitigants JSONB,
        model_outputs JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
      
      // Credit decisions table
      `CREATE TABLE IF NOT EXISTS credit_decisions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        application_id UUID NOT NULL REFERENCES credit_applications(id) ON DELETE CASCADE,
        decision VARCHAR(50) NOT NULL,
        approved_amount DECIMAL(15,2),
        interest_rate DECIMAL(8,6),
        term_months INTEGER,
        conditions JSONB,
        reasons JSONB,
        confidence DECIMAL(4,3),
        ai_recommendation JSONB,
        decided_by UUID REFERENCES users(id),
        decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,
    ];

    for (const migration of migrations) {
      await this.db.query(migration);
    }
  }

  private async seedTestData(): Promise<void> {
    // Insert test roles
    await this.db.query(`
      INSERT INTO roles (id, name, description, is_system) VALUES
      ('550e8400-e29b-41d4-a716-446655440001', 'ADMIN', 'Administrator', true),
      ('550e8400-e29b-41d4-a716-446655440002', 'CREDIT_ANALYST', 'Credit Analyst', true),
      ('550e8400-e29b-41d4-a716-446655440003', 'UNDERWRITER', 'Underwriter', true)
      ON CONFLICT (name) DO NOTHING;
    `);

    // Insert test user
    await this.db.query(`
      INSERT INTO users (id, email, username, first_name, last_name, password_hash, is_active, is_email_verified) VALUES
      ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', 'testuser', 'Test', 'User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', true, true)
      ON CONFLICT (email) DO NOTHING;
    `);

    // Assign role to test user
    await this.db.query(`
      INSERT INTO user_roles (user_id, role_id) VALUES
      ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002')
      ON CONFLICT (user_id, role_id) DO NOTHING;
    `);
  }

  private async cleanupTestData(): Promise<void> {
    // Clean up test data in reverse order of dependencies
    const tables = [
      'credit_decisions',
      'risk_assessments',
      'credit_applications',
      'user_roles',
      'users',
      'roles',
    ];

    for (const table of tables) {
      await this.db.query(`DELETE FROM ${table} WHERE true;`);
    }
  }

  async createTestUser(userData: any = {}): Promise<any> {
    const defaultUser = global.testData.createUser();
    const user = { ...defaultUser, ...userData };

    const result = await this.db.query(`
      INSERT INTO users (id, email, username, first_name, last_name, password_hash, is_active, is_email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `, [
      user.id,
      user.email,
      user.username,
      user.firstName,
      user.lastName,
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', // test password
      user.isActive,
      true,
    ]);

    return result.rows[0];
  }

  async createTestApplication(applicationData: any = {}): Promise<any> {
    const defaultApplication = global.testData.createCreditApplication();
    const application = { ...defaultApplication, ...applicationData };

    const result = await this.db.query(`
      INSERT INTO credit_applications (id, applicant_id, application_number, status, requested_amount, currency, purpose, term_months, applicant_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `, [
      application.id,
      application.applicantId,
      application.applicationNumber,
      application.status,
      application.requestedAmount,
      application.currency,
      application.purpose,
      application.termMonths,
      JSON.stringify(application.applicantData),
    ]);

    return result.rows[0];
  }
}

// =============================================================================
// TEST REDIS SETUP
// =============================================================================

export class TestRedisService {
  private static instance: TestRedisService;
  private redis: RedisService;

  private constructor() {
    this.redis = RedisService.getInstance();
  }

  static getInstance(): TestRedisService {
    if (!TestRedisService.instance) {
      TestRedisService.instance = new TestRedisService();
    }
    return TestRedisService.instance;
  }

  async setup(): Promise<void> {
    await this.redis.initialize();
  }

  async cleanup(): Promise<void> {
    // Clear all test data from Redis
    await this.redis.flushdb();
  }

  async teardown(): Promise<void> {
    await this.redis.cleanup();
  }
}

// =============================================================================
// GLOBAL TEST SETUP
// =============================================================================

let testDb: TestDatabaseService;
let testRedis: TestRedisService;

beforeAll(async () => {
  // Setup test database
  testDb = TestDatabaseService.getInstance();
  await testDb.setup();

  // Setup test Redis
  testRedis = TestRedisService.getInstance();
  await testRedis.setup();
}, 30000);

afterAll(async () => {
  // Teardown test services
  if (testDb) {
    await testDb.teardown();
  }
  if (testRedis) {
    await testRedis.teardown();
  }
}, 30000);

beforeEach(async () => {
  // Clean up before each test
  if (testDb) {
    await testDb.cleanup();
    await testDb.seedTestData();
  }
  if (testRedis) {
    await testRedis.cleanup();
  }
});

// =============================================================================
// TEST UTILITIES
// =============================================================================

export const testUtils = {
  db: () => testDb,
  redis: () => testRedis,
  
  // Generate JWT token for testing
  generateTestToken: (userId: string = '550e8400-e29b-41d4-a716-446655440000'): string => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      {
        userId,
        sessionId: global.testUtils.randomUUID(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      },
      config.security.jwtSecret
    );
  },

  // Create authenticated request headers
  authHeaders: (token?: string) => ({
    'Authorization': `Bearer ${token || testUtils.generateTestToken()}`,
    'Content-Type': 'application/json',
  }),

  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Retry function for flaky tests
  retry: async (fn: () => Promise<any>, maxAttempts: number = 3): Promise<any> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxAttempts) {
          throw lastError;
        }
        await testUtils.waitFor(1000 * attempt); // Exponential backoff
      }
    }
    
    throw lastError!;
  },
};

// Export test utilities globally
(global as any).testUtils = { ...global.testUtils, ...testUtils };
