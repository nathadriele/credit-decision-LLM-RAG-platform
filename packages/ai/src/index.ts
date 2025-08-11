// =============================================================================
// AI PACKAGE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

export * from './embeddings';
export * from './llm';
export * from './prompts';
export * from './rag';
export * from './utils';
export * from './vector-db';

// Advanced Services
export * from './document-ingestion';
export * from './langchain';
export * from './rag/enhanced-rag';
export * from './retrieval';

// =============================================================================
// MAIN AI SERVICE CLASS
// =============================================================================

import { EmbeddingService } from './embeddings';
import { LLMService } from './llm';
import { PromptService } from './prompts';
import { RAGService } from './rag';
import { VectorDatabaseService } from './vector-db';

export interface IAIServiceConfig {
  vectorDb: {
    type: 'chromadb' | 'faiss' | 'pinecone';
    config: Record<string, unknown>;
  };
  embedding: {
    provider: 'openai' | 'huggingface';
    model: string;
    apiKey?: string;
  };
  llm: {
    provider: 'openai' | 'bedrock';
    model: string;
    apiKey?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export class AIService {
  private vectorDb: VectorDatabaseService;
  private embedding: EmbeddingService;
  private llm: LLMService;
  private rag: RAGService;
  private prompts: PromptService;

  constructor(config: IAIServiceConfig) {
    // Initialize services
    this.vectorDb = new VectorDatabaseService(config.vectorDb);
    this.embedding = new EmbeddingService(config.embedding);
    this.llm = new LLMService(config.llm);
    this.prompts = new PromptService();
    
    // Initialize RAG service with dependencies
    this.rag = new RAGService({
      vectorDb: this.vectorDb,
      embedding: this.embedding,
      llm: this.llm,
      prompts: this.prompts
    });
  }

  /**
   * Get the vector database service
   */
  getVectorDb(): VectorDatabaseService {
    return this.vectorDb;
  }

  /**
   * Get the embedding service
   */
  getEmbedding(): EmbeddingService {
    return this.embedding;
  }

  /**
   * Get the LLM service
   */
  getLLM(): LLMService {
    return this.llm;
  }

  /**
   * Get the RAG service
   */
  getRAG(): RAGService {
    return this.rag;
  }

  /**
   * Get the prompt service
   */
  getPrompts(): PromptService {
    return this.prompts;
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    await this.vectorDb.initialize();
    await this.embedding.initialize();
    await this.llm.initialize();
    await this.rag.initialize();
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{
    vectorDb: boolean;
    embedding: boolean;
    llm: boolean;
    rag: boolean;
  }> {
    const [vectorDbHealth, embeddingHealth, llmHealth, ragHealth] = await Promise.allSettled([
      this.vectorDb.healthCheck(),
      this.embedding.healthCheck(),
      this.llm.healthCheck(),
      this.rag.healthCheck()
    ]);

    return {
      vectorDb: vectorDbHealth.status === 'fulfilled' && vectorDbHealth.value,
      embedding: embeddingHealth.status === 'fulfilled' && embeddingHealth.value,
      llm: llmHealth.status === 'fulfilled' && llmHealth.value,
      rag: ragHealth.status === 'fulfilled' && ragHealth.value
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await Promise.allSettled([
      this.vectorDb.cleanup(),
      this.embedding.cleanup(),
      this.llm.cleanup(),
      this.rag.cleanup()
    ]);
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createAIService(config: IAIServiceConfig): AIService {
  return new AIService(config);
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

export const DEFAULT_AI_CONFIG: IAIServiceConfig = {
  vectorDb: {
    type: 'chromadb',
    config: {
      host: 'localhost',
      port: 8000,
      authToken: 'test-token'
    }
  },
  embedding: {
    provider: 'openai',
    model: 'text-embedding-ada-002'
  },
  llm: {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.1,
    maxTokens: 4096
  }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function validateAIConfig(config: IAIServiceConfig): boolean {
  // Validate vector database config
  if (!config.vectorDb || !config.vectorDb.type || !config.vectorDb.config) {
    return false;
  }

  // Validate embedding config
  if (!config.embedding || !config.embedding.provider || !config.embedding.model) {
    return false;
  }

  // Validate LLM config
  if (!config.llm || !config.llm.provider || !config.llm.model) {
    return false;
  }

  return true;
}

export function mergeAIConfig(
  baseConfig: IAIServiceConfig,
  overrides: Partial<IAIServiceConfig>
): IAIServiceConfig {
  return {
    vectorDb: { ...baseConfig.vectorDb, ...overrides.vectorDb },
    embedding: { ...baseConfig.embedding, ...overrides.embedding },
    llm: { ...baseConfig.llm, ...overrides.llm }
  };
}
