// =============================================================================
// CREDIT DECISION TYPES
// =============================================================================

import { IBaseEntity } from './common';

// =============================================================================
// CREDIT APPLICATION TYPES
// =============================================================================

export interface ICreditApplication extends IBaseEntity {
  applicantId: string;
  applicationNumber: string;
  status: CreditApplicationStatus;
  requestedAmount: number;
  currency: string;
  purpose: CreditPurpose;
  term: number; // in months
  interestRate?: number;
  applicantData: IApplicantData;
  documents: IDocument[];
  creditDecision?: ICreditDecision;
  riskAssessment?: IRiskAssessment;
  auditTrail: IAuditEntry[];
}

export enum CreditApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PENDING_DOCUMENTS = 'PENDING_DOCUMENTS',
  AI_ANALYSIS = 'AI_ANALYSIS',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum CreditPurpose {
  PERSONAL = 'PERSONAL',
  BUSINESS = 'BUSINESS',
  MORTGAGE = 'MORTGAGE',
  AUTO = 'AUTO',
  EDUCATION = 'EDUCATION',
  DEBT_CONSOLIDATION = 'DEBT_CONSOLIDATION',
  HOME_IMPROVEMENT = 'HOME_IMPROVEMENT',
  OTHER = 'OTHER',
}

// =============================================================================
// APPLICANT DATA TYPES
// =============================================================================

export interface IApplicantData {
  personal: IPersonalInfo;
  financial: IFinancialInfo;
  employment: IEmploymentInfo;
  creditHistory: ICreditHistory;
  assets: IAsset[];
  liabilities: ILiability[];
  references?: IReference[];
}

export interface IPersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  ssn: string;
  email: string;
  phone: string;
  address: IAddress;
  maritalStatus: MaritalStatus;
  dependents: number;
  citizenship: string;
}

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  residenceType: ResidenceType;
  monthsAtAddress: number;
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
  SEPARATED = 'SEPARATED',
}

export enum ResidenceType {
  OWN = 'OWN',
  RENT = 'RENT',
  MORTGAGE = 'MORTGAGE',
  FAMILY = 'FAMILY',
  OTHER = 'OTHER',
}

export interface IFinancialInfo {
  annualIncome: number;
  monthlyIncome: number;
  otherIncome?: number;
  monthlyExpenses: number;
  bankAccounts: IBankAccount[];
  creditScore?: number;
  debtToIncomeRatio?: number;
}

export interface IBankAccount {
  bankName: string;
  accountType: AccountType;
  balance: number;
  monthsOpen: number;
}

export enum AccountType {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS',
  MONEY_MARKET = 'MONEY_MARKET',
  CD = 'CD',
  INVESTMENT = 'INVESTMENT',
}

export interface IEmploymentInfo {
  employerName: string;
  jobTitle: string;
  employmentType: EmploymentType;
  monthsEmployed: number;
  supervisorName?: string;
  supervisorPhone?: string;
  previousEmployment?: IPreviousEmployment[];
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  SELF_EMPLOYED = 'SELF_EMPLOYED',
  UNEMPLOYED = 'UNEMPLOYED',
  RETIRED = 'RETIRED',
  STUDENT = 'STUDENT',
}

export interface IPreviousEmployment {
  employerName: string;
  jobTitle: string;
  startDate: Date;
  endDate: Date;
  reasonForLeaving: string;
}

// =============================================================================
// CREDIT HISTORY TYPES
// =============================================================================

export interface ICreditHistory {
  creditScore: number;
  creditScoreDate: Date;
  creditReportDate: Date;
  tradelines: ITradeline[];
  inquiries: ICreditInquiry[];
  publicRecords: IPublicRecord[];
  collections: ICollection[];
}

export interface ITradeline {
  creditorName: string;
  accountType: string;
  accountStatus: string;
  creditLimit: number;
  currentBalance: number;
  monthlyPayment: number;
  paymentHistory: string;
  dateOpened: Date;
  lastActivity: Date;
}

export interface ICreditInquiry {
  creditorName: string;
  inquiryDate: Date;
  inquiryType: 'hard' | 'soft';
}

export interface IPublicRecord {
  type: string;
  amount: number;
  date: Date;
  status: string;
}

export interface ICollection {
  creditorName: string;
  originalAmount: number;
  currentBalance: number;
  dateReported: Date;
  status: string;
}

// =============================================================================
// ASSETS AND LIABILITIES
// =============================================================================

export interface IAsset {
  type: AssetType;
  description: string;
  value: number;
  ownership: OwnershipType;
}

