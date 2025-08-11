// =============================================================================
// RAG SERVICE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { VectorDatabaseService, ISearchResult } from '../vector-db';
import { EmbeddingService } from '../embeddings';
import { LLMService, IMessage } from '../llm';
import { PromptService, IPromptContext } from '../prompts';

// =============================================================================
// RAG INTERFACES
// =============================================================================

export interface IRAGConfig {
  vectorDb: VectorDatabaseService;
  embedding: EmbeddingService;
  llm: LLMService;
  prompts: PromptService;
  defaultCollection?: string;
  topK?: number;
  threshold?: number;
  maxContextLength?: number;
  enableReranking?: boolean;
}

export interface IRAGQuery {
  query: string;
  collection?: string;
  topK?: number;
  threshold?: number;
  filters?: Record<string, unknown>;
  includeMetadata?: boolean;
  contextWindow?: number;
  promptTemplate?: string;
  additionalContext?: Record<string, unknown>;
}

export interface IRAGResponse {
  answer: string;
  sources: IRAGSource[];
  confidence: number;
  processingTime: number;
  usage: {
    embeddingTokens: number;
    llmTokens: number;
    totalTokens: number;
  };
  metadata: {
    query: string;
    collection: string;
    retrievedDocuments: number;
    model: string;
    promptTemplate?: string;
  };
}

export interface IRAGSource {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
  chunkIndex?: number;
}

export interface IDocumentChunk {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
  parentDocumentId?: string;
  chunkIndex?: number;
}

// =============================================================================
// RAG SERVICE IMPLEMENTATION
// =============================================================================

export class RAGService {
  private vectorDb: VectorDatabaseService;
  private embedding: EmbeddingService;
  private llm: LLMService;
  private prompts: PromptService;
  private config: {
    defaultCollection: string;
    topK: number;
    threshold: number;
    maxContextLength: number;
    enableReranking: boolean;
  };

  constructor(config: IRAGConfig) {
    this.vectorDb = config.vectorDb;
    this.embedding = config.embedding;
    this.llm = config.llm;
    this.prompts = config.prompts;
    
    this.config = {
      defaultCollection: config.defaultCollection || 'credit_documents',
      topK: config.topK || 5,
      threshold: config.threshold || 0.7,
      maxContextLength: config.maxContextLength || 8000,
      enableReranking: config.enableReranking || false,
    };
  }

  async initialize(): Promise<void> {
    // RAG service initialization if needed
  }

  async query(request: IRAGQuery): Promise<IRAGResponse> {
    const startTime = Date.now();
    
    try {
      // Step 1: Generate embedding for the query
      const queryEmbedding = await this.embedding.generateSingleEmbedding(request.query);
      
      // Step 2: Retrieve relevant documents
      const searchResults = await this.vectorDb.search(
        request.collection || this.config.defaultCollection,
        {
          query: request.query,
          embedding: queryEmbedding,
          topK: request.topK || this.config.topK,
          threshold: request.threshold || this.config.threshold,
          filters: request.filters,
          includeMetadata: request.includeMetadata !== false,
        }
      );

      // Step 3: Rerank results if enabled
      const rankedResults = this.config.enableReranking 
        ? await this.rerankResults(request.query, searchResults)
        : searchResults;

      // Step 4: Prepare context
      const context = this.prepareContext(rankedResults, request.contextWindow);
      
      // Step 5: Generate response using LLM
      const llmResponse = await this.generateResponse(
        request.query,
        context,
        request.promptTemplate,
        request.additionalContext
      );

      // Step 6: Calculate confidence score
      const confidence = this.calculateConfidence(rankedResults, llmResponse);

      return {
        answer: llmResponse.content,
        sources: rankedResults.map(result => ({
          id: result.id,
          content: result.content,
          score: result.score,
          metadata: result.metadata,
        })),
        confidence,
        processingTime: Date.now() - startTime,
        usage: {
          embeddingTokens: this.estimateTokens(request.query),
          llmTokens: llmResponse.usage.totalTokens,
          totalTokens: this.estimateTokens(request.query) + llmResponse.usage.totalTokens,
        },
        metadata: {
          query: request.query,
          collection: request.collection || this.config.defaultCollection,
          retrievedDocuments: rankedResults.length,
          model: llmResponse.model,
          promptTemplate: request.promptTemplate,
        },
      };
    } catch (error) {
      throw new Error(`RAG query failed: ${error.message}`);
    }
  }

