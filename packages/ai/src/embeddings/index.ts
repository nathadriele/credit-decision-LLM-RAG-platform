// =============================================================================
// EMBEDDING SERVICE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import OpenAI from 'openai';

// =============================================================================
// EMBEDDING INTERFACES
// =============================================================================

export interface IEmbeddingConfig {
  provider: 'openai' | 'huggingface' | 'bedrock';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  batchSize?: number;
}

export interface IEmbeddingRequest {
  texts: string[];
  model?: string;
  dimensions?: number;
}

export interface IEmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
  processingTime: number;
}

export interface IEmbeddingService {
  initialize(): Promise<void>;
  generateEmbeddings(request: IEmbeddingRequest): Promise<IEmbeddingResponse>;
  generateSingleEmbedding(text: string, model?: string): Promise<number[]>;
  getModelInfo(): Promise<{
    model: string;
    dimension: number;
    maxTokens: number;
  }>;
  healthCheck(): Promise<boolean>;
  cleanup(): Promise<void>;
}

// =============================================================================
// EMBEDDING SERVICE IMPLEMENTATION
// =============================================================================

export class EmbeddingService implements IEmbeddingService {
  private config: IEmbeddingConfig;
  private openaiClient?: OpenAI;

  constructor(config: IEmbeddingConfig) {
    this.config = {
      maxTokens: 8191,
      batchSize: 100,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'openai':
          await this.initializeOpenAI();
          break;
        case 'huggingface':
          await this.initializeHuggingFace();
          break;
        case 'bedrock':
          await this.initializeBedrock();
          break;
        default:
          throw new Error(`Unsupported embedding provider: ${this.config.provider}`);
      }
    } catch (error) {
      throw new Error(`Failed to initialize embedding service: ${error.message}`);
    }
  }

  async generateEmbeddings(request: IEmbeddingRequest): Promise<IEmbeddingResponse> {
    const startTime = Date.now();

    try {
      switch (this.config.provider) {
        case 'openai':
          return await this.generateOpenAIEmbeddings(request, startTime);
        case 'huggingface':
          return await this.generateHuggingFaceEmbeddings(request, startTime);
        case 'bedrock':
          return await this.generateBedrockEmbeddings(request, startTime);
        default:
          throw new Error(`Unsupported embedding provider: ${this.config.provider}`);
      }
    } catch (error) {
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  async generateSingleEmbedding(text: string, model?: string): Promise<number[]> {
    const response = await this.generateEmbeddings({
      texts: [text],
      model: model || this.config.model,
    });

    return response.embeddings[0];
  }

  async getModelInfo(): Promise<{
    model: string;
    dimension: number;
    maxTokens: number;
  }> {
    const dimensionMap: Record<string, number> = {
      'text-embedding-ada-002': 1536,
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
    };

    return {
      model: this.config.model,
      dimension: dimensionMap[this.config.model] || 1536,
      maxTokens: this.config.maxTokens || 8191,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test with a simple embedding
      await this.generateSingleEmbedding('health check');
      return true;
    } catch (error) {
      console.error('Embedding service health check failed:', error);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    // Cleanup resources if needed
  }

  // =============================================================================
  // OPENAI IMPLEMENTATION
  // =============================================================================

  private async initializeOpenAI(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.openaiClient = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
    });

    // Test connection
    try {
      await this.openaiClient.models.list();
    } catch (error) {
      throw new Error(`Failed to connect to OpenAI: ${error.message}`);
    }
  }

  private async generateOpenAIEmbeddings(
    request: IEmbeddingRequest,
    startTime: number
  ): Promise<IEmbeddingResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    // Process in batches to avoid rate limits
    const batches = this.chunkArray(request.texts, this.config.batchSize!);
    const allEmbeddings: number[][] = [];
    let totalTokens = 0;

    for (const batch of batches) {
      const response = await this.openaiClient.embeddings.create({
        model: request.model || this.config.model,
        input: batch,
        dimensions: request.dimensions,
      });

      allEmbeddings.push(...response.data.map(item => item.embedding));
      totalTokens += response.usage.total_tokens;
    }

    return {
      embeddings: allEmbeddings,
      model: request.model || this.config.model,
      usage: {
        promptTokens: totalTokens,
        totalTokens,
      },
      processingTime: Date.now() - startTime,
    };
  }

  // =============================================================================
  // HUGGING FACE IMPLEMENTATION
  // =============================================================================

  private async initializeHuggingFace(): Promise<void> {
    // Initialize Hugging Face client
    // This would require the @huggingface/inference package
    throw new Error('Hugging Face embedding provider not implemented');
  }

  private async generateHuggingFaceEmbeddings(
    request: IEmbeddingRequest,
    startTime: number
  ): Promise<IEmbeddingResponse> {
    // Implement Hugging Face embeddings
    throw new Error('Hugging Face embedding generation not implemented');
  }

  // =============================================================================
  // BEDROCK IMPLEMENTATION
  // =============================================================================

  private async initializeBedrock(): Promise<void> {
    // Initialize AWS Bedrock client
    throw new Error('Bedrock embedding provider not implemented');
  }

  private async generateBedrockEmbeddings(
    request: IEmbeddingRequest,
    startTime: number
  ): Promise<IEmbeddingResponse> {
    // Implement Bedrock embeddings
    throw new Error('Bedrock embedding generation not implemented');
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // =============================================================================
  // TEXT PROCESSING UTILITIES
  // =============================================================================

  static preprocessText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .substring(0, 8000); // Truncate to avoid token limits
  }

  static chunkText(
    text: string,
    chunkSize: number = 1000,
    overlap: number = 200
  ): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let currentSize = 0;

    for (const sentence of sentences) {
      const sentenceSize = sentence.length;
      
      if (currentSize + sentenceSize > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // Start new chunk with overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 10));
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
        currentSize = currentChunk.length;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentSize += sentenceSize;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  static calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    // Cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}
