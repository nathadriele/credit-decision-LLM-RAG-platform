// =============================================================================
// ENHANCED RAG SERVICE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { LLMService } from '../llm';
import { VectorDatabaseService } from '../vector-db';
import { EmbeddingService } from '../embeddings';
import { AdvancedRetrievalService, IRetrievalQuery, IRetrievalResponse } from '../retrieval';
import { DocumentIngestionService } from '../document-ingestion';

// =============================================================================
// INTERFACES
// =============================================================================

export interface IEnhancedRAGQuery {
  query: string;
  collection?: string;
  topK?: number;
  threshold?: number;
  includeContext?: boolean;
  maxContextLength?: number;
  temperature?: number;
  model?: string;
  conversationHistory?: IConversationTurn[];
  useAdvancedRetrieval?: boolean;
  rerankResults?: boolean;
  expandQuery?: boolean;
  responseFormat?: 'detailed' | 'concise' | 'bullet_points' | 'structured';
  citationStyle?: 'inline' | 'numbered' | 'none';
  domain?: 'credit' | 'risk' | 'compliance' | 'general';
}

export interface IConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface IEnhancedRAGResponse {
  answer: string;
  sources: IEnhancedRAGSource[];
  confidence: number;
  processingTime: number;
  reasoning?: string;
  followUpQuestions?: string[];
  citations?: ICitation[];
  keyInsights?: string[];
  riskFactors?: string[];
  recommendations?: string[];
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
    strategy: string;
    conversationId?: string;
    domain: string;
  };
}

export interface IEnhancedRAGSource {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
  highlights?: string[];
  relevanceReason?: string;
  documentType?: string;
  lastUpdated?: string;
}

export interface ICitation {
  id: string;
  title: string;
  source: string;
  page?: number;
  section?: string;
  url?: string;
  confidence: number;
}

export interface IEnhancedRAGConfig {
  llm: LLMService;
  vectorDb: VectorDatabaseService;
  embedding: EmbeddingService;
  retrieval: AdvancedRetrievalService;
  ingestion: DocumentIngestionService;
  defaultCollection: string;
  defaultTopK: number;
  defaultThreshold: number;
  maxContextLength: number;
  enableCaching: boolean;
  enableConversationMemory: boolean;
  maxConversationTurns: number;
  enableCitations: boolean;
  enableFollowUpQuestions: boolean;
  enableDomainSpecialization: boolean;
}

// =============================================================================
// ENHANCED RAG SERVICE
// =============================================================================

export class EnhancedRAGService {
  private llm: LLMService;
  private vectorDb: VectorDatabaseService;
  private embedding: EmbeddingService;
  private retrieval: AdvancedRetrievalService;
  private ingestion: DocumentIngestionService;
  private config: IEnhancedRAGConfig;
  private cache: Map<string, IEnhancedRAGResponse> = new Map();
  private conversationMemory: Map<string, IConversationTurn[]> = new Map();
  private domainPrompts: Map<string, string> = new Map();

  constructor(config: IEnhancedRAGConfig) {
    this.llm = config.llm;
    this.vectorDb = config.vectorDb;
    this.embedding = config.embedding;
    this.retrieval = config.retrieval;
    this.ingestion = config.ingestion;
    this.config = config;
    this.initializeDomainPrompts();
  }

  async initialize(): Promise<void> {
    await this.llm.initialize();
    await this.vectorDb.initialize();
    await this.embedding.initialize();
    await this.retrieval.initialize();
    await this.ingestion.initialize();
  }

