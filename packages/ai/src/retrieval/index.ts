// =============================================================================
// ADVANCED RETRIEVAL SERVICE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { VectorDatabaseService } from '../vector-db';
import { EmbeddingService } from '../embeddings';
import { IDocumentChunk, IDocumentMetadata } from '../document-ingestion';

// =============================================================================
// INTERFACES
// =============================================================================

export interface IRetrievalQuery {
  query: string;
  collection?: string;
  topK?: number;
  threshold?: number;
  filters?: Record<string, any>;
  reranking?: boolean;
  hybridSearch?: boolean;
  includeMetadata?: boolean;
  expandQuery?: boolean;
}

export interface IRetrievalResult {
  id: string;
  content: string;
  score: number;
  metadata: IDocumentMetadata;
  chunkIndex?: number;
  highlights?: string[];
  reasoning?: string;
}

export interface IRetrievalResponse {
  query: string;
  results: IRetrievalResult[];
  totalResults: number;
  processingTime: number;
  strategy: RetrievalStrategy;
  metadata: {
    collection: string;
    topK: number;
    threshold: number;
    filters: Record<string, any>;
    expandedQuery?: string;
    rerankingApplied: boolean;
  };
}

export interface IQueryExpansion {
  originalQuery: string;
  expandedTerms: string[];
  synonyms: string[];
  relatedConcepts: string[];
  finalQuery: string;
}

export interface IRerankingConfig {
  enabled: boolean;
  model: 'semantic' | 'cross-encoder' | 'custom';
  threshold: number;
  maxResults: number;
}

export enum RetrievalStrategy {
  VECTOR_ONLY = 'VECTOR_ONLY',
  KEYWORD_ONLY = 'KEYWORD_ONLY',
  HYBRID = 'HYBRID',
  SEMANTIC_SEARCH = 'SEMANTIC_SEARCH',
  CONTEXTUAL = 'CONTEXTUAL',
}

export interface IRetrievalConfig {
  vectorDb: VectorDatabaseService;
  embedding: EmbeddingService;
  defaultCollection: string;
  defaultTopK: number;
  defaultThreshold: number;
  enableQueryExpansion: boolean;
  enableReranking: boolean;
  rerankingConfig: IRerankingConfig;
  enableHybridSearch: boolean;
  keywordWeight: number;
  semanticWeight: number;
}

// =============================================================================
// ADVANCED RETRIEVAL SERVICE
// =============================================================================

export class AdvancedRetrievalService {
  private vectorDb: VectorDatabaseService;
  private embedding: EmbeddingService;
  private config: IRetrievalConfig;
  private queryCache: Map<string, IRetrievalResponse> = new Map();
  private synonymMap: Map<string, string[]> = new Map();

  constructor(config: IRetrievalConfig) {
    this.vectorDb = config.vectorDb;
    this.embedding = config.embedding;
    this.config = config;
    this.initializeSynonymMap();
  }

  async initialize(): Promise<void> {
    await this.vectorDb.initialize();
    await this.embedding.initialize();
  }

