// =============================================================================
// LLM (Large Language Model) TYPES
// =============================================================================

import { IBaseEntity } from './common';

// =============================================================================
// LLM PROVIDER TYPES
// =============================================================================

export enum LLMProvider {
  OPENAI = 'OPENAI',
  BEDROCK = 'BEDROCK',
  AZURE_OPENAI = 'AZURE_OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  HUGGINGFACE = 'HUGGINGFACE',
}

export interface ILLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number;
  retries?: number;
}

// =============================================================================
// PROMPT TYPES
// =============================================================================

export interface IPrompt extends IBaseEntity {
  name: string;
  description: string;
  category: PromptCategory;
  template: string;
  variables: IPromptVariable[];
  version: string;
  isActive: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
}

export enum PromptCategory {
  CREDIT_ANALYSIS = 'CREDIT_ANALYSIS',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  DOCUMENT_EXTRACTION = 'DOCUMENT_EXTRACTION',
  DECISION_EXPLANATION = 'DECISION_EXPLANATION',
  POLICY_COMPLIANCE = 'POLICY_COMPLIANCE',
  CUSTOMER_COMMUNICATION = 'CUSTOMER_COMMUNICATION',
  FRAUD_DETECTION = 'FRAUD_DETECTION',
  GENERAL = 'GENERAL',
}

export interface IPromptVariable {
  name: string;
  type: PromptVariableType;
  description: string;
  required: boolean;
  defaultValue?: string;
  validation?: IPromptVariableValidation;
}

export enum PromptVariableType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
  DATE = 'DATE',
}

export interface IPromptVariableValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  enum?: string[];
}

// =============================================================================
// LLM REQUEST/RESPONSE TYPES
// =============================================================================

export interface ILLMRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ILLMResponse {
  id: string;
  content: string;
  finishReason: LLMFinishReason;
  usage: ILLMUsage;
  model: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export enum LLMFinishReason {
  STOP = 'STOP',
  LENGTH = 'LENGTH',
  CONTENT_FILTER = 'CONTENT_FILTER',
  ERROR = 'ERROR',
}

export interface ILLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

// =============================================================================
// CONVERSATION TYPES
// =============================================================================

export interface IConversation extends IBaseEntity {
  sessionId: string;
  userId: string;
  title: string;
  context: ConversationContext;
  messages: IMessage[];
  metadata: Record<string, unknown>;
  isActive: boolean;
}

export enum ConversationContext {
  CREDIT_APPLICATION = 'CREDIT_APPLICATION',
  RISK_ANALYSIS = 'RISK_ANALYSIS',
  CUSTOMER_SUPPORT = 'CUSTOMER_SUPPORT',
  POLICY_INQUIRY = 'POLICY_INQUIRY',
  GENERAL = 'GENERAL',
}

export interface IMessage extends IBaseEntity {
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: IMessageMetadata;
  attachments?: IMessageAttachment[];
}

export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
  FUNCTION = 'FUNCTION',
}

export interface IMessageMetadata {
  promptId?: string;
  ragContext?: string[];
  confidence?: number;
  processingTime?: number;
  modelUsed?: string;
  tokenUsage?: ILLMUsage;
  citations?: ICitation[];
}

export interface IMessageAttachment {
  type: AttachmentType;
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export enum AttachmentType {
  DOCUMENT = 'DOCUMENT',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  DATA = 'DATA',
}

export interface ICitation {
  source: string;
  title: string;
  url?: string;
  relevanceScore: number;
  excerpt: string;
}

// =============================================================================
// FUNCTION CALLING TYPES
// =============================================================================

export interface IFunctionDefinition {
  name: string;
  description: string;
  parameters: IFunctionParameters;
}

export interface IFunctionParameters {
  type: 'object';
  properties: Record<string, IFunctionProperty>;
  required?: string[];
}

export interface IFunctionProperty {
  type: string;
  description: string;
  enum?: string[];
  items?: IFunctionProperty;
  properties?: Record<string, IFunctionProperty>;
}

export interface IFunctionCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface IFunctionResult {
  name: string;
  result: unknown;
  error?: string;
}

// =============================================================================
// PROMPT ENGINEERING TYPES
// =============================================================================

export interface IPromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  examples: IPromptExample[];
  bestPractices: string[];
  version: string;
  category: PromptCategory;
}

export interface IPromptExample {
  input: Record<string, unknown>;
  expectedOutput: string;
  explanation: string;
}

export interface IPromptExecution extends IBaseEntity {
  promptId: string;
  templateVersion: string;
  input: Record<string, unknown>;
  generatedPrompt: string;
  response: ILLMResponse;
  evaluation?: IPromptEvaluation;
  context?: string;
}

export interface IPromptEvaluation {
  accuracy: number;
  relevance: number;
  coherence: number;
  completeness: number;
  safety: number;
  overallScore: number;
  feedback: string;
  evaluatedBy: string;
  evaluatedAt: Date;
}

// =============================================================================
// MODEL FINE-TUNING TYPES
// =============================================================================

export interface IFineTuningJob extends IBaseEntity {
  name: string;
  baseModel: string;
  trainingDataUrl: string;
  validationDataUrl?: string;
  hyperparameters: IHyperparameters;
  status: FineTuningStatus;
  progress: number;
  metrics?: ITrainingMetrics;
  resultingModel?: string;
  error?: string;
}

export enum FineTuningStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface IHyperparameters {
  learningRate: number;
  batchSize: number;
  epochs: number;
  warmupSteps?: number;
  weightDecay?: number;
  gradientClipping?: number;
}

export interface ITrainingMetrics {
  loss: number;
  accuracy: number;
  perplexity: number;
  bleuScore?: number;
  rougeScore?: number;
  validationLoss?: number;
  validationAccuracy?: number;
}

// =============================================================================
// CONTENT MODERATION TYPES
// =============================================================================

export interface IContentModerationResult {
  flagged: boolean;
  categories: IModerationCategory[];
  confidence: number;
  explanation?: string;
}

export interface IModerationCategory {
  category: string;
  flagged: boolean;
  score: number;
}

// =============================================================================
// LLM MONITORING TYPES
// =============================================================================

export interface ILLMMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  tokenUsage: ILLMUsage;
  costPerRequest: number;
  successRate: number;
  timestamp: Date;
}

export interface ILLMAlert {
  type: LLMAlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export enum LLMAlertType {
  HIGH_ERROR_RATE = 'HIGH_ERROR_RATE',
  SLOW_RESPONSE = 'SLOW_RESPONSE',
  HIGH_COST = 'HIGH_COST',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  CONTENT_VIOLATION = 'CONTENT_VIOLATION',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}