  async query(ragQuery: IEnhancedRAGQuery, conversationId?: string): Promise<IEnhancedRAGResponse> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(ragQuery, conversationId);
        const cached = this.cache.get(cacheKey);
        if (cached) {
          return {
            ...cached,
            processingTime: Date.now() - startTime,
          };
        }
      }

      // Get conversation history if enabled
      let conversationHistory = ragQuery.conversationHistory || [];
      if (this.config.enableConversationMemory && conversationId) {
        conversationHistory = this.getConversationHistory(conversationId);
      }

      // Enhance query with conversation context
      const enhancedQuery = this.enhanceQueryWithContext(ragQuery.query, conversationHistory);

      // Step 1: Advanced retrieval
      const retrievalQuery: IRetrievalQuery = {
        query: enhancedQuery,
        collection: ragQuery.collection || this.config.defaultCollection,
        topK: ragQuery.topK || this.config.defaultTopK,
        threshold: ragQuery.threshold || this.config.defaultThreshold,
        reranking: ragQuery.rerankResults !== false,
        expandQuery: ragQuery.expandQuery !== false,
        includeMetadata: true,
      };

      const retrievalResponse = ragQuery.useAdvancedRetrieval !== false
        ? await this.retrieval.retrieve(retrievalQuery)
        : await this.basicRetrieval(retrievalQuery);

      // Step 2: Process and filter results
      const processedSources = await this.processRetrievalResults(retrievalResponse, ragQuery);

      // Step 3: Prepare context with conversation history
      const context = this.prepareEnhancedContext(
        processedSources,
        conversationHistory,
        ragQuery.maxContextLength
      );

      // Step 4: Generate response using LLM with enhanced prompting
      const prompt = this.buildEnhancedPrompt(
        ragQuery.query,
        context,
        ragQuery.responseFormat,
        ragQuery.citationStyle,
        ragQuery.domain,
        conversationHistory
      );

      const llmResponse = await this.llm.generateResponse({
        prompt,
        temperature: ragQuery.temperature || 0.1,
        maxTokens: this.calculateMaxTokens(ragQuery.responseFormat),
        model: ragQuery.model,
      });

      // Step 5: Post-process response
      const processedResponse = await this.postProcessResponse(
        llmResponse.content,
        processedSources,
        ragQuery
      );

      // Step 6: Generate follow-up questions if enabled
      const followUpQuestions = this.config.enableFollowUpQuestions
        ? await this.generateFollowUpQuestions(ragQuery.query, processedResponse.answer, processedSources)
        : [];

      // Step 7: Calculate enhanced confidence
      const confidence = this.calculateEnhancedConfidence(
        retrievalResponse,
        llmResponse,
        conversationHistory
      );

      // Step 8: Generate citations if enabled
      const citations = this.config.enableCitations && ragQuery.citationStyle !== 'none'
        ? this.generateCitations(processedSources, ragQuery.citationStyle)
        : [];

      // Step 9: Extract domain-specific insights
      const domainInsights = await this.extractDomainInsights(
        ragQuery.query,
        processedResponse.answer,
        processedSources,
        ragQuery.domain
      );

      const response: IEnhancedRAGResponse = {
        answer: processedResponse.answer,
        sources: processedSources,
        confidence,
        processingTime: Date.now() - startTime,
        reasoning: processedResponse.reasoning,
        followUpQuestions,
        citations,
        keyInsights: domainInsights.keyInsights,
        riskFactors: domainInsights.riskFactors,
        recommendations: domainInsights.recommendations,
        usage: {
          embeddingTokens: retrievalResponse.processingTime > 0 ? 15 : 0,
          llmTokens: llmResponse.usage?.totalTokens || 0,
          totalTokens: (llmResponse.usage?.totalTokens || 0) + 15,
        },
        metadata: {
          query: ragQuery.query,
          collection: ragQuery.collection || this.config.defaultCollection,
          retrievedDocuments: retrievalResponse.results.length,
          model: ragQuery.model || 'default',
          strategy: retrievalResponse.strategy,
          conversationId,
          domain: ragQuery.domain || 'general',
        },
      };

      // Update conversation memory
      if (this.config.enableConversationMemory && conversationId) {
        this.updateConversationMemory(conversationId, ragQuery.query, response.answer);
      }

      // Cache the response
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(ragQuery, conversationId);
        this.cache.set(cacheKey, response);
      }

      return response;

    } catch (error) {
      throw new Error(`Enhanced RAG query failed: ${error.message}`);
    }
  }

  async multiDomainQuery(
    query: string,
    domains: string[],
    options?: Partial<IEnhancedRAGQuery>
  ): Promise<Map<string, IEnhancedRAGResponse>> {
    const results = new Map<string, IEnhancedRAGResponse>();
    
    const queryPromises = domains.map(async domain => {
      const domainQuery: IEnhancedRAGQuery = {
        ...options,
        query,
        domain: domain as any,
        collection: `${domain}_documents`,
      };
      
      const result = await this.query(domainQuery);
      return { domain, result };
    });

    const domainResults = await Promise.all(queryPromises);
    
    domainResults.forEach(({ domain, result }) => {
      results.set(domain, result);
    });

    return results;
  }

  async conversationalQuery(
    query: string,
    conversationId: string,
    options?: Partial<IEnhancedRAGQuery>
  ): Promise<IEnhancedRAGResponse> {
    return this.query(
      {
        ...options,
        query,
      },
      conversationId
    );
  }

  async batchQuery(
    queries: string[],
    options?: Partial<IEnhancedRAGQuery>
  ): Promise<IEnhancedRAGResponse[]> {
    const batchPromises = queries.map(query => 
      this.query({ ...options, query })
    );

    return Promise.all(batchPromises);
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private async basicRetrieval(query: IRetrievalQuery): Promise<IRetrievalResponse> {
    // Fallback to basic vector search if advanced retrieval is disabled
    const embedding = await this.embedding.generateSingleEmbedding(query.query);
    
    const searchResults = await this.vectorDb.search(
      query.collection || this.config.defaultCollection,
      {
        query: query.query,
        embedding,
        topK: query.topK || this.config.defaultTopK,
        threshold: query.threshold || this.config.defaultThreshold,
        filters: query.filters,
      }
    );

    return {
      query: query.query,
      results: searchResults.map(result => ({
        id: result.id,
        content: result.content,
        score: result.score,
        metadata: result.metadata,
      })),
      totalResults: searchResults.length,
      processingTime: 0,
      strategy: 'VECTOR_ONLY' as any,
      metadata: {
        collection: query.collection || this.config.defaultCollection,
        topK: query.topK || this.config.defaultTopK,
        threshold: query.threshold || this.config.defaultThreshold,
        filters: query.filters || {},
        rerankingApplied: false,
      },
    };
  }

  private enhanceQueryWithContext(query: string, history: IConversationTurn[]): string {
    if (history.length === 0) return query;

    // Get recent context (last 3 turns)
    const recentHistory = history.slice(-6); // 3 user + 3 assistant turns
    const contextParts = recentHistory.map(turn => 
      `${turn.role}: ${turn.content}`
    ).join('\n');

    return `Previous conversation:\n${contextParts}\n\nCurrent question: ${query}`;
  }

  private async processRetrievalResults(
    retrievalResponse: IRetrievalResponse,
    ragQuery: IEnhancedRAGQuery
  ): Promise<IEnhancedRAGSource[]> {
    return retrievalResponse.results.map(result => ({
      id: result.id,
      content: result.content,
      score: result.score,
      metadata: result.metadata,
      highlights: result.highlights,
      relevanceReason: this.generateRelevanceReason(result, ragQuery.query),
      documentType: result.metadata.type || 'unknown',
      lastUpdated: result.metadata.updatedAt || result.metadata.createdAt,
    }));
  }

  private generateRelevanceReason(result: any, query: string): string {
    // Simple relevance reasoning
    const queryTerms = query.toLowerCase().split(/\s+/);
    const contentTerms = result.content.toLowerCase().split(/\s+/);
    const matchingTerms = queryTerms.filter(term => contentTerms.includes(term));
    
    if (matchingTerms.length > 0) {
      return `Contains relevant terms: ${matchingTerms.slice(0, 3).join(', ')}`;
    }
    
    return `High semantic similarity (score: ${result.score.toFixed(2)})`;
  }

  private prepareEnhancedContext(
    sources: IEnhancedRAGSource[],
    history: IConversationTurn[],
    maxLength?: number
  ): string {
    const contextLength = maxLength || this.config.maxContextLength;
    let context = '';

    // Add conversation context if available
    if (history.length > 0) {
      const recentHistory = history.slice(-4).map(turn => 
        `${turn.role}: ${turn.content}`
      ).join('\n');
      context += `Previous conversation:\n${recentHistory}\n\n`;
    }

    // Add retrieved sources
    context += 'Retrieved information:\n';
    
    for (const source of sources) {
      const sourceInfo = `
Source: ${source.metadata.title || 'Unknown'} (${source.documentType})
Last Updated: ${source.lastUpdated || 'Unknown'}
Relevance: ${source.relevanceReason}
Content: ${source.content}
---`;

      if (context.length + sourceInfo.length > contextLength) {
        break;
      }
      
      context += sourceInfo;
    }

    return context.trim();
  }

  private buildEnhancedPrompt(
    query: string,
    context: string,
    format?: string,
    citationStyle?: string,
    domain?: string,
    history?: IConversationTurn[]
  ): string {
    const domainPrompt = this.domainPrompts.get(domain || 'general') || '';
    const formatInstructions = this.getFormatInstructions(format);
    const citationInstructions = this.getCitationInstructions(citationStyle);

    return `${domainPrompt}

Context:
${context}

${formatInstructions}
${citationInstructions}

Question: ${query}

Please provide a comprehensive answer based on the context provided. ${domain === 'credit' ? 'Focus on credit-related implications and risk factors.' : ''}

Answer:`;
  }

  private getFormatInstructions(format?: string): string {
    switch (format) {
      case 'concise':
        return 'Provide a concise, direct answer in 2-3 sentences.';
      case 'bullet_points':
        return 'Structure your answer using bullet points for clarity.';
      case 'structured':
        return 'Structure your answer with clear sections: Summary, Details, and Implications.';
      default:
        return 'Provide a detailed, comprehensive answer.';
    }
  }

  private getCitationInstructions(style?: string): string {
    switch (style) {
      case 'inline':
        return 'Include inline citations in the format [Source Title].';
      case 'numbered':
        return 'Use numbered citations [1], [2], etc. and provide a reference list at the end.';
      case 'none':
        return '';
      default:
        return 'Reference your sources appropriately.';
    }
  }

  private calculateMaxTokens(format?: string): number {
    switch (format) {
      case 'concise': return 200;
      case 'bullet_points': return 500;
      case 'structured': return 800;
      default: return 1000;
    }
  }

  private async postProcessResponse(
    response: string,
    sources: IEnhancedRAGSource[],
    query: IEnhancedRAGQuery
  ): Promise<{ answer: string; reasoning?: string }> {
    // Extract reasoning if present
    const reasoningMatch = response.match(/Reasoning:\s*(.*?)(?:\n\n|$)/s);
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : undefined;
    
    // Clean up the main answer
    let answer = response.replace(/Reasoning:\s*.*?(?:\n\n|$)/s, '').trim();
    
    // Add domain-specific post-processing
    if (query.domain === 'credit') {
      answer = this.enhanceCreditResponse(answer, sources);
    }

    return { answer, reasoning };
  }

  private enhanceCreditResponse(answer: string, sources: IEnhancedRAGSource[]): string {
    // Add credit-specific enhancements
    const riskKeywords = ['risk', 'default', 'delinquency', 'credit score'];
    const hasRiskContent = riskKeywords.some(keyword => 
      answer.toLowerCase().includes(keyword)
    );

    if (hasRiskContent && !answer.includes('Risk Assessment:')) {
      answer += '\n\nNote: This response contains risk-related information. Please ensure compliance with your institution\'s risk management policies.';
    }

    return answer;
  }

  private async generateFollowUpQuestions(
    originalQuery: string,
    answer: string,
    sources: IEnhancedRAGSource[]
  ): Promise<string[]> {
    // Simple follow-up question generation
    const questions: string[] = [];
    
    if (originalQuery.toLowerCase().includes('credit')) {
      questions.push('What are the specific risk factors to consider?');
      questions.push('How does this apply to different credit products?');
    }
    
    if (originalQuery.toLowerCase().includes('policy')) {
      questions.push('Are there any recent updates to this policy?');
      questions.push('What are the compliance requirements?');
    }

    return questions.slice(0, 3);
  }

  private calculateEnhancedConfidence(
    retrievalResponse: IRetrievalResponse,
    llmResponse: any,
    history: IConversationTurn[]
  ): number {
    let confidence = 0.5; // Base confidence

    // Factor in retrieval quality
    if (retrievalResponse.results.length > 0) {
      const avgScore = retrievalResponse.results.reduce((sum, r) => sum + r.score, 0) / retrievalResponse.results.length;
      confidence += avgScore * 0.3;
    }

    // Factor in conversation context
    if (history.length > 0) {
      confidence += 0.1; // Boost for context
    }

    // Factor in source diversity
    const uniqueSources = new Set(retrievalResponse.results.map(r => r.metadata.documentId));
    if (uniqueSources.size > 2) {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.95);
  }

  private generateCitations(sources: IEnhancedRAGSource[], style?: string): ICitation[] {
    return sources.slice(0, 5).map((source, index) => ({
      id: source.id,
      title: source.metadata.title || `Source ${index + 1}`,
      source: source.metadata.source || 'Unknown',
      page: source.metadata.page,
      section: source.metadata.section,
      url: source.metadata.url,
      confidence: source.score,
    }));
  }

  private async extractDomainInsights(
    query: string,
    answer: string,
    sources: IEnhancedRAGSource[],
    domain?: string
  ): Promise<{
    keyInsights: string[];
    riskFactors: string[];
    recommendations: string[];
  }> {
    const insights = {
      keyInsights: [] as string[],
      riskFactors: [] as string[],
      recommendations: [] as string[],
    };

    if (domain === 'credit') {
      // Extract credit-specific insights
      if (answer.toLowerCase().includes('score')) {
        insights.keyInsights.push('Credit scoring factors identified');
      }
      if (answer.toLowerCase().includes('risk')) {
        insights.riskFactors.push('Risk factors present in analysis');
      }
      if (answer.toLowerCase().includes('recommend')) {
        insights.recommendations.push('Recommendations provided');
      }
    }

    return insights;
  }

  private getConversationHistory(conversationId: string): IConversationTurn[] {
    return this.conversationMemory.get(conversationId) || [];
  }

  private updateConversationMemory(conversationId: string, query: string, answer: string): void {
    const history = this.getConversationHistory(conversationId);
    
    history.push(
      {
        role: 'user',
        content: query,
        timestamp: new Date().toISOString(),
      },
      {
        role: 'assistant',
        content: answer,
        timestamp: new Date().toISOString(),
      }
    );

    // Keep only recent turns
    const maxTurns = this.config.maxConversationTurns;
    if (history.length > maxTurns) {
      history.splice(0, history.length - maxTurns);
    }

    this.conversationMemory.set(conversationId, history);
  }

  private initializeDomainPrompts(): void {
    this.domainPrompts.set('credit', `You are a credit decision expert with deep knowledge of lending practices, risk assessment, and regulatory compliance. Focus on providing accurate, actionable insights for credit-related queries.`);
    
    this.domainPrompts.set('risk', `You are a risk management specialist with expertise in financial risk assessment, mitigation strategies, and regulatory requirements. Emphasize risk factors and mitigation approaches.`);
    
    this.domainPrompts.set('compliance', `You are a compliance expert with knowledge of financial regulations, legal requirements, and industry standards. Focus on regulatory implications and compliance considerations.`);
    
    this.domainPrompts.set('general', `You are a knowledgeable assistant with expertise in financial services. Provide accurate, helpful information based on the available context.`);
  }

  private generateCacheKey(query: IEnhancedRAGQuery, conversationId?: string): string {
    return JSON.stringify({
      query: query.query,
      collection: query.collection,
      topK: query.topK,
      threshold: query.threshold,
      domain: query.domain,
      conversationId,
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  clearConversation(conversationId: string): void {
    this.conversationMemory.delete(conversationId);
  }

  async cleanup(): Promise<void> {
    this.clearCache();
    this.conversationMemory.clear();
  }
}