  async addDocuments(
    collection: string,
    documents: IDocumentChunk[]
  ): Promise<void> {
    try {
      // Generate embeddings for documents that don't have them
      const documentsToEmbed = documents.filter(doc => !doc.embedding);
      
      if (documentsToEmbed.length > 0) {
        const texts = documentsToEmbed.map(doc => doc.content);
        const embeddingResponse = await this.embedding.generateEmbeddings({ texts });
        
        documentsToEmbed.forEach((doc, index) => {
          doc.embedding = embeddingResponse.embeddings[index];
        });
      }

      // Add documents to vector database
      await this.vectorDb.addDocuments(collection, documents);
    } catch (error) {
      throw new Error(`Failed to add documents to RAG: ${error.message}`);
    }
  }

  async updateDocument(
    collection: string,
    document: IDocumentChunk
  ): Promise<void> {
    try {
      // Generate embedding if not provided
      if (!document.embedding) {
        document.embedding = await this.embedding.generateSingleEmbedding(document.content);
      }

      await this.vectorDb.updateDocument(collection, document);
    } catch (error) {
      throw new Error(`Failed to update document in RAG: ${error.message}`);
    }
  }

  async deleteDocument(collection: string, id: string): Promise<void> {
    try {
      await this.vectorDb.deleteDocument(collection, id);
    } catch (error) {
      throw new Error(`Failed to delete document from RAG: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const vectorDbHealth = await this.vectorDb.healthCheck();
      const embeddingHealth = await this.embedding.healthCheck();
      const llmHealth = await this.llm.healthCheck();
      
      return vectorDbHealth && embeddingHealth && llmHealth;
    } catch (error) {
      console.error('RAG health check failed:', error);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    await Promise.allSettled([
      this.vectorDb.cleanup(),
      this.embedding.cleanup(),
      this.llm.cleanup(),
    ]);
  }

  // =============================================================================
  // CREDIT DECISION SPECIFIC METHODS
  // =============================================================================

  async analyzeCreditApplication(applicationData: any): Promise<IRAGResponse> {
    const query = this.buildCreditAnalysisQuery(applicationData);
    
    return this.query({
      query,
      collection: 'credit_policies',
      promptTemplate: 'credit_analysis_comprehensive',
      additionalContext: { applicantData: applicationData },
    });
  }

  async assessRisk(applicationData: any, riskFactors: any[]): Promise<IRAGResponse> {
    const query = this.buildRiskAssessmentQuery(applicationData, riskFactors);
    
    return this.query({
      query,
      collection: 'risk_models',
      promptTemplate: 'risk_assessment_detailed',
      additionalContext: { 
        applicantData: applicationData,
        riskFactors,
      },
    });
  }

  async checkCompliance(decision: any, policies: any[]): Promise<IRAGResponse> {
    const query = this.buildComplianceQuery(decision);
    
    return this.query({
      query,
      collection: 'credit_policies',
      promptTemplate: 'compliance_check_comprehensive',
      additionalContext: {
        decision,
        policies,
      },
    });
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private async rerankResults(
    query: string,
    results: ISearchResult[]
  ): Promise<ISearchResult[]> {
    // Implement semantic reranking using cross-encoder or similar
    // For now, return results as-is
    return results;
  }

  private prepareContext(
    results: ISearchResult[],
    maxLength?: number
  ): string {
    const contextLength = maxLength || this.config.maxContextLength;
    let context = '';
    let currentLength = 0;

    for (const result of results) {
      const resultText = `Source: ${result.metadata.title || result.id}\n${result.content}\n\n`;
      
      if (currentLength + resultText.length > contextLength) {
        break;
      }
      
      context += resultText;
      currentLength += resultText.length;
    }

    return context;
  }

  private async generateResponse(
    query: string,
    context: string,
    promptTemplate?: string,
    additionalContext?: Record<string, unknown>
  ): Promise<any> {
    const promptContext: IPromptContext = {
      query,
      context,
      ...additionalContext,
    };

    let messages: IMessage[];
    
    if (promptTemplate) {
      messages = this.prompts.generateMessages(promptTemplate, promptContext);
    } else {
      // Default RAG prompt
      messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant that answers questions based on the provided context. Use only the information from the context to answer questions. If the context does not contain enough information to answer the question, say so clearly.',
        },
        {
          role: 'user',
          content: `Context:\n${context}\n\nQuestion: ${query}\n\nPlease provide a comprehensive answer based on the context above.`,
        },
      ];
    }

    return this.llm.generateResponse({ messages });
  }

  private calculateConfidence(
    results: ISearchResult[],
    llmResponse: any
  ): number {
    if (results.length === 0) return 0;

    // Calculate confidence based on:
    // 1. Average similarity score of retrieved documents
    // 2. Number of relevant documents found
    // 3. LLM response quality indicators

    const avgScore = results.reduce((sum, result) => sum + result.score, 0) / results.length;
    const documentCountFactor = Math.min(results.length / 3, 1); // Normalize to 0-1
    const responseQualityFactor = llmResponse.content.length > 50 ? 1 : 0.5;

    return Math.min(avgScore * documentCountFactor * responseQualityFactor, 1);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private buildCreditAnalysisQuery(applicationData: any): string {
    const { personal, financial, employment } = applicationData;
    
    return `Credit analysis for applicant with ${employment.jobTitle} position, ` +
           `annual income $${financial.annualIncome}, credit score ${financial.creditScore}, ` +
           `debt-to-income ratio ${financial.debtToIncomeRatio}%. ` +
           `What are the key risk factors and approval criteria?`;
  }

  private buildRiskAssessmentQuery(applicationData: any, riskFactors: any[]): string {
    const factors = riskFactors.map(f => f.category).join(', ');
    
    return `Risk assessment for credit application with factors: ${factors}. ` +
           `Income: $${applicationData.financial.annualIncome}, ` +
           `Employment: ${applicationData.employment.monthsEmployed} months. ` +
           `What is the probability of default and risk mitigation strategies?`;
  }

  private buildComplianceQuery(decision: any): string {
    return `Compliance review for ${decision.decision} credit decision. ` +
           `Check for ECOA, FCRA, and TILA compliance requirements. ` +
           `What regulatory considerations apply?`;
  }
}

// =============================================================================
// DOCUMENT PROCESSING UTILITIES
// =============================================================================

export class DocumentProcessor {
  static chunkDocument(
    content: string,
    chunkSize: number = 1000,
    overlap: number = 200,
    metadata: Record<string, unknown> = {}
  ): IDocumentChunk[] {
    const chunks: IDocumentChunk[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let currentSize = 0;
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const sentenceSize = sentence.length;
      
      if (currentSize + sentenceSize > chunkSize && currentChunk.length > 0) {
        chunks.push({
          id: `${metadata.documentId || 'doc'}_chunk_${chunkIndex}`,
          content: currentChunk.trim(),
          metadata: {
            ...metadata,
            chunkIndex,
            chunkSize: currentChunk.length,
          },
          chunkIndex,
        });
        
        chunkIndex++;
        
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
      chunks.push({
        id: `${metadata.documentId || 'doc'}_chunk_${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: {
          ...metadata,
          chunkIndex,
          chunkSize: currentChunk.length,
        },
        chunkIndex,
      });
    }

    return chunks;
  }

  static extractMetadata(content: string, documentType: string): Record<string, unknown> {
    // Extract metadata based on document type
    const metadata: Record<string, unknown> = {
      documentType,
      extractedAt: new Date().toISOString(),
      contentLength: content.length,
    };

    // Add type-specific metadata extraction logic here
    switch (documentType) {
      case 'INCOME_VERIFICATION':
        // Extract income-related metadata
        break;
      case 'BANK_STATEMENT':
        // Extract banking metadata
        break;
      // Add more cases as needed
    }

    return metadata;
  }
}
