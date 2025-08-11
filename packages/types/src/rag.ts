// =============================================================================
// RAG (Retrieval-Augmented Generation) TYPES
// =============================================================================

import { IBaseEntity } from './common';

// =============================================================================
// DOCUMENT TYPES
// =============================================================================

export interface IRAGDocument extends IBaseEntity {
  title: string;
  content: string;
  source: string;
  sourceType: DocumentSourceType;
  metadata: IDocumentMetadata;
  chunks: IDocumentChunk[];
  embeddings?: IEmbedding[];
  status: DocumentProcessingStatus;
  tags: string[];
  category: DocumentCategory;
  language: string;
  version: string;
}

export enum DocumentSourceType {
  FILE_UPLOAD = 'FILE_UPLOAD',
  WEB_SCRAPING = 'WEB_SCRAPING',
  API_IMPORT = 'API_IMPORT',
  DATABASE_SYNC = 'DATABASE_SYNC',
  EMAIL = 'EMAIL',
  MANUAL_ENTRY = 'MANUAL_ENTRY',
}

export enum DocumentProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  CHUNKED = 'CHUNKED',
  EMBEDDED = 'EMBEDDED',
  INDEXED = 'INDEXED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

export enum DocumentCategory {
  POLICY = 'POLICY',
  REGULATION = 'REGULATION',
  PROCEDURE = 'PROCEDURE',
  KNOWLEDGE_BASE = 'KNOWLEDGE_BASE',
  TRAINING_MATERIAL = 'TRAINING_MATERIAL',
  CASE_STUDY = 'CASE_STUDY',
  FAQ = 'FAQ',
  LEGAL = 'LEGAL',
  TECHNICAL = 'TECHNICAL',
  BUSINESS = 'BUSINESS',
}

export interface IDocumentMetadata {
  author?: string;
  createdDate?: Date;
  lastModified?: Date;
  fileSize?: number;
  mimeType?: string;
  url?: string;
  department?: string;
  confidentialityLevel?: ConfidentialityLevel;
  expirationDate?: Date;
  keywords?: string[];
  summary?: string;
  customFields?: Record<string, unknown>;
}

export enum ConfidentialityLevel {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
}

// =============================================================================
// DOCUMENT CHUNKING TYPES
// =============================================================================

export interface IDocumentChunk extends IBaseEntity {
  documentId: string;
  content: string;
  chunkIndex: number;
  startPosition: number;
  endPosition: number;
  tokenCount: number;
  embedding?: IEmbedding;
  metadata: IChunkMetadata;
}

export interface IChunkMetadata {
  section?: string;
  subsection?: string;
  pageNumber?: number;
  paragraphIndex?: number;
  headings?: string[];
  tables?: ITableData[];
  images?: IImageData[];
  links?: string[];
  importance?: number;
}

export interface ITableData {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface IImageData {
  url: string;
  altText?: string;
  caption?: string;
  description?: string;
}

// =============================================================================
// EMBEDDING TYPES
// =============================================================================

export interface IEmbedding {
  id: string;
  vector: number[];
  model: string;
  dimension: number;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface IEmbeddingModel {
  name: string;
  provider: EmbeddingProvider;
  dimension: number;
  maxTokens: number;
  costPerToken: number;
  isActive: boolean;
  configuration: Record<string, unknown>;
}

export enum EmbeddingProvider {
  OPENAI = 'OPENAI',
  BEDROCK = 'BEDROCK',
  HUGGINGFACE = 'HUGGINGFACE',
  COHERE = 'COHERE',
  SENTENCE_TRANSFORMERS = 'SENTENCE_TRANSFORMERS',
}

// =============================================================================
// VECTOR DATABASE TYPES
// =============================================================================

export interface IVectorDatabase {
  type: VectorDatabaseType;
  configuration: IVectorDatabaseConfig;
  collections: IVectorCollection[];
  status: VectorDatabaseStatus;
}

export enum VectorDatabaseType {
  FAISS = 'FAISS',
  PINECONE = 'PINECONE',
  CHROMADB = 'CHROMADB',
  WEAVIATE = 'WEAVIATE',
  QDRANT = 'QDRANT',
  MILVUS = 'MILVUS',
}

export interface IVectorDatabaseConfig {
  host?: string;
  port?: number;
  apiKey?: string;
  indexName?: string;
  namespace?: string;
  dimension: number;
  metric: SimilarityMetric;
  replicas?: number;
  shards?: number;
}

export enum SimilarityMetric {
  COSINE = 'COSINE',
  EUCLIDEAN = 'EUCLIDEAN',
  DOT_PRODUCT = 'DOT_PRODUCT',
  MANHATTAN = 'MANHATTAN',
}

export enum VectorDatabaseStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  MAINTENANCE = 'MAINTENANCE',
}

export interface IVectorCollection {
  name: string;
  dimension: number;
  metric: SimilarityMetric;
  documentCount: number;
  indexSize: number;
  lastUpdated: Date;
  metadata: Record<string, unknown>;
}

// =============================================================================
// SEARCH AND RETRIEVAL TYPES
// =============================================================================

export interface ISearchQuery {
  query: string;
  filters?: ISearchFilter[];
  limit?: number;
  threshold?: number;
  includeMetadata?: boolean;
  rerank?: boolean;
  hybridSearch?: IHybridSearchConfig;
}

export interface ISearchFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export enum FilterOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  CONTAINS = 'CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
}