  async retrieve(query: IRetrievalQuery): Promise<IRetrievalResponse> {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = this.generateCacheKey(query);
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        processingTime: Date.now() - startTime,
      };
    }

    try {
      // Determine retrieval strategy
      const strategy = this.determineStrategy(query);
      
      // Expand query if enabled
      let expandedQuery = query.query;
      let queryExpansion: IQueryExpansion | undefined;
      
      if (this.config.enableQueryExpansion && query.expandQuery !== false) {
        queryExpansion = await this.expandQuery(query.query);
        expandedQuery = queryExpansion.finalQuery;
      }

      // Perform retrieval based on strategy
      let results: IRetrievalResult[] = [];
      
      switch (strategy) {
        case RetrievalStrategy.VECTOR_ONLY:
          results = await this.vectorSearch(expandedQuery, query);
          break;
        case RetrievalStrategy.KEYWORD_ONLY:
          results = await this.keywordSearch(expandedQuery, query);
          break;
        case RetrievalStrategy.HYBRID:
          results = await this.hybridSearch(expandedQuery, query);
          break;
        case RetrievalStrategy.SEMANTIC_SEARCH:
          results = await this.semanticSearch(expandedQuery, query);
          break;
        case RetrievalStrategy.CONTEXTUAL:
          results = await this.contextualSearch(expandedQuery, query);
          break;
      }

      // Apply reranking if enabled
      if (this.config.enableReranking && query.reranking !== false) {
        results = await this.rerankResults(query.query, results);
      }

      // Apply post-processing
      results = await this.postProcessResults(results, query);

      const response: IRetrievalResponse = {
        query: query.query,
        results,
        totalResults: results.length,
        processingTime: Date.now() - startTime,
        strategy,
        metadata: {
          collection: query.collection || this.config.defaultCollection,
          topK: query.topK || this.config.defaultTopK,
          threshold: query.threshold || this.config.defaultThreshold,
          filters: query.filters || {},
          expandedQuery: queryExpansion?.finalQuery,
          rerankingApplied: this.config.enableReranking && query.reranking !== false,
        },
      };

      // Cache the response
      this.queryCache.set(cacheKey, response);
      
      return response;

    } catch (error) {
      throw new Error(`Retrieval failed: ${error.message}`);
    }
  }

  async multiQueryRetrieval(queries: string[], options?: Partial<IRetrievalQuery>): Promise<IRetrievalResponse[]> {
    const retrievalPromises = queries.map(query => 
      this.retrieve({ ...options, query })
    );

    return Promise.all(retrievalPromises);
  }

  async contextualRetrieval(
    query: string,
    context: string[],
    options?: Partial<IRetrievalQuery>
  ): Promise<IRetrievalResponse> {
    // Enhance query with context
    const contextualQuery = this.buildContextualQuery(query, context);
    
    return this.retrieve({
      ...options,
      query: contextualQuery,
      expandQuery: false, // Already expanded with context
    });
  }

  async similaritySearch(
    documentId: string,
    options?: Partial<IRetrievalQuery>
  ): Promise<IRetrievalResponse> {
    // Get the document content
    const document = await this.getDocumentById(documentId, options?.collection);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Use document content as query
    return this.retrieve({
      ...options,
      query: document.content,
      filters: {
        ...options?.filters,
        documentId: { $ne: documentId }, // Exclude the source document
      },
    });
  }

  // =============================================================================
  // RETRIEVAL STRATEGIES
  // =============================================================================

  private async vectorSearch(query: string, options: IRetrievalQuery): Promise<IRetrievalResult[]> {
    const embedding = await this.embedding.generateSingleEmbedding(query);
    
    const searchResults = await this.vectorDb.search(
      options.collection || this.config.defaultCollection,
      {
        query: '',
        embedding,
        topK: options.topK || this.config.defaultTopK,
        threshold: options.threshold || this.config.defaultThreshold,
        filters: options.filters,
      }
    );

    return this.convertToRetrievalResults(searchResults);
  }

  private async keywordSearch(query: string, options: IRetrievalQuery): Promise<IRetrievalResult[]> {
    // Simple keyword matching (in a real implementation, you'd use a proper search engine)
    const keywords = this.extractKeywords(query);
    const searchResults = await this.vectorDb.search(
      options.collection || this.config.defaultCollection,
      {
        query,
        topK: options.topK || this.config.defaultTopK,
        filters: {
          ...options.filters,
          $text: { $search: keywords.join(' ') },
        },
      }
    );

    return this.convertToRetrievalResults(searchResults);
  }

  private async hybridSearch(query: string, options: IRetrievalQuery): Promise<IRetrievalResult[]> {
    // Combine vector and keyword search
    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorSearch(query, { ...options, topK: Math.ceil((options.topK || this.config.defaultTopK) * 1.5) }),
      this.keywordSearch(query, { ...options, topK: Math.ceil((options.topK || this.config.defaultTopK) * 1.5) }),
    ]);

    // Merge and rerank results
    const mergedResults = this.mergeResults(vectorResults, keywordResults);
    const rankedResults = this.rankHybridResults(mergedResults, query);

    return rankedResults.slice(0, options.topK || this.config.defaultTopK);
  }

  private async semanticSearch(query: string, options: IRetrievalQuery): Promise<IRetrievalResult[]> {
    // Enhanced semantic search with query understanding
    const semanticQuery = await this.enhanceSemanticQuery(query);
    return this.vectorSearch(semanticQuery, options);
  }

  private async contextualSearch(query: string, options: IRetrievalQuery): Promise<IRetrievalResult[]> {
    // Multi-step contextual retrieval
    const initialResults = await this.vectorSearch(query, {
      ...options,
      topK: Math.min((options.topK || this.config.defaultTopK) * 2, 20),
    });

    // Extract context from initial results
    const context = initialResults.slice(0, 5).map(r => r.content).join(' ');
    
    // Perform second retrieval with context
    const contextualQuery = this.buildContextualQuery(query, [context]);
    const finalResults = await this.vectorSearch(contextualQuery, options);

    return finalResults;
  }

  // =============================================================================
  // QUERY PROCESSING
  // =============================================================================

  private async expandQuery(query: string): Promise<IQueryExpansion> {
    const originalTerms = this.extractKeywords(query);
    const expandedTerms: string[] = [];
    const synonyms: string[] = [];
    const relatedConcepts: string[] = [];

    // Add synonyms
    for (const term of originalTerms) {
      const termSynonyms = this.synonymMap.get(term.toLowerCase()) || [];
      synonyms.push(...termSynonyms);
    }

    // Add related concepts (simplified - in practice, use a knowledge graph)
    relatedConcepts.push(...this.getRelatedConcepts(originalTerms));

    expandedTerms.push(...originalTerms, ...synonyms, ...relatedConcepts);

    const finalQuery = [query, ...synonyms.slice(0, 3), ...relatedConcepts.slice(0, 2)].join(' ');

    return {
      originalQuery: query,
      expandedTerms,
      synonyms,
      relatedConcepts,
      finalQuery,
    };
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
    ]);
    return stopWords.has(word.toLowerCase());
  }

  private getRelatedConcepts(terms: string[]): string[] {
    // Simplified concept mapping - in practice, use a knowledge graph or ML model
    const conceptMap: Record<string, string[]> = {
      'credit': ['loan', 'lending', 'finance', 'debt', 'borrowing'],
      'risk': ['assessment', 'evaluation', 'analysis', 'scoring', 'rating'],
      'policy': ['guideline', 'procedure', 'rule', 'regulation', 'standard'],
      'application': ['request', 'submission', 'form', 'proposal'],
      'approval': ['acceptance', 'authorization', 'consent', 'permission'],
      'rejection': ['denial', 'refusal', 'decline', 'disapproval'],
    };

    const related: string[] = [];
    for (const term of terms) {
      const concepts = conceptMap[term.toLowerCase()] || [];
      related.push(...concepts.slice(0, 2));
    }

    return [...new Set(related)]; // Remove duplicates
  }

  private buildContextualQuery(query: string, context: string[]): string {
    const contextText = context.join(' ').substring(0, 500); // Limit context length
    return `${query} Context: ${contextText}`;
  }

  private async enhanceSemanticQuery(query: string): Promise<string> {
    // In a real implementation, you might use an LLM to enhance the query
    const keywords = this.extractKeywords(query);
    const enhanced = keywords.map(keyword => {
      const synonyms = this.synonymMap.get(keyword) || [];
      return synonyms.length > 0 ? `(${keyword} OR ${synonyms[0]})` : keyword;
    }).join(' AND ');

    return enhanced || query;
  }

  // =============================================================================
  // RESULT PROCESSING
  // =============================================================================

  private async rerankResults(query: string, results: IRetrievalResult[]): Promise<IRetrievalResult[]> {
    if (results.length <= 1) return results;

    switch (this.config.rerankingConfig.model) {
      case 'semantic':
        return this.semanticReranking(query, results);
      case 'cross-encoder':
        return this.crossEncoderReranking(query, results);
      case 'custom':
        return this.customReranking(query, results);
      default:
        return results;
    }
  }

  private async semanticReranking(query: string, results: IRetrievalResult[]): Promise<IRetrievalResult[]> {
    // Calculate semantic similarity scores
    const queryEmbedding = await this.embedding.generateSingleEmbedding(query);
    
    const rerankedResults = await Promise.all(
      results.map(async result => {
        const contentEmbedding = await this.embedding.generateSingleEmbedding(result.content);
        const semanticScore = this.calculateCosineSimilarity(queryEmbedding, contentEmbedding);
        
        return {
          ...result,
          score: (result.score + semanticScore) / 2, // Combine original and semantic scores
        };
      })
    );

    return rerankedResults
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.rerankingConfig.maxResults);
  }

  private async crossEncoderReranking(query: string, results: IRetrievalResult[]): Promise<IRetrievalResult[]> {
    // Simplified cross-encoder reranking
    // In practice, you'd use a trained cross-encoder model
    return this.semanticReranking(query, results);
  }

  private async customReranking(query: string, results: IRetrievalResult[]): Promise<IRetrievalResult[]> {
    // Custom reranking logic based on business rules
    const queryTerms = this.extractKeywords(query);
    
    return results
      .map(result => {
        let boost = 1.0;
        
        // Boost based on document type
        if (result.metadata.type === 'CREDIT_POLICY') boost *= 1.2;
        if (result.metadata.type === 'REGULATION') boost *= 1.1;
        
        // Boost based on recency
        const age = Date.now() - new Date(result.metadata.updatedAt).getTime();
        const daysSinceUpdate = age / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 30) boost *= 1.1;
        
        // Boost based on keyword density
        const keywordDensity = this.calculateKeywordDensity(result.content, queryTerms);
        boost *= (1 + keywordDensity);
        
        return {
          ...result,
          score: result.score * boost,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private async postProcessResults(results: IRetrievalResult[], query: IRetrievalQuery): Promise<IRetrievalResult[]> {
    // Add highlights if requested
    if (query.includeMetadata !== false) {
      const queryTerms = this.extractKeywords(query.query);
      results = results.map(result => ({
        ...result,
        highlights: this.generateHighlights(result.content, queryTerms),
      }));
    }

    // Remove duplicates
    results = this.removeDuplicates(results);

    return results;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private determineStrategy(query: IRetrievalQuery): RetrievalStrategy {
    if (query.hybridSearch) return RetrievalStrategy.HYBRID;
    if (this.config.enableHybridSearch) return RetrievalStrategy.HYBRID;
    return RetrievalStrategy.VECTOR_ONLY;
  }

  private convertToRetrievalResults(searchResults: any[]): IRetrievalResult[] {
    return searchResults.map(result => ({
      id: result.id,
      content: result.content,
      score: result.score || 0,
      metadata: result.metadata,
      chunkIndex: result.chunkIndex,
    }));
  }

  private mergeResults(vectorResults: IRetrievalResult[], keywordResults: IRetrievalResult[]): IRetrievalResult[] {
    const merged = new Map<string, IRetrievalResult>();
    
    // Add vector results
    vectorResults.forEach(result => {
      merged.set(result.id, {
        ...result,
        score: result.score * this.config.semanticWeight,
      });
    });
    
    // Add keyword results
    keywordResults.forEach(result => {
      const existing = merged.get(result.id);
      if (existing) {
        existing.score += result.score * this.config.keywordWeight;
      } else {
        merged.set(result.id, {
          ...result,
          score: result.score * this.config.keywordWeight,
        });
      }
    });
    
    return Array.from(merged.values());
  }

  private rankHybridResults(results: IRetrievalResult[], query: string): IRetrievalResult[] {
    return results.sort((a, b) => b.score - a.score);
  }

  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private calculateKeywordDensity(content: string, keywords: string[]): number {
    const words = content.toLowerCase().split(/\s+/);
    const keywordCount = words.filter(word => keywords.includes(word)).length;
    return keywordCount / words.length;
  }

  private generateHighlights(content: string, terms: string[]): string[] {
    const highlights: string[] = [];
    const sentences = content.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (terms.some(term => lowerSentence.includes(term.toLowerCase()))) {
        highlights.push(sentence.trim());
        if (highlights.length >= 3) break;
      }
    }
    
    return highlights;
  }

  private removeDuplicates(results: IRetrievalResult[]): IRetrievalResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.metadata.id}_${result.chunkIndex}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async getDocumentById(documentId: string, collection?: string): Promise<IRetrievalResult | null> {
    const results = await this.vectorDb.search(
      collection || this.config.defaultCollection,
      {
        query: '',
        filters: { documentId },
        topK: 1,
      }
    );

    return results.length > 0 ? this.convertToRetrievalResults(results)[0] : null;
  }

  private generateCacheKey(query: IRetrievalQuery): string {
    return JSON.stringify({
      query: query.query,
      collection: query.collection,
      topK: query.topK,
      threshold: query.threshold,
      filters: query.filters,
    });
  }

  private initializeSynonymMap(): void {
    // Initialize with credit-specific synonyms
    this.synonymMap.set('credit', ['loan', 'lending', 'finance']);
    this.synonymMap.set('risk', ['danger', 'hazard', 'threat']);
    this.synonymMap.set('policy', ['guideline', 'procedure', 'rule']);
    this.synonymMap.set('application', ['request', 'submission']);
    this.synonymMap.set('approval', ['acceptance', 'authorization']);
    this.synonymMap.set('rejection', ['denial', 'refusal']);
    this.synonymMap.set('assessment', ['evaluation', 'analysis']);
    this.synonymMap.set('score', ['rating', 'grade']);
    this.synonymMap.set('borrower', ['applicant', 'client', 'customer']);
    this.synonymMap.set('lender', ['bank', 'institution', 'creditor']);
  }

  clearCache(): void {
    this.queryCache.clear();
  }

  async cleanup(): Promise<void> {
    this.clearCache();
  }
}
