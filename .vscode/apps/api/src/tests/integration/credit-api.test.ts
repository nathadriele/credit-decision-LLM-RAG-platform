// =============================================================================
// CREDIT API INTEGRATION TESTS - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../app';
import { TestDataFactory, testDatabase, TestUtils } from '../setup';

describe('Credit API Integration Tests', () => {
  let app: Express;
  let authToken: string;
  let testUser: any;

  beforeEach(async () => {
    // Create test app
    app = createApp({
      database: testDatabase,
      enableAuth: true,
      enableRateLimit: false, // Disable for testing
    });

    // Create test user
    testUser = TestDataFactory.createUser({
      role: 'CREDIT_MANAGER',
      permissions: [
        'applications:view',
        'applications:create',
        'applications:update',
        'decisions:make',
        'decisions:review',
      ],
    });

    await testDatabase.query(`
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, role, permissions,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      testUser.id,
      testUser.email,
      testUser.passwordHash,
      testUser.firstName,
      testUser.lastName,
      testUser.role,
      JSON.stringify(testUser.permissions),
      testUser.createdAt,
      testUser.updatedAt,
    ]);

    // Generate auth token
    authToken = TestUtils.generateToken(testUser.id);
  });

  describe('POST /api/credit/applications', () => {
    test('should create new credit application', async () => {
      // Arrange
      const applicationData = {
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
      };

      // Act
      const response = await request(app)
        .post('/api/credit/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send(applicationData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.applicationNumber).toMatch(/^APP-\d{8}-[A-Z0-9]{6}$/);
      expect(response.body.data.status).toBe('SUBMITTED');
      expect(response.body.data.requestedAmount).toBe(50000);
      expect(response.body.data.applicantData.personal.firstName).toBe('John');
    });

    test('should validate required fields', async () => {
      // Arrange
      const invalidData = {
        requestedAmount: 'invalid', // Should be number
        currency: 'USD',
        purpose: 'INVALID_PURPOSE', // Invalid enum value
        // Missing termMonths
        applicantData: {
          // Missing required personal data
        },
      };

      // Act
      const response = await request(app)
        .post('/api/credit/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
    });

    test('should require authentication', async () => {
      // Act
      const response = await request(app)
        .post('/api/credit/applications')
        .send({})
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    test('should require proper permissions', async () => {
      // Arrange - Create user without create permission
      const limitedUser = TestDataFactory.createUser({
        permissions: ['applications:view'], // No create permission
      });

      await testDatabase.query(`
        INSERT INTO users (
          id, email, password_hash, first_name, last_name, role, permissions,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        limitedUser.id,
        limitedUser.email,
        limitedUser.passwordHash,
        limitedUser.firstName,
        limitedUser.lastName,
        limitedUser.role,
        JSON.stringify(limitedUser.permissions),
        limitedUser.createdAt,
        limitedUser.updatedAt,
      ]);

      const limitedToken = TestUtils.generateToken(limitedUser.id);

      // Act
      const response = await request(app)
        .post('/api/credit/applications')
        .set('Authorization', `Bearer ${limitedToken}`)
        .send({})
        .expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/credit/applications', () => {
    beforeEach(async () => {
      // Create test applications
      const applications = [
        TestDataFactory.createApplication({ status: 'SUBMITTED' }),
        TestDataFactory.createApplication({ status: 'APPROVED' }),
        TestDataFactory.createApplication({ status: 'DECLINED' }),
      ];

      for (const app of applications) {
        await testDatabase.query(`
          INSERT INTO credit_applications (
            id, application_number, applicant_id, status, requested_amount,
            currency, purpose, term_months, applicant_data, submitted_at,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          app.id,
          app.applicationNumber,
          app.applicantId,
          app.status,
          app.requestedAmount,
          app.currency,
          app.purpose,
          app.termMonths,
          JSON.stringify(app.applicantData),
          app.submittedAt,
          app.createdAt,
          app.updatedAt,
        ]);
      }
    });

    test('should list applications with pagination', async () => {
      // Act
      const response = await request(app)
        .get('/api/credit/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 2 })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.total).toBe(3);
    });

    test('should filter applications by status', async () => {
      // Act
      const response = await request(app)
        .get('/api/credit/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'APPROVED' })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].status).toBe('APPROVED');
    });

    test('should sort applications', async () => {
      // Act
      const response = await request(app)
        .get('/api/credit/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ sortBy: 'requestedAmount', sortOrder: 'desc' })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(3);
      
      // Verify sorting
      const amounts = response.body.data.items.map((app: any) => app.requestedAmount);
      expect(amounts[0]).toBeGreaterThanOrEqual(amounts[1]);
      expect(amounts[1]).toBeGreaterThanOrEqual(amounts[2]);
    });
  });

  describe('GET /api/credit/applications/:id', () => {
    let testApplication: any;

    beforeEach(async () => {
      testApplication = TestDataFactory.createApplication();
      
      await testDatabase.query(`
        INSERT INTO credit_applications (
          id, application_number, applicant_id, status, requested_amount,
          currency, purpose, term_months, applicant_data, submitted_at,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        testApplication.id,
        testApplication.applicationNumber,
        testApplication.applicantId,
        testApplication.status,
        testApplication.requestedAmount,
        testApplication.currency,
        testApplication.purpose,
        testApplication.termMonths,
        JSON.stringify(testApplication.applicantData),
        testApplication.submittedAt,
        testApplication.createdAt,
        testApplication.updatedAt,
      ]);
    });

    test('should get application by ID', async () => {
      // Act
      const response = await request(app)
        .get(`/api/credit/applications/${testApplication.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testApplication.id);
      expect(response.body.data.applicationNumber).toBe(testApplication.applicationNumber);
      expect(response.body.data.applicantData).toBeDefined();
    });

    test('should return 404 for non-existent application', async () => {
      // Act
      const response = await request(app)
        .get('/api/credit/applications/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('APPLICATION_NOT_FOUND');
    });
  });

  describe('POST /api/credit/risk-assessment', () => {
    let testApplication: any;

    beforeEach(async () => {
      testApplication = TestDataFactory.createApplication();
      
      await testDatabase.query(`
        INSERT INTO credit_applications (
          id, application_number, applicant_id, status, requested_amount,
          currency, purpose, term_months, applicant_data, submitted_at,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        testApplication.id,
        testApplication.applicationNumber,
        testApplication.applicantId,
        testApplication.status,
        testApplication.requestedAmount,
        testApplication.currency,
        testApplication.purpose,
        testApplication.termMonths,
        JSON.stringify(testApplication.applicantData),
        testApplication.submittedAt,
        testApplication.createdAt,
        testApplication.updatedAt,
      ]);
    });

    test('should create risk assessment', async () => {
      // Act
      const response = await request(app)
        .post('/api/credit/risk-assessment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ applicationId: testApplication.id })
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.applicationId).toBe(testApplication.id);
      expect(response.body.data.overallRiskScore).toBeDefined();
      expect(response.body.data.riskGrade).toBeDefined();
      expect(response.body.data.riskFactors).toBeDefined();
    });

    test('should return 404 for non-existent application', async () => {
      // Act
      const response = await request(app)
        .post('/api/credit/risk-assessment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ applicationId: 'non-existent-id' })
        .expect(404);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('APPLICATION_NOT_FOUND');
    });
  });

  describe('POST /api/credit/decisions', () => {
    let testApplication: any;
    let testRiskAssessment: any;

    beforeEach(async () => {
      testApplication = TestDataFactory.createApplication();
      testRiskAssessment = TestDataFactory.createRiskAssessment({
        applicationId: testApplication.id,
      });
      
      // Insert application
      await testDatabase.query(`
        INSERT INTO credit_applications (
          id, application_number, applicant_id, status, requested_amount,
          currency, purpose, term_months, applicant_data, submitted_at,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        testApplication.id,
        testApplication.applicationNumber,
        testApplication.applicantId,
        testApplication.status,
        testApplication.requestedAmount,
        testApplication.currency,
        testApplication.purpose,
        testApplication.termMonths,
        JSON.stringify(testApplication.applicantData),
        testApplication.submittedAt,
        testApplication.createdAt,
        testApplication.updatedAt,
      ]);

      // Insert risk assessment
      await testDatabase.query(`
        INSERT INTO risk_assessments (
          id, application_id, overall_risk_score, risk_grade,
          probability_of_default, expected_loss, risk_factors,
          risk_mitigants, model_outputs, recommendations, ai_insights,
          processing_time, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        testRiskAssessment.id,
        testRiskAssessment.applicationId,
        testRiskAssessment.overallRiskScore,
        testRiskAssessment.riskGrade,
        testRiskAssessment.probabilityOfDefault,
        testRiskAssessment.expectedLoss,
        JSON.stringify(testRiskAssessment.riskFactors),
        JSON.stringify(testRiskAssessment.riskMitigants),
        JSON.stringify(testRiskAssessment.modelOutputs),
        JSON.stringify(testRiskAssessment.recommendations),
        JSON.stringify(testRiskAssessment.aiInsights),
        testRiskAssessment.processingTime,
        testRiskAssessment.createdAt,
        testRiskAssessment.updatedAt,
      ]);
    });

    test('should make credit decision', async () => {
      // Act
      const response = await request(app)
        .post('/api/credit/decisions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          applicationId: testApplication.id,
          overrideAI: false,
        })
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.applicationId).toBe(testApplication.id);
      expect(response.body.data.decision).toBeDefined();
      expect(response.body.data.confidence).toBeDefined();
      expect(response.body.data.aiRecommendation).toBeDefined();
    });

    test('should require decision-making permission', async () => {
      // Arrange - Create user without decision permission
      const limitedUser = TestDataFactory.createUser({
        permissions: ['applications:view'], // No decision permission
      });

      await testDatabase.query(`
        INSERT INTO users (
          id, email, password_hash, first_name, last_name, role, permissions,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        limitedUser.id,
        limitedUser.email,
        limitedUser.passwordHash,
        limitedUser.firstName,
        limitedUser.lastName,
        limitedUser.role,
        JSON.stringify(limitedUser.permissions),
        limitedUser.createdAt,
        limitedUser.updatedAt,
      ]);

      const limitedToken = TestUtils.generateToken(limitedUser.id);

      // Act
      const response = await request(app)
        .post('/api/credit/decisions')
        .set('Authorization', `Bearer ${limitedToken}`)
        .send({
          applicationId: testApplication.id,
          overrideAI: false,
        })
        .expect(403);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });
});
