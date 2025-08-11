// =============================================================================
// CUSTOM JEST MATCHERS - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { expect } from '@jest/globals';

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeValidCreditScore(): R;
      toBeValidRiskScore(): R;
      toBeValidCurrency(): R;
      toBeValidApplicationNumber(): R;
      toHaveValidTimestamp(): R;
      toBeValidDecision(): R;
      toBeValidRiskGrade(): R;
      toMatchAPIResponse(): R;
      toHaveValidPagination(): R;
    }
  }
}

// UUID validation matcher
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    
    return {
      message: () => `expected ${received} to be a valid UUID`,
      pass,
    };
  },
});

// Email validation matcher
expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);
    
    return {
      message: () => `expected ${received} to be a valid email address`,
      pass,
    };
  },
});

// Credit score validation matcher
expect.extend({
  toBeValidCreditScore(received: number) {
    const pass = typeof received === 'number' && received >= 300 && received <= 850;
    
    return {
      message: () => `expected ${received} to be a valid credit score (300-850)`,
      pass,
    };
  },
});

// Risk score validation matcher
expect.extend({
  toBeValidRiskScore(received: number) {
    const pass = typeof received === 'number' && received >= 0 && received <= 100;
    
    return {
      message: () => `expected ${received} to be a valid risk score (0-100)`,
      pass,
    };
  },
});

// Currency validation matcher
expect.extend({
  toBeValidCurrency(received: string) {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
    const pass = typeof received === 'string' && validCurrencies.includes(received);
    
    return {
      message: () => `expected ${received} to be a valid currency code`,
      pass,
    };
  },
});

// Application number validation matcher
expect.extend({
  toBeValidApplicationNumber(received: string) {
    const appNumberRegex = /^APP-\d{8}-[A-Z0-9]{6}$/;
    const pass = typeof received === 'string' && appNumberRegex.test(received);
    
    return {
      message: () => `expected ${received} to be a valid application number`,
      pass,
    };
  },
});

// Timestamp validation matcher
expect.extend({
  toHaveValidTimestamp(received: any) {
    const timestamp = new Date(received);
    const pass = !isNaN(timestamp.getTime()) && timestamp.getTime() > 0;
    
    return {
      message: () => `expected ${received} to be a valid timestamp`,
      pass,
    };
  },
});

// Decision validation matcher
expect.extend({
  toBeValidDecision(received: string) {
    const validDecisions = [
      'APPROVED',
      'DECLINED',
      'CONDITIONAL_APPROVAL',
      'COUNTER_OFFER',
      'PENDING_REVIEW',
    ];
    const pass = typeof received === 'string' && validDecisions.includes(received);
    
    return {
      message: () => `expected ${received} to be a valid decision type`,
      pass,
    };
  },
});

// Risk grade validation matcher
expect.extend({
  toBeValidRiskGrade(received: string) {
    const validGrades = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC'];
    const pass = typeof received === 'string' && validGrades.includes(received);
    
    return {
      message: () => `expected ${received} to be a valid risk grade`,
      pass,
    };
  },
});

// API response validation matcher
expect.extend({
  toMatchAPIResponse(received: any) {
    const hasSuccess = typeof received.success === 'boolean';
    const hasData = received.success ? received.data !== undefined : true;
    const hasError = !received.success ? received.error !== undefined : true;
    const hasTimestamp = typeof received.timestamp === 'string';
    
    const pass = hasSuccess && hasData && hasError && hasTimestamp;
    
    return {
      message: () => `expected ${JSON.stringify(received)} to match API response format`,
      pass,
    };
  },
});

// Pagination validation matcher
expect.extend({
  toHaveValidPagination(received: any) {
    const hasPage = typeof received.page === 'number' && received.page > 0;
    const hasLimit = typeof received.limit === 'number' && received.limit > 0;
    const hasTotal = typeof received.total === 'number' && received.total >= 0;
    const hasTotalPages = typeof received.totalPages === 'number' && received.totalPages >= 0;
    const hasHasNext = typeof received.hasNext === 'boolean';
    const hasHasPrev = typeof received.hasPrev === 'boolean';
    
    const pass = hasPage && hasLimit && hasTotal && hasTotalPages && hasHasNext && hasHasPrev;
    
    return {
      message: () => `expected ${JSON.stringify(received)} to have valid pagination`,
      pass,
    };
  },
});

