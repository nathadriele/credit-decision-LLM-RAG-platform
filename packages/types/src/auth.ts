// =============================================================================
// AUTHENTICATION & AUTHORIZATION TYPES
// =============================================================================

import { IBaseEntity } from './common';

// =============================================================================
// USER TYPES
// =============================================================================

export interface IUser extends IBaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  passwordHash: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  roles: IRole[];
  permissions: IPermission[];
  profile: IUserProfile;
  preferences: IUserPreferences;
  auditLog: IUserAuditEntry[];
}

export interface IUserProfile {
  avatar?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  manager?: string;
  location?: string;
  timezone: string;
  language: string;
  bio?: string;
}

export interface IUserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: INotificationPreferences;
  dashboard: IDashboardPreferences;
  privacy: IPrivacyPreferences;
}

export interface INotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  types: NotificationType[];
}

export enum NotificationType {
  CREDIT_DECISION = 'CREDIT_DECISION',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  POLICY_UPDATE = 'POLICY_UPDATE',
  TRAINING_REMINDER = 'TRAINING_REMINDER',
  SECURITY_ALERT = 'SECURITY_ALERT',
}

export interface IDashboardPreferences {
  layout: 'grid' | 'list';
  widgets: string[];
  refreshInterval: number;
  defaultFilters: Record<string, unknown>;
}

export interface IPrivacyPreferences {
  shareAnalytics: boolean;
  shareUsageData: boolean;
  allowTracking: boolean;
}

// =============================================================================
// ROLE & PERMISSION TYPES
// =============================================================================

export interface IRole extends IBaseEntity {
  name: string;
  description: string;
  permissions: IPermission[];
  isSystem: boolean;
  isActive: boolean;
}

export interface IPermission extends IBaseEntity {
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: IPermissionCondition[];
}

export interface IPermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains';
  value: unknown;
}

export enum SystemRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  CREDIT_ANALYST = 'CREDIT_ANALYST',
  RISK_MANAGER = 'RISK_MANAGER',
  UNDERWRITER = 'UNDERWRITER',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
  AUDITOR = 'AUDITOR',
  VIEWER = 'VIEWER',
}

export enum Permission {
  // User Management
  USER_CREATE = 'USER_CREATE',
  USER_READ = 'USER_READ',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',

  // Credit Applications
  APPLICATION_CREATE = 'APPLICATION_CREATE',
  APPLICATION_READ = 'APPLICATION_READ',
  APPLICATION_UPDATE = 'APPLICATION_UPDATE',
  APPLICATION_DELETE = 'APPLICATION_DELETE',
  APPLICATION_APPROVE = 'APPLICATION_APPROVE',
  APPLICATION_REJECT = 'APPLICATION_REJECT',

  // Risk Assessment
  RISK_ASSESSMENT_READ = 'RISK_ASSESSMENT_READ',
  RISK_ASSESSMENT_CREATE = 'RISK_ASSESSMENT_CREATE',
  RISK_ASSESSMENT_UPDATE = 'RISK_ASSESSMENT_UPDATE',

  // AI/LLM
  LLM_QUERY = 'LLM_QUERY',
  LLM_ADMIN = 'LLM_ADMIN',
  PROMPT_MANAGE = 'PROMPT_MANAGE',
  RAG_MANAGE = 'RAG_MANAGE',

  // System
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  AUDIT_LOG_READ = 'AUDIT_LOG_READ',
  MONITORING_READ = 'MONITORING_READ',
}

// =============================================================================
// AUTHENTICATION TYPES
// =============================================================================

export interface IAuthRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
}

export interface IAuthResponse {
  user: IUserSafe;
  tokens: ITokenPair;
  expiresAt: Date;
  requiresMfa: boolean;
}

export interface IUserSafe {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
  profile: IUserProfile;
  lastLoginAt?: Date;
}

export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ITokenPayload {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  iat: number;
  exp: number;
}

// =============================================================================
// SESSION TYPES
// =============================================================================

export interface ISession extends IBaseEntity {
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: Date;
  lastActivity: Date;
  metadata: ISessionMetadata;
}

export interface ISessionMetadata {
  device: string;
  browser: string;
  os: string;
  location?: IGeolocation;
  loginMethod: LoginMethod;
}

export interface IGeolocation {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
}

export enum LoginMethod {
  PASSWORD = 'PASSWORD',
  SSO = 'SSO',
  MFA = 'MFA',
  API_KEY = 'API_KEY',
}

// =============================================================================
// MULTI-FACTOR AUTHENTICATION
// =============================================================================

export interface IMfaSetup {
  userId: string;
  method: MfaMethod;
  secret: string;
  backupCodes: string[];
  isEnabled: boolean;
  verifiedAt?: Date;
}

export enum MfaMethod {
  TOTP = 'TOTP',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  BACKUP_CODES = 'BACKUP_CODES',
}

export interface IMfaChallenge {
  challengeId: string;
  userId: string;
  method: MfaMethod;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

// =============================================================================
// PASSWORD RESET
// =============================================================================

export interface IPasswordResetRequest {
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  ipAddress: string;
}

export interface IPasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// =============================================================================
// AUDIT TYPES
// =============================================================================

export interface IUserAuditEntry {
  timestamp: Date;
  action: UserAction;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}

export enum UserAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  MFA_ENABLE = 'MFA_ENABLE',
  MFA_DISABLE = 'MFA_DISABLE',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  PERMISSION_GRANT = 'PERMISSION_GRANT',
  PERMISSION_REVOKE = 'PERMISSION_REVOKE',
  ROLE_ASSIGN = 'ROLE_ASSIGN',
  ROLE_REMOVE = 'ROLE_REMOVE',
  ACCOUNT_LOCK = 'ACCOUNT_LOCK',
  ACCOUNT_UNLOCK = 'ACCOUNT_UNLOCK',
}

// =============================================================================
// API KEY TYPES
// =============================================================================

export interface IApiKey extends IBaseEntity {
  name: string;
  keyHash: string;
  userId: string;
  permissions: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
  rateLimit?: IRateLimit;
  ipWhitelist?: string[];
}

export interface IRateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

// =============================================================================
// SSO TYPES
// =============================================================================

export interface ISsoProvider extends IBaseEntity {
  name: string;
  type: SsoProviderType;
  isActive: boolean;
  configuration: ISsoConfiguration;
  attributeMapping: IAttributeMapping;
}

export enum SsoProviderType {
  SAML = 'SAML',
  OIDC = 'OIDC',
  OAUTH2 = 'OAUTH2',
  LDAP = 'LDAP',
}

export interface ISsoConfiguration {
  clientId: string;
  clientSecret: string;
  issuer: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  redirectUri: string;
}

export interface IAttributeMapping {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  roles?: string;
  department?: string;
  jobTitle?: string;
}
