// =============================================================================
// CREDIT DECISION SERVICE TESTS - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { CreditDecisionService, DecisionType } from '../../services/credit-decision';
import { RiskAnalysisService } from '../../services/risk-analysis';
import { TestDataFactory, testDatabase, testCache, MockServices } from '../setup';

describe('CreditDecisionService', () => {
  let creditDecisionService: CreditDecisionService;
  let mockRiskAnalysisService: jest.Mocked<RiskAnalysisService>;

  beforeEach(() => {
    // Create mock services
    mockRiskAnalysisService = {
      assessRisk: jest.fn(),
      getRiskAssessment: jest.fn(),
      updateRiskAssessment: jest.fn(),
    } as any;

    // Initialize service with mocks
    creditDecisionService = new CreditDecisionService({
      ragService: MockServices.mockRAGService as any,
      riskAnalysisService: mockRiskAnalysisService,
      database: testDatabase,
      cache: testCache,
      enableAIDecisions: true,
      enableAutoDecisions: true,
      requireHumanReview: false,
      decisionCriteria: {
        minCreditScore: 650,
        maxDebtToIncomeRatio: 0.4,
        minEmploymentMonths: 12,
        maxLoanToValueRatio: 0.8,
        requiredDocuments: ['INCOME_VERIFICATION'],
        autoApprovalThresholds: {
          riskScore: 30,
          amount: 100000,
          creditScore: 750,
        },
        autoDeclineThresholds: {
          riskScore: 80,
          creditScore: 600,
          debtToIncomeRatio: 0.5,
        },
      },
    });
  });

  describe('makeDecision', () => {
    test('should make automated approval decision for low-risk application', async () => {
      // Arrange
      const application = TestDataFactory.createApplication({
        applicantData: {
          ...TestDataFactory.createApplication().applicantData,
          financial: {
            ...TestDataFactory.createApplication().applicantData.financial,
            creditScore: 780,
            debtToIncomeRatio: 0.25,
          },
          employment: {
            ...TestDataFactory.createApplication().applicantData.employment,
            monthsEmployed: 48,
          },
        },
      });

      const riskAssessment = TestDataFactory.createRiskAssessment({
        applicationId: application.id,
        overallRiskScore: 25,
        riskGrade: 'AA',
        probabilityOfDefault: 0.02,
      });

      // Insert test data
      await testDatabase.query(`
        INSERT INTO credit_applications (
          id, application_number, applicant_id, status, requested_amount,
          currency, purpose, term_months, applicant_data, submitted_at,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        application.id,
        application.applicationNumber,
        application.applicantId,
        application.status,
        application.requestedAmount,
        application.currency,
        application.purpose,
        application.termMonths,
        JSON.stringify(application.applicantData),
        application.submittedAt,
        application.createdAt,
        application.updatedAt,
      ]);

      mockRiskAnalysisService.getRiskAssessment.mockResolvedValue(riskAssessment);

      // Act
      const decision = await creditDecisionService.makeDecision(
        application.id,
        'test-user-id',
        false
      );

      // Assert
      expect(decision).toBeDefined();
      expect(decision.decision).toBe(DecisionType.APPROVED);
      expect(decision.confidence).toBeGreaterThan(0.8);
      expect(decision.approvedAmount).toBe(application.requestedAmount);
      expect(decision.reasons).toContain('Automated approval based on excellent risk profile');
    });

    test('should make automated decline decision for high-risk application', async () => {
      // Arrange
      const application = TestDataFactory.createApplication({
        applicantData: {
          ...TestDataFactory.createApplication().applicantData,
          financial: {
            ...TestDataFactory.createApplication().applicantData.financial,
            creditScore: 580,
            debtToIncomeRatio: 0.55,
          },
        },
      });

      const riskAssessment = TestDataFactory.createRiskAssessment({
        applicationId: application.id,
        overallRiskScore: 85,
        riskGrade: 'CCC',
        probabilityOfDefault: 0.25,
      });

      // Insert test data
      await testDatabase.query(`
        INSERT INTO credit_applications (
          id, application_number, applicant_id, status, requested_amount,
          currency, purpose, term_months, applicant_data, submitted_at,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        application.id,
        application.applicationNumber,
        application.applicantId,
        application.status,
        application.requestedAmount,
        application.currency,
        application.purpose,
        application.termMonths,
        JSON.stringify(application.applicantData),
        application.submittedAt,
        application.createdAt,
        application.updatedAt,
      ]);

      mockRiskAnalysisService.getRiskAssessment.mockResolvedValue(riskAssessment);

      // Act
      const decision = await creditDecisionService.makeDecision(
        application.id,
        'test-user-id',
        false
      );

      // Assert
      expect(decision).toBeDefined();
      expect(decision.decision).toBe(DecisionType.DECLINED);
      expect(decision.reasons).toContain('Automated decline based on high risk factors');
    });

    test('should require human review for borderline applications', async () => {
      // Arrange
      const application = TestDataFactory.createApplication({
        applicantData: {
          ...TestDataFactory.createApplication().applicantData,
          financial: {
            ...TestDataFactory.createApplication().applicantData.financial,
            creditScore: 680,
            debtToIncomeRatio: 0.38,
          },
        },
      });

      const riskAssessment = TestDataFactory.createRiskAssessment({
        applicationId: application.id,
        overallRiskScore: 55,
        riskGrade: 'BBB',
        probabilityOfDefault: 0.08,
      });

      // Insert test data
      await testDatabase.query(`
        INSERT INTO credit_applications (
          id, application_number, applicant_id, status, requested_amount,
          currency, purpose, term_months, applicant_data, submitted_at,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        application.id,
        application.applicationNumber,
        application.applicantId,
        application.status,
        application.requestedAmount,
        application.currency,
        application.purpose,
        application.termMonths,
        JSON.stringify(application.applicantData),
        application.submittedAt,
        application.createdAt,
        application.updatedAt,
      ]);

      mockRiskAnalysisService.getRiskAssessment.mockResolvedValue(riskAssessment);

      // Act
      const decision = await creditDecisionService.makeDecision(
        application.id,
        'test-user-id',
        false
      );

      // Assert
      expect(decision).toBeDefined();
      expect(decision.decision).toBe(DecisionType.PENDING_REVIEW);
      expect(decision.reasons).toContain('Requires human review due to complex risk profile');
    });

    test('should handle AI recommendation with high confidence', async () => {
      // Arrange
      const application = TestDataFactory.createApplication();
      const riskAssessment = TestDataFactory.createRiskAssessment({
        applicationId: application.id,
        overallRiskScore: 45,
      });

      // Mock AI response
      MockServices.mockRAGService.query.mockResolvedValue({
        answer: `
          Recommended decision: CONDITIONAL_APPROVAL
          Confidence: 90%
          Reasoning:
          - Good credit score but high DTI ratio
          - Stable employment history
          - Recommend approval with conditions
          Suggested amount: $40000
          Suggested rate: 8.5%
          Required conditions:
          - Provide additional income verification
          - Reduce existing debt by 10%
        `,
        sources: ['credit-policy-1', 'risk-guidelines-2'],
        confidence: 0.9,
      });

      // Insert test data
      await testDatabase.query(`
        INSERT INTO credit_applications (
          id, application_number, applicant_id, status, requested_amount,
          currency, purpose, term_months, applicant_data, submitted_at,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        application.id,
        application.applicationNumber,
        application.applicantId,
        application.status,
        application.requestedAmount,
        application.currency,
        application.purpose,
        application.termMonths,
        JSON.stringify(application.applicantData),
        application.submittedAt,
        application.createdAt,
        application.updatedAt,
      ]);

      mockRiskAnalysisService.getRiskAssessment.mockResolvedValue(riskAssessment);

      // Act
      const decision = await creditDecisionService.makeDecision(
        application.id,
        'test-user-id',
        false
      );

      // Assert
      expect(decision).toBeDefined();
      expect(decision.decision).toBe(DecisionType.CONDITIONAL_APPROVAL);
      expect(decision.confidence).toBeGreaterThan(0.8);
      expect(decision.aiRecommendation.decision).toBe(DecisionType.CONDITIONAL_APPROVAL);
      expect(decision.conditions).toContain('Provide additional income verification');
    });

    test('should throw error for non-existent application', async () => {
      // Act & Assert
      await expect(
        creditDecisionService.makeDecision('non-existent-id', 'test-user-id', false)
      ).rejects.toThrow('Application non-existent-id not found');
    });

    test('should throw error when risk assessment is missing', async () => {
      // Arrange
      const application = TestDataFactory.createApplication();

      // Insert test data
      await testDatabase.query(`
        INSERT INTO credit_applications (
          id, application_number, applicant_id, status, requested_amount,
          currency, purpose, term_months, applicant_data, submitted_at,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        application.id,
        application.applicationNumber,
        application.applicantId,
        application.status,
        application.requestedAmount,
        application.currency,
        application.purpose,
        application.termMonths,
        JSON.stringify(application.applicantData),
        application.submittedAt,
        application.createdAt,
        application.updatedAt,
      ]);

      mockRiskAnalysisService.getRiskAssessment.mockResolvedValue(null);

      // Act & Assert
      await expect(
        creditDecisionService.makeDecision(application.id, 'test-user-id', false)
      ).rejects.toThrow(`Risk assessment not found for application ${application.id}`);
    });
  });

  describe('getDecision', () => {
    test('should retrieve decision from cache', async () => {
      // Arrange
      const decision = {
        id: 'decision-1',
        applicationId: 'app-1',
        decision: DecisionType.APPROVED,
        confidence: 0.9,
      };

      await testCache.set('credit_decision:app-1', decision, 3600);

      // Act
      const result = await creditDecisionService.getDecision('app-1');

      // Assert
      expect(result).toEqual(decision);
    });

    test('should retrieve decision from database when not in cache', async () => {
      // Arrange
      const decision = TestDataFactory.createApplication();
      
      await testDatabase.query(`
        INSERT INTO credit_decisions (
          id, application_id, decision, confidence, ai_recommendation,
          risk_assessment_id, decided_by, decided_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'decision-1',
        'app-1',
        'APPROVED',
        0.9,
        '{}',
        'risk-1',
        'user-1',
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
      ]);

      // Act
      const result = await creditDecisionService.getDecision('app-1');

      // Assert
      expect(result).toBeDefined();
      expect(result?.decision).toBe('APPROVED');
      expect(result?.confidence).toBe(0.9);
    });

    test('should return null for non-existent decision', async () => {
      // Act
      const result = await creditDecisionService.getDecision('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('reviewDecision', () => {
    test('should approve decision review', async () => {
      // Arrange
      await testDatabase.query(`
        INSERT INTO credit_decisions (
          id, application_id, decision, confidence, ai_recommendation,
          risk_assessment_id, decided_by, decided_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'decision-1',
        'app-1',
        'PENDING_REVIEW',
        0.7,
        '{}',
        'risk-1',
        'user-1',
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
      ]);

      // Act
      const result = await creditDecisionService.reviewDecision(
        'decision-1',
        'reviewer-1',
        'APPROVE',
        'Looks good to approve'
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.decision).toBe('PENDING_REVIEW');

      // Verify review was logged
      const reviewResult = await testDatabase.query(
        'SELECT * FROM decision_reviews WHERE decision_id = $1',
        ['decision-1']
      );
      expect(reviewResult.rows).toHaveLength(1);
      expect(reviewResult.rows[0].action).toBe('APPROVE');
      expect(reviewResult.rows[0].comments).toBe('Looks good to approve');
    });

    test('should modify decision during review', async () => {
      // Arrange
      await testDatabase.query(`
        INSERT INTO credit_decisions (
          id, application_id, decision, confidence, ai_recommendation,
          risk_assessment_id, decided_by, decided_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'decision-1',
        'app-1',
        'PENDING_REVIEW',
        0.7,
        '{}',
        'risk-1',
        'user-1',
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
      ]);

      // Act
      const result = await creditDecisionService.reviewDecision(
        'decision-1',
        'reviewer-1',
        'MODIFY',
        'Reducing approved amount',
        {
          decision: DecisionType.APPROVED,
          approvedAmount: 40000,
          conditions: ['Provide additional documentation'],
        }
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.decision).toBe(DecisionType.APPROVED);
      expect(result.approvedAmount).toBe(40000);
      expect(result.conditions).toContain('Provide additional documentation');
    });
  });
});
