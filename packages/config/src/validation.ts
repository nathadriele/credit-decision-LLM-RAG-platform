// =============================================================================
// VALIDATION CONFIGURATION - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import Joi from 'joi';

export const ValidationSchemas = {
  // User validation
  user: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    role: Joi.string().valid('ADMIN', 'CREDIT_MANAGER', 'CREDIT_ANALYST', 'RISK_ANALYST', 'COMPLIANCE_OFFICER', 'VIEWER').required(),
    permissions: Joi.array().items(Joi.string()).optional(),
  }),

  // Login validation
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  // Credit application validation
  creditApplication: Joi.object({
    requestedAmount: Joi.number().min(1000).max(10000000).required(),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'CAD', 'AUD').default('USD'),
    purpose: Joi.string().valid('PERSONAL', 'BUSINESS', 'AUTO', 'HOME', 'EDUCATION', 'DEBT_CONSOLIDATION', 'MEDICAL', 'OTHER').required(),
    termMonths: Joi.number().min(6).max(360).required(),
    applicantData: Joi.object({
      personal: Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        dateOfBirth: Joi.date().required(),
        ssn: Joi.string().pattern(/^\d{3}-\d{2}-\d{4}$/).required(),
        email: Joi.string().email().required(),
        phone: Joi.string().required(),
        address: Joi.object({
          street: Joi.string().required(),
          city: Joi.string().required(),
          state: Joi.string().required(),
          zipCode: Joi.string().pattern(/^\d{5}(-\d{4})?$/).required(),
          country: Joi.string().required(),
          residenceType: Joi.string().valid('OWN', 'RENT', 'MORTGAGE', 'OTHER').required(),
          monthsAtAddress: Joi.number().min(0).required(),
        }).required(),
        maritalStatus: Joi.string().valid('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED').required(),
        dependents: Joi.number().min(0).required(),
        citizenship: Joi.string().required(),
      }).required(),
      financial: Joi.object({
        annualIncome: Joi.number().min(0).required(),
        monthlyIncome: Joi.number().min(0).required(),
        monthlyExpenses: Joi.number().min(0).required(),
        creditScore: Joi.number().min(300).max(850).required(),
        debtToIncomeRatio: Joi.number().min(0).max(1).required(),
        existingDebts: Joi.array().items(Joi.object({
          type: Joi.string().valid('CREDIT_CARD', 'MORTGAGE', 'AUTO_LOAN', 'STUDENT_LOAN', 'PERSONAL_LOAN', 'OTHER').required(),
          creditor: Joi.string().required(),
          balance: Joi.number().min(0).required(),
          monthlyPayment: Joi.number().min(0).required(),
          interestRate: Joi.number().min(0).max(1).required(),
        })).required(),
        assets: Joi.array().items(Joi.object({
          type: Joi.string().valid('CHECKING', 'SAVINGS', 'INVESTMENT', 'RETIREMENT', 'REAL_ESTATE', 'VEHICLE', 'OTHER').required(),
          description: Joi.string().required(),
          value: Joi.number().min(0).required(),
          liquid: Joi.boolean().required(),
        })).required(),
        bankingHistory: Joi.object({
          primaryBank: Joi.string().required(),
          accountAge: Joi.number().min(0).required(),
          averageBalance: Joi.number().min(0).required(),
          overdraftHistory: Joi.number().min(0).required(),
          returnedChecks: Joi.number().min(0).required(),
        }).required(),
      }).required(),
      employment: Joi.object({
        employerName: Joi.string().required(),
        jobTitle: Joi.string().required(),
        employmentType: Joi.string().valid('FULL_TIME', 'PART_TIME', 'CONTRACT', 'SELF_EMPLOYED', 'UNEMPLOYED', 'RETIRED').required(),
        monthsEmployed: Joi.number().min(0).required(),
        industryType: Joi.string().required(),
        supervisorName: Joi.string().optional(),
        supervisorPhone: Joi.string().optional(),
      }).required(),
    }).required(),
  }),

  // Pagination validation
  pagination: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  // Query validation
  query: Joi.object({
    q: Joi.string().min(1).max(1000).required(),
    collection: Joi.string().optional(),
    topK: Joi.number().min(1).max(20).default(5),
    enableCaching: Joi.boolean().default(true),
  }),
};