export interface IHybridSearchConfig {
  semanticWeight: number;
  keywordWeight: number;
  enableReranking: boolean;
  rerankingModel?: string;
}

export interface ISearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
  highlights?: string[];
  explanation?: string;
}

export interface ISearchResponse {
  query: string;
  results: ISearchResult[];
  totalResults: number;
  searchTime: number;
  metadata: ISearchMetadata;
}

export interface ISearchMetadata {
  model: string;
  filters: ISearchFilter[];
  threshold: number;
  retrievalMethod: RetrievalMethod;
  rerankingApplied: boolean;
  cacheHit: boolean;
}

export enum RetrievalMethod {
  SEMANTIC = 'SEMANTIC',
  KEYWORD = 'KEYWORD',
  HYBRID = 'HYBRID',
  GRAPH = 'GRAPH',
}

// =============================================================================
// RAG PIPELINE TYPES
// =============================================================================

export interface IRAGPipeline extends IBaseEntity {
  name: string;
  description: string;
  configuration: IRAGConfiguration;
  status: PipelineStatus;
  metrics: IRAGMetrics;
  lastRun?: Date;
  nextRun?: Date;
}

export interface IRAGConfiguration {
  documentSources: IDocumentSource[];
  chunkingStrategy: IChunkingStrategy;
  embeddingModel: string;
  vectorDatabase: IVectorDatabaseConfig;
  retrievalSettings: IRetrievalSettings;
  generationSettings: IGenerationSettings;
  postProcessing: IPostProcessingSettings;
}

export interface IDocumentSource {
  type: DocumentSourceType;
  configuration: Record<string, unknown>;
  schedule?: ICronSchedule;
  filters?: IDocumentFilter[];
}

export interface IDocumentFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface ICronSchedule {
  expression: string;
  timezone: string;
  enabled: boolean;
}

export interface IChunkingStrategy {
  method: ChunkingMethod;
  chunkSize: number;
  chunkOverlap: number;
  preserveStructure: boolean;
  customSeparators?: string[];
}

export enum ChunkingMethod {
  FIXED_SIZE = 'FIXED_SIZE',
  SENTENCE = 'SENTENCE',
  PARAGRAPH = 'PARAGRAPH',
  SEMANTIC = 'SEMANTIC',
  RECURSIVE = 'RECURSIVE',
  CUSTOM = 'CUSTOM',
}

export interface IRetrievalSettings {
  topK: number;
  threshold: number;
  rerankingEnabled: boolean;
  rerankingModel?: string;
  diversityPenalty?: number;
  temporalWeighting?: boolean;
}

export interface IGenerationSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  contextWindow: number;
  citationStyle: CitationStyle;
}

export enum CitationStyle {
  NONE = 'NONE',
  INLINE = 'INLINE',
  FOOTNOTE = 'FOOTNOTE',
  BIBLIOGRAPHY = 'BIBLIOGRAPHY',
}

export interface IPostProcessingSettings {
  factChecking: boolean;
  toxicityFiltering: boolean;
  biasDetection: boolean;
  confidenceScoring: boolean;
  customValidators?: string[];
}

export enum PipelineStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  RUNNING = 'RUNNING',
  ERROR = 'ERROR',
  MAINTENANCE = 'MAINTENANCE',
}

// =============================================================================
// RAG EXECUTION TYPES
// =============================================================================

export interface IRAGExecution extends IBaseEntity {
  pipelineId: string;
  query: string;
  retrievedDocuments: IRetrievedDocument[];
  generatedResponse: string;
  confidence: number;
  executionTime: number;
  metadata: IRAGExecutionMetadata;
}

export interface IRetrievedDocument {
  documentId: string;
  chunkId: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
  used: boolean;
}

export interface IRAGExecutionMetadata {
  retrievalTime: number;
  generationTime: number;
  totalTokens: number;
  cost: number;
  model: string;
  temperature: number;
  citations: ICitation[];
  warnings?: string[];
}

export interface ICitation {
  source: string;
  title: string;
  url?: string;
  relevanceScore: number;
  excerpt: string;
  pageNumber?: number;
  section?: string;
}

// =============================================================================
// RAG METRICS TYPES
// =============================================================================

export interface IRAGMetrics {
  accuracy: number;
  relevance: number;
  completeness: number;
  latency: number;
  throughput: number;
  cost: number;
  userSatisfaction?: number;
  timestamp: Date;
}

export interface IRAGEvaluation extends IBaseEntity {
  executionId: string;
  evaluationType: EvaluationType;
  metrics: IEvaluationMetrics;
  feedback?: string;
  evaluatedBy: string;
}

export enum EvaluationType {
  AUTOMATIC = 'AUTOMATIC',
  HUMAN = 'HUMAN',
  HYBRID = 'HYBRID',
}

export interface IEvaluationMetrics {
  relevance: number;
  accuracy: number;
  completeness: number;
  coherence: number;
  groundedness: number;
  helpfulness: number;
  safety: number;
}