// Helper functions for test assertions
export const TestAssertions = {
  // Validate application data structure
  validateApplication: (application: any) => {
    expect(application.id).toBeValidUUID();
    expect(application.applicationNumber).toBeValidApplicationNumber();
    expect(application.requestedAmount).toBeGreaterThan(0);
    expect(application.currency).toBeValidCurrency();
    expect(application.createdAt).toHaveValidTimestamp();
    expect(application.updatedAt).toHaveValidTimestamp();
    
    if (application.applicantData?.financial?.creditScore) {
      expect(application.applicantData.financial.creditScore).toBeValidCreditScore();
    }
  },

  // Validate risk assessment data structure
  validateRiskAssessment: (riskAssessment: any) => {
    expect(riskAssessment.id).toBeValidUUID();
    expect(riskAssessment.applicationId).toBeValidUUID();
    expect(riskAssessment.overallRiskScore).toBeValidRiskScore();
    expect(riskAssessment.riskGrade).toBeValidRiskGrade();
    expect(riskAssessment.probabilityOfDefault).toBeGreaterThanOrEqual(0);
    expect(riskAssessment.probabilityOfDefault).toBeLessThanOrEqual(1);
    expect(riskAssessment.expectedLoss).toBeGreaterThanOrEqual(0);
    expect(riskAssessment.expectedLoss).toBeLessThanOrEqual(1);
    expect(riskAssessment.createdAt).toHaveValidTimestamp();
  },

  // Validate credit decision data structure
  validateCreditDecision: (decision: any) => {
    expect(decision.id).toBeValidUUID();
    expect(decision.applicationId).toBeValidUUID();
    expect(decision.decision).toBeValidDecision();
    expect(decision.confidence).toBeGreaterThanOrEqual(0);
    expect(decision.confidence).toBeLessThanOrEqual(1);
    expect(decision.decidedAt).toHaveValidTimestamp();
    expect(decision.createdAt).toHaveValidTimestamp();
    
    if (decision.approvedAmount) {
      expect(decision.approvedAmount).toBeGreaterThan(0);
    }
    
    if (decision.interestRate) {
      expect(decision.interestRate).toBeGreaterThan(0);
      expect(decision.interestRate).toBeLessThanOrEqual(1);
    }
  },

  // Validate API response structure
  validateAPIResponse: (response: any, expectSuccess: boolean = true) => {
    expect(response).toMatchAPIResponse();
    expect(response.success).toBe(expectSuccess);
    
    if (expectSuccess) {
      expect(response.data).toBeDefined();
    } else {
      expect(response.error).toBeDefined();
      expect(response.error.code).toBeDefined();
      expect(response.error.message).toBeDefined();
    }
  },

  // Validate paginated response
  validatePaginatedResponse: (response: any, expectedItemCount?: number) => {
    TestAssertions.validateAPIResponse(response);
    expect(response.data.items).toBeInstanceOf(Array);
    expect(response.data.pagination).toHaveValidPagination();
    
    if (expectedItemCount !== undefined) {
      expect(response.data.items).toHaveLength(expectedItemCount);
    }
  },

  // Validate user data structure
  validateUser: (user: any) => {
    expect(user.id).toBeValidUUID();
    expect(user.email).toBeValidEmail();
    expect(user.firstName).toBeDefined();
    expect(user.lastName).toBeDefined();
    expect(user.role).toBeDefined();
    expect(user.permissions).toBeInstanceOf(Array);
    expect(user.createdAt).toHaveValidTimestamp();
    expect(user.updatedAt).toHaveValidTimestamp();
  },

  // Validate RAG response structure
  validateRAGResponse: (response: any) => {
    expect(response.answer).toBeDefined();
    expect(typeof response.answer).toBe('string');
    expect(response.sources).toBeInstanceOf(Array);
    expect(response.confidence).toBeGreaterThanOrEqual(0);
    expect(response.confidence).toBeLessThanOrEqual(1);
    
    if (response.usage) {
      expect(response.usage.totalTokens).toBeGreaterThan(0);
    }
  },
};

console.log('Custom Jest matchers loaded');