export enum AssetType {
  REAL_ESTATE = 'REAL_ESTATE',
  VEHICLE = 'VEHICLE',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  INVESTMENT = 'INVESTMENT',
  RETIREMENT = 'RETIREMENT',
  PERSONAL_PROPERTY = 'PERSONAL_PROPERTY',
  OTHER = 'OTHER',
}

export enum OwnershipType {
  SOLE = 'SOLE',
  JOINT = 'JOINT',
  COMMUNITY = 'COMMUNITY',
}

export interface ILiability {
  type: LiabilityType;
  creditorName: string;
  currentBalance: number;
  monthlyPayment: number;
  remainingTerm?: number;
}

export enum LiabilityType {
  MORTGAGE = 'MORTGAGE',
  AUTO_LOAN = 'AUTO_LOAN',
  CREDIT_CARD = 'CREDIT_CARD',
  STUDENT_LOAN = 'STUDENT_LOAN',
  PERSONAL_LOAN = 'PERSONAL_LOAN',
  OTHER = 'OTHER',
}

// =============================================================================
// CREDIT DECISION TYPES
// =============================================================================

export interface ICreditDecision extends IBaseEntity {
  applicationId: string;
  decision: CreditDecisionType;
  approvedAmount?: number;
  interestRate?: number;
  term?: number;
  conditions?: string[];
  reasons: string[];
  confidence: number;
  aiRecommendation: IAIRecommendation;
  humanReview?: IHumanReview;
  policyViolations?: IPolicyViolation[];
}

export enum CreditDecisionType {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONDITIONAL_APPROVAL = 'CONDITIONAL_APPROVAL',
  REFER_TO_HUMAN = 'REFER_TO_HUMAN',
}

export interface IAIRecommendation {
  decision: CreditDecisionType;
  confidence: number;
  reasoning: string[];
  riskFactors: string[];
  mitigatingFactors: string[];
  suggestedConditions?: string[];
  modelVersion: string;
  processingTime: number;
}

export interface IHumanReview {
  reviewerId: string;
  reviewerName: string;
  reviewDate: Date;
  decision: CreditDecisionType;
  notes: string;
  overrideReason?: string;
}

export interface IPolicyViolation {
  policyId: string;
  policyName: string;
  violationType: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// =============================================================================
// RISK ASSESSMENT TYPES
// =============================================================================

export interface IRiskAssessment extends IBaseEntity {
  applicationId: string;
  overallRiskScore: number;
  riskGrade: RiskGrade;
  riskFactors: IRiskFactor[];
  probabilityOfDefault: number;
  expectedLoss: number;
  riskMitigants: string[];
  modelOutputs: IModelOutput[];
}

export enum RiskGrade {
  AAA = 'AAA',
  AA = 'AA',
  A = 'A',
  BBB = 'BBB',
  BB = 'BB',
  B = 'B',
  CCC = 'CCC',
  CC = 'CC',
  C = 'C',
  D = 'D',
}

export interface IRiskFactor {
  category: RiskCategory;
  factor: string;
  impact: number;
  weight: number;
  description: string;
}

export enum RiskCategory {
  CREDIT_HISTORY = 'CREDIT_HISTORY',
  INCOME_STABILITY = 'INCOME_STABILITY',
  DEBT_BURDEN = 'DEBT_BURDEN',
  EMPLOYMENT = 'EMPLOYMENT',
  COLLATERAL = 'COLLATERAL',
  BEHAVIORAL = 'BEHAVIORAL',
  EXTERNAL = 'EXTERNAL',
}

export interface IModelOutput {
  modelName: string;
  modelVersion: string;
  score: number;
  features: Record<string, number>;
  explanation: string;
}

// =============================================================================
// DOCUMENT TYPES
// =============================================================================

export interface IDocument extends IBaseEntity {
  applicationId: string;
  type: DocumentType;
  name: string;
  description?: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  status: DocumentStatus;
  extractedData?: Record<string, unknown>;
  verificationStatus?: VerificationStatus;
  uploadedBy: string;
}

export enum DocumentType {
  IDENTITY = 'IDENTITY',
  INCOME_VERIFICATION = 'INCOME_VERIFICATION',
  BANK_STATEMENT = 'BANK_STATEMENT',
  TAX_RETURN = 'TAX_RETURN',
  EMPLOYMENT_VERIFICATION = 'EMPLOYMENT_VERIFICATION',
  ASSET_VERIFICATION = 'ASSET_VERIFICATION',
  CREDIT_REPORT = 'CREDIT_REPORT',
  OTHER = 'OTHER',
}

export enum DocumentStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

// =============================================================================
// REFERENCE TYPES
// =============================================================================

export interface IReference {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  yearsKnown: number;
}

// =============================================================================
// AUDIT TRAIL TYPES
// =============================================================================

export interface IAuditEntry {
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}
