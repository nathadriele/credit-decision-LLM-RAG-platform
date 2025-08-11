// =============================================================================
// CONSTANTS - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

export const APPLICATION_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RISK_ASSESSMENT: 'RISK_ASSESSMENT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  DECISION_PENDING: 'DECISION_PENDING',
  APPROVED: 'APPROVED',
  DECLINED: 'DECLINED',
  CONDITIONAL_APPROVAL: 'CONDITIONAL_APPROVAL',
  COUNTER_OFFER: 'COUNTER_OFFER',
} as const;

export const DECISION_TYPE = {
  APPROVED: 'APPROVED',
  DECLINED: 'DECLINED',
  CONDITIONAL_APPROVAL: 'CONDITIONAL_APPROVAL',
  COUNTER_OFFER: 'COUNTER_OFFER',
  PENDING_REVIEW: 'PENDING_REVIEW',
} as const;

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  CREDIT_MANAGER: 'CREDIT_MANAGER',
  CREDIT_ANALYST: 'CREDIT_ANALYST',
  RISK_ANALYST: 'RISK_ANALYST',
  COMPLIANCE_OFFICER: 'COMPLIANCE_OFFICER',
  VIEWER: 'VIEWER',
} as const;

export const LOAN_PURPOSE = {
  PERSONAL: 'PERSONAL',
  BUSINESS: 'BUSINESS',
  AUTO: 'AUTO',
  HOME: 'HOME',
  EDUCATION: 'EDUCATION',
  DEBT_CONSOLIDATION: 'DEBT_CONSOLIDATION',
  MEDICAL: 'MEDICAL',
  OTHER: 'OTHER',
} as const;

export const EMPLOYMENT_TYPE = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  CONTRACT: 'CONTRACT',
  SELF_EMPLOYED: 'SELF_EMPLOYED',
  UNEMPLOYED: 'UNEMPLOYED',
  RETIRED: 'RETIRED',
} as const;

export const MARITAL_STATUS = {
  SINGLE: 'SINGLE',
  MARRIED: 'MARRIED',
  DIVORCED: 'DIVORCED',
  WIDOWED: 'WIDOWED',
  SEPARATED: 'SEPARATED',
} as const;

export const RESIDENCE_TYPE = {
  OWN: 'OWN',
  RENT: 'RENT',
  MORTGAGE: 'MORTGAGE',
  OTHER: 'OTHER',
} as const;

export const DEBT_TYPE = {
  CREDIT_CARD: 'CREDIT_CARD',
  MORTGAGE: 'MORTGAGE',
  AUTO_LOAN: 'AUTO_LOAN',
  STUDENT_LOAN: 'STUDENT_LOAN',
  PERSONAL_LOAN: 'PERSONAL_LOAN',
  OTHER: 'OTHER',
} as const;

export const ASSET_TYPE = {
  CHECKING: 'CHECKING',
  SAVINGS: 'SAVINGS',
  INVESTMENT: 'INVESTMENT',
  RETIREMENT: 'RETIREMENT',
  REAL_ESTATE: 'REAL_ESTATE',
  VEHICLE: 'VEHICLE',
  OTHER: 'OTHER',
} as const;

export const RISK_GRADE = {
  AAA: 'AAA',
  AA: 'AA',
  A: 'A',
  BBB: 'BBB',
  BB: 'BB',
  B: 'B',
  CCC: 'CCC',
} as const;

export const CURRENCY = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  CAD: 'CAD',
  AUD: 'AUD',
} as const;

export const PERMISSIONS = {
  // Application permissions
  APPLICATIONS_VIEW: 'applications:view',
  APPLICATIONS_CREATE: 'applications:create',
  APPLICATIONS_UPDATE: 'applications:update',
  APPLICATIONS_DELETE: 'applications:delete',
  
  // Decision permissions
  DECISIONS_MAKE: 'decisions:make',
  DECISIONS_REVIEW: 'decisions:review',
  DECISIONS_OVERRIDE: 'decisions:override',
  
  // User permissions
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  
  // System permissions
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_MONITOR: 'system:monitor',
  SYSTEM_BACKUP: 'system:backup',
  
  // AI permissions
  AI_CONFIGURE: 'ai:configure',
  AI_TRAIN: 'ai:train',
  AI_MONITOR: 'ai:monitor',
} as const;

export const API_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_REQUEST_SIZE: 50 * 1024 * 1024, // 50MB
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  MAX_PAGINATION_LIMIT: 100,
  DEFAULT_PAGINATION_LIMIT: 20,
} as const;

export const VALIDATION_LIMITS = {
  MIN_CREDIT_SCORE: 300,
  MAX_CREDIT_SCORE: 850,
  MIN_LOAN_AMOUNT: 1000,
  MAX_LOAN_AMOUNT: 10000000,
  MIN_LOAN_TERM: 6,
  MAX_LOAN_TERM: 360,
  MAX_DTI_RATIO: 1.0,
  MIN_AGE: 18,
  MAX_AGE: 100,
} as const;
