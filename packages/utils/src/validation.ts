// =============================================================================
// VALIDATION UTILITIES - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import validator from 'validator';

export const ValidationUtils = {
  // Email validation
  isValidEmail: (email: string): boolean => {
    return validator.isEmail(email);
  },

  // Phone validation
  isValidPhone: (phone: string): boolean => {
    return validator.isMobilePhone(phone, 'any');
  },

  // SSN validation (US format)
  isValidSSN: (ssn: string): boolean => {
    const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
    return ssnRegex.test(ssn);
  },

  // Credit score validation
  isValidCreditScore: (score: number): boolean => {
    return score >= 300 && score <= 850;
  },

  // Amount validation
  isValidAmount: (amount: number): boolean => {
    return amount > 0 && amount <= 10000000;
  },

  // UUID validation
  isValidUUID: (uuid: string): boolean => {
    return validator.isUUID(uuid);
  },

  // ZIP code validation
  isValidZipCode: (zipCode: string): boolean => {
    const zipRegex = /^\d{5}(-\d{4})?$/;
    return zipRegex.test(zipCode);
  },

  // Date validation
  isValidDate: (date: string): boolean => {
    return validator.isISO8601(date);
  },

  // Password strength validation
  isStrongPassword: (password: string): boolean => {
    return validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    });
  },
};
