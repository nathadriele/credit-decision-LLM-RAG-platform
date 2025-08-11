// =============================================================================
// VALIDATION MIDDLEWARE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationAppError } from './error-handler';
import { loggers } from '../utils/logger';

// =============================================================================
// VALIDATION MIDDLEWARE FACTORY
// =============================================================================

export function validate(schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: any[] = [];

    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: `body.${detail.path.join('.')}`,
          message: detail.message,
          value: detail.context?.value,
        })));
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: `query.${detail.path.join('.')}`,
          message: detail.message,
          value: detail.context?.value,
        })));
      }
    }

    // Validate route parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: `params.${detail.path.join('.')}`,
          message: detail.message,
          value: detail.context?.value,
        })));
      }
    }

    // Validate headers
    if (schema.headers) {
      const { error } = schema.headers.validate(req.headers, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: `headers.${detail.path.join('.')}`,
          message: detail.message,
          value: detail.context?.value,
        })));
      }
    }

    if (errors.length > 0) {
      loggers.api.warn('Validation failed', {
        errors,
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id,
      });

      throw new ValidationAppError('Validation failed', errors);
    }

    next();
  };
}

// =============================================================================
// COMMON VALIDATION SCHEMAS
// =============================================================================

export const commonSchemas = {
  // UUID parameter validation
  uuidParam: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  // Pagination query validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  // Search query validation
  search: Joi.object({
    q: Joi.string().min(1).max(500).optional(),
    filters: Joi.object().optional(),
  }),

  // Date range validation
  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  }),
};

// =============================================================================
// CREDIT APPLICATION VALIDATION SCHEMAS
// =============================================================================

export const creditApplicationSchemas = {
  create: Joi.object({
    applicantId: Joi.string().uuid().required(),
    requestedAmount: Joi.number().positive().max(10000000).required(),
    currency: Joi.string().length(3).uppercase().default('USD'),
    purpose: Joi.string().valid(
      'PERSONAL', 'BUSINESS', 'MORTGAGE', 'AUTO', 
      'EDUCATION', 'DEBT_CONSOLIDATION', 'HOME_IMPROVEMENT', 'OTHER'
    ).required(),
    termMonths: Joi.number().integer().min(1).max(360).required(),
    applicantData: Joi.object({
      personal: Joi.object({
        firstName: Joi.string().min(1).max(100).required(),
        lastName: Joi.string().min(1).max(100).required(),
        dateOfBirth: Joi.date().max('now').required(),
        ssn: Joi.string().pattern(/^\d{3}-\d{2}-\d{4}$/).required(),
        email: Joi.string().email().required(),
        phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).required(),
        address: Joi.object({
          street: Joi.string().required(),
          city: Joi.string().required(),
          state: Joi.string().length(2).required(),
          zipCode: Joi.string().pattern(/^\d{5}(-\d{4})?$/).required(),
          country: Joi.string().length(3).default('USA'),
          residenceType: Joi.string().valid('OWN', 'RENT', 'MORTGAGE', 'FAMILY', 'OTHER').required(),
          monthsAtAddress: Joi.number().integer().min(0).required(),
        }).required(),
        maritalStatus: Joi.string().valid('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED').required(),
        dependents: Joi.number().integer().min(0).required(),
        citizenship: Joi.string().required(),
      }).required(),
      financial: Joi.object({
        annualIncome: Joi.number().positive().required(),
        monthlyIncome: Joi.number().positive().required(),
        otherIncome: Joi.number().min(0).optional(),
        monthlyExpenses: Joi.number().min(0).required(),
        creditScore: Joi.number().integer().min(300).max(850).optional(),
        debtToIncomeRatio: Joi.number().min(0).max(1).optional(),
      }).required(),
      employment: Joi.object({
        employerName: Joi.string().required(),
        jobTitle: Joi.string().required(),
        employmentType: Joi.string().valid(
          'FULL_TIME', 'PART_TIME', 'CONTRACT', 'SELF_EMPLOYED', 
          'UNEMPLOYED', 'RETIRED', 'STUDENT'
        ).required(),
        monthsEmployed: Joi.number().integer().min(0).required(),
        supervisorName: Joi.string().optional(),
        supervisorPhone: Joi.string().optional(),
      }).required(),
    }).required(),
  }),

  update: Joi.object({
    status: Joi.string().valid(
      'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING_DOCUMENTS',
      'AI_ANALYSIS', 'MANUAL_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'
    ).optional(),
    requestedAmount: Joi.number().positive().max(10000000).optional(),
    termMonths: Joi.number().integer().min(1).max(360).optional(),
    applicantData: Joi.object().optional(),
  }),
};

// =============================================================================
// USER VALIDATION SCHEMAS
// =============================================================================

export const userSchemas = {
  create: Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
    password: Joi.string().min(8).max(128).pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    ).required().messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    }),
    roles: Joi.array().items(Joi.string().uuid()).optional(),
  }),

  update: Joi.object({
    firstName: Joi.string().min(1).max(100).optional(),
    lastName: Joi.string().min(1).max(100).optional(),
    email: Joi.string().email().optional(),
    isActive: Joi.boolean().optional(),
    roles: Joi.array().items(Joi.string().uuid()).optional(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    ).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
  }),
};

// =============================================================================
// AUTHENTICATION VALIDATION SCHEMAS
// =============================================================================

export const authSchemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    rememberMe: Joi.boolean().default(false),
  }),

  register: Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
    password: Joi.string().min(8).max(128).pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    ).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).max(128).pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    ).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  }),
};

// =============================================================================
// LLM/RAG VALIDATION SCHEMAS
// =============================================================================

export const llmSchemas = {
  query: Joi.object({
    prompt: Joi.string().min(1).max(10000).required(),
    model: Joi.string().optional(),
    temperature: Joi.number().min(0).max(2).optional(),
    maxTokens: Joi.number().integer().min(1).max(8000).optional(),
    context: Joi.object().optional(),
  }),

  ragQuery: Joi.object({
    query: Joi.string().min(1).max(1000).required(),
    collection: Joi.string().optional(),
    topK: Joi.number().integer().min(1).max(20).default(5),
    threshold: Joi.number().min(0).max(1).default(0.7),
    includeMetadata: Joi.boolean().default(true),
    rerank: Joi.boolean().default(false),
  }),
};

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

export function validateUUID(value: string, fieldName: string = 'ID'): void {
  const { error } = Joi.string().uuid().validate(value);
  if (error) {
    throw new ValidationAppError(`Invalid ${fieldName} format`);
  }
}

export function validateEmail(email: string): void {
  const { error } = Joi.string().email().validate(email);
  if (error) {
    throw new ValidationAppError('Invalid email format');
  }
}

export function validatePassword(password: string): void {
  const { error } = Joi.string().min(8).max(128).pattern(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  ).validate(password);
  
  if (error) {
    throw new ValidationAppError(
      'Password must be 8-128 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    );
  }
}

// =============================================================================
// SANITIZATION UTILITIES
// =============================================================================

export function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}
