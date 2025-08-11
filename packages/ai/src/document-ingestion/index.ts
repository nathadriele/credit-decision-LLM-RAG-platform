// =============================================================================
// DOCUMENT INGESTION SERVICE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { VectorDatabaseService } from '../vector-db';
import { EmbeddingService } from '../embeddings';

// =============================================================================
// INTERFACES
// =============================================================================

export interface IDocumentMetadata {
  id: string;
  title: string;
  type: DocumentType;
  source: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  tags: string[];
  category: string;
  language: string;
  size: number;
  checksum: string;
  [key: string]: unknown;
}

export interface IDocumentChunk {
  id: string;
  documentId: string;
  content: string;
  metadata: IDocumentMetadata;
  chunkIndex: number;
  chunkSize: number;
  embedding?: number[];
  startOffset: number;
  endOffset: number;
}

export interface IIngestionConfig {
  vectorDb: VectorDatabaseService;
  embedding: EmbeddingService;
  chunkSize: number;
  chunkOverlap: number;
  batchSize: number;
  enableDeduplication: boolean;
  enableMetadataExtraction: boolean;
  supportedFormats: string[];
  maxFileSize: number;
}

export interface IIngestionResult {
  documentId: string;
  status: 'success' | 'failed' | 'partial';
  chunksProcessed: number;
  totalChunks: number;
  processingTime: number;
  errors: string[];
  metadata: IDocumentMetadata;
}

export interface IIngestionProgress {
  documentId: string;
  stage: IngestionStage;
  progress: number;
  message: string;
  timestamp: string;
}

export enum DocumentType {
  CREDIT_POLICY = 'CREDIT_POLICY',
  RISK_GUIDELINE = 'RISK_GUIDELINE',
  REGULATION = 'REGULATION',
  PROCEDURE = 'PROCEDURE',
  TEMPLATE = 'TEMPLATE',
  REPORT = 'REPORT',
  MANUAL = 'MANUAL',
  FAQ = 'FAQ',
  OTHER = 'OTHER',
}

export enum IngestionStage {
  VALIDATION = 'VALIDATION',
  PARSING = 'PARSING',
  CHUNKING = 'CHUNKING',
  EMBEDDING = 'EMBEDDING',
  STORAGE = 'STORAGE',
  INDEXING = 'INDEXING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// =============================================================================
// DOCUMENT INGESTION SERVICE
// =============================================================================

export class DocumentIngestionService extends EventEmitter {
  private vectorDb: VectorDatabaseService;
  private embedding: EmbeddingService;
  private config: IIngestionConfig;
  private processingQueue: Map<string, IIngestionProgress> = new Map();

  constructor(config: IIngestionConfig) {
    super();
    this.vectorDb = config.vectorDb;
    this.embedding = config.embedding;
    this.config = config;
  }

  async initialize(): Promise<void> {
    await this.vectorDb.initialize();
    await this.embedding.initialize();
  }

  async ingestDocument(
    content: string,
    metadata: Partial<IDocumentMetadata>,
    collection: string = 'documents'
  ): Promise<IIngestionResult> {
    const startTime = Date.now();
    const documentId = metadata.id || this.generateDocumentId(content, metadata);
    
    try {
      // Initialize progress tracking
      this.updateProgress(documentId, IngestionStage.VALIDATION, 0, 'Starting document ingestion');

      // Validate document
      await this.validateDocument(content, metadata);
      this.updateProgress(documentId, IngestionStage.VALIDATION, 100, 'Document validation completed');

      // Parse and extract metadata
      this.updateProgress(documentId, IngestionStage.PARSING, 0, 'Parsing document content');
      const enrichedMetadata = await this.extractMetadata(content, metadata);
      this.updateProgress(documentId, IngestionStage.PARSING, 100, 'Document parsing completed');

      // Check for duplicates if enabled
      if (this.config.enableDeduplication) {
        const isDuplicate = await this.checkDuplicate(enrichedMetadata.checksum, collection);
        if (isDuplicate) {
          throw new Error(`Document with checksum ${enrichedMetadata.checksum} already exists`);
        }
      }

      // Chunk document
      this.updateProgress(documentId, IngestionStage.CHUNKING, 0, 'Chunking document');
      const chunks = await this.chunkDocument(content, enrichedMetadata);
      this.updateProgress(documentId, IngestionStage.CHUNKING, 100, `Created ${chunks.length} chunks`);

      // Generate embeddings
      this.updateProgress(documentId, IngestionStage.EMBEDDING, 0, 'Generating embeddings');
      const chunksWithEmbeddings = await this.generateEmbeddings(chunks);
      this.updateProgress(documentId, IngestionStage.EMBEDDING, 100, 'Embeddings generated');

      // Store in vector database
      this.updateProgress(documentId, IngestionStage.STORAGE, 0, 'Storing in vector database');
      await this.storeChunks(chunksWithEmbeddings, collection);
      this.updateProgress(documentId, IngestionStage.STORAGE, 100, 'Chunks stored successfully');

      // Index for search
      this.updateProgress(documentId, IngestionStage.INDEXING, 0, 'Indexing document');
      await this.indexDocument(enrichedMetadata, collection);
      this.updateProgress(documentId, IngestionStage.INDEXING, 100, 'Document indexed');

      this.updateProgress(documentId, IngestionStage.COMPLETED, 100, 'Document ingestion completed');

      const result: IIngestionResult = {
        documentId,
        status: 'success',
        chunksProcessed: chunksWithEmbeddings.length,
        totalChunks: chunks.length,
        processingTime: Date.now() - startTime,
        errors: [],
        metadata: enrichedMetadata,
      };

      this.emit('documentIngested', result);
      return result;

    } catch (error) {
      this.updateProgress(documentId, IngestionStage.FAILED, 0, `Ingestion failed: ${error.message}`);
      
      const result: IIngestionResult = {
        documentId,
        status: 'failed',
        chunksProcessed: 0,
        totalChunks: 0,
        processingTime: Date.now() - startTime,
        errors: [error.message],
        metadata: metadata as IDocumentMetadata,
      };

      this.emit('ingestionFailed', result);
      throw error;
    } finally {
      this.processingQueue.delete(documentId);
    }
  }

  async ingestBatch(
    documents: Array<{ content: string; metadata: Partial<IDocumentMetadata> }>,
    collection: string = 'documents'
  ): Promise<IIngestionResult[]> {
    const results: IIngestionResult[] = [];
    const batchSize = this.config.batchSize;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchPromises = batch.map(doc => 
        this.ingestDocument(doc.content, doc.metadata, collection)
          .catch(error => ({
            documentId: doc.metadata.id || 'unknown',
            status: 'failed' as const,
            chunksProcessed: 0,
            totalChunks: 0,
            processingTime: 0,
            errors: [error.message],
            metadata: doc.metadata as IDocumentMetadata,
          }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Emit batch progress
      this.emit('batchProgress', {
        processed: i + batch.length,
        total: documents.length,
        results: batchResults,
      });
    }

    return results;
  }

  async updateDocument(
    documentId: string,
    content: string,
    metadata: Partial<IDocumentMetadata>,
    collection: string = 'documents'
  ): Promise<IIngestionResult> {
    // Remove existing document
    await this.removeDocument(documentId, collection);
    
    // Re-ingest with updated content
    return this.ingestDocument(content, { ...metadata, id: documentId }, collection);
  }

  async removeDocument(documentId: string, collection: string = 'documents'): Promise<void> {
    // Remove all chunks for this document
    const chunks = await this.vectorDb.search(collection, {
      query: '',
      filters: { documentId },
      topK: 1000,
    });

    for (const chunk of chunks) {
      await this.vectorDb.deleteDocument(collection, chunk.id);
    }

    this.emit('documentRemoved', { documentId, collection });
  }

  getProgress(documentId: string): IIngestionProgress | null {
    return this.processingQueue.get(documentId) || null;
  }

  getAllProgress(): IIngestionProgress[] {
    return Array.from(this.processingQueue.values());
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private async validateDocument(
    content: string,
    metadata: Partial<IDocumentMetadata>
  ): Promise<void> {
    if (!content || content.trim().length === 0) {
      throw new Error('Document content cannot be empty');
    }

    if (content.length > this.config.maxFileSize) {
      throw new Error(`Document size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`);
    }

    if (!metadata.type || !Object.values(DocumentType).includes(metadata.type as DocumentType)) {
      throw new Error('Valid document type is required');
    }

    if (!metadata.title || metadata.title.trim().length === 0) {
      throw new Error('Document title is required');
    }
  }

  private async extractMetadata(
    content: string,
    metadata: Partial<IDocumentMetadata>
  ): Promise<IDocumentMetadata> {
    const now = new Date().toISOString();
    const checksum = this.calculateChecksum(content);

    const enrichedMetadata: IDocumentMetadata = {
      id: metadata.id || this.generateDocumentId(content, metadata),
      title: metadata.title || 'Untitled Document',
      type: metadata.type || DocumentType.OTHER,
      source: metadata.source || 'unknown',
      author: metadata.author,
      createdAt: metadata.createdAt || now,
      updatedAt: now,
      version: metadata.version || '1.0.0',
      tags: metadata.tags || [],
      category: metadata.category || 'general',
      language: metadata.language || 'en',
      size: content.length,
      checksum,
      ...metadata,
    };

    // Extract additional metadata if enabled
    if (this.config.enableMetadataExtraction) {
      const extractedMetadata = await this.extractAdditionalMetadata(content);
      Object.assign(enrichedMetadata, extractedMetadata);
    }

    return enrichedMetadata;
  }

  private async extractAdditionalMetadata(content: string): Promise<Partial<IDocumentMetadata>> {
    const metadata: Partial<IDocumentMetadata> = {};

    // Extract key phrases
    const keyPhrases = this.extractKeyPhrases(content);
    if (keyPhrases.length > 0) {
      metadata.tags = [...(metadata.tags || []), ...keyPhrases.slice(0, 10)];
    }

    // Detect language (simple heuristic)
    metadata.language = this.detectLanguage(content);

    // Extract document structure
    const structure = this.analyzeDocumentStructure(content);
    metadata.structure = structure;

    return metadata;
  }

  private extractKeyPhrases(content: string): string[] {
    // Simple key phrase extraction
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  private detectLanguage(content: string): string {
    // Simple language detection based on common words
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of'];
    const spanishWords = ['el', 'la', 'y', 'o', 'pero', 'en', 'de', 'para', 'con', 'por'];
    const portugueseWords = ['o', 'a', 'e', 'ou', 'mas', 'em', 'de', 'para', 'com', 'por'];

    const words = content.toLowerCase().split(/\s+/).slice(0, 100);
    
    const englishCount = words.filter(word => englishWords.includes(word)).length;
    const spanishCount = words.filter(word => spanishWords.includes(word)).length;
    const portugueseCount = words.filter(word => portugueseWords.includes(word)).length;

    if (englishCount > spanishCount && englishCount > portugueseCount) return 'en';
    if (spanishCount > portugueseCount) return 'es';
    if (portugueseCount > 0) return 'pt';
    
    return 'en'; // Default to English
  }

  private analyzeDocumentStructure(content: string): any {
    const lines = content.split('\n');
    const structure = {
      totalLines: lines.length,
      paragraphs: content.split('\n\n').length,
      hasHeaders: /^#+\s/.test(content),
      hasBulletPoints: /^\s*[-*+]\s/.test(content),
      hasNumberedLists: /^\s*\d+\.\s/.test(content),
    };

    return structure;
  }

  private async chunkDocument(
    content: string,
    metadata: IDocumentMetadata
  ): Promise<IDocumentChunk[]> {
    const chunks: IDocumentChunk[] = [];
    const chunkSize = this.config.chunkSize;
    const overlap = this.config.chunkOverlap;

    // Smart chunking based on document structure
    const sentences = this.splitIntoSentences(content);
    let currentChunk = '';
    let currentSize = 0;
    let chunkIndex = 0;
    let startOffset = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceSize = sentence.length;

      if (currentSize + sentenceSize > chunkSize && currentChunk.length > 0) {
        // Create chunk
        const chunk: IDocumentChunk = {
          id: `${metadata.id}_chunk_${chunkIndex}`,
          documentId: metadata.id,
          content: currentChunk.trim(),
          metadata,
          chunkIndex,
          chunkSize: currentChunk.length,
          startOffset,
          endOffset: startOffset + currentChunk.length,
        };

        chunks.push(chunk);
        chunkIndex++;

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, overlap);
        currentChunk = overlapText + sentence;
        currentSize = currentChunk.length;
        startOffset += currentChunk.length - overlapText.length;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentSize += sentenceSize;
      }
    }

    // Add final chunk
    if (currentChunk.trim().length > 0) {
      const chunk: IDocumentChunk = {
        id: `${metadata.id}_chunk_${chunkIndex}`,
        documentId: metadata.id,
        content: currentChunk.trim(),
        metadata,
        chunkIndex,
        chunkSize: currentChunk.length,
        startOffset,
        endOffset: startOffset + currentChunk.length,
      };

      chunks.push(chunk);
    }

    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    // Enhanced sentence splitting
    return text
      .split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);
  }

  private getOverlapText(text: string, overlapSize: number): string {
    const words = text.split(' ');
    const overlapWords = Math.floor(overlapSize / 10); // Approximate words for overlap
    return words.slice(-overlapWords).join(' ') + ' ';
  }

  private async generateEmbeddings(chunks: IDocumentChunk[]): Promise<IDocumentChunk[]> {
    const texts = chunks.map(chunk => chunk.content);
    const embeddingResponse = await this.embedding.generateEmbeddings({ texts });

    return chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddingResponse.embeddings[index],
    }));
  }

  private async storeChunks(chunks: IDocumentChunk[], collection: string): Promise<void> {
    const batchSize = this.config.batchSize;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      await this.vectorDb.addDocuments(collection, batch);
    }
  }

  private async indexDocument(metadata: IDocumentMetadata, collection: string): Promise<void> {
    // Store document metadata for search and retrieval
    const documentIndex = {
      id: metadata.id,
      content: JSON.stringify(metadata),
      metadata: {
        ...metadata,
        isDocumentIndex: true,
      },
    };

    await this.vectorDb.addDocuments(`${collection}_index`, [documentIndex]);
  }

  private async checkDuplicate(checksum: string, collection: string): Promise<boolean> {
    try {
      const results = await this.vectorDb.search(`${collection}_index`, {
        query: '',
        filters: { checksum },
        topK: 1,
      });

      return results.length > 0;
    } catch (error) {
      // If index doesn't exist, no duplicates
      return false;
    }
  }

  private generateDocumentId(content: string, metadata: Partial<IDocumentMetadata>): string {
    const hash = createHash('sha256');
    hash.update(content);
    hash.update(metadata.title || '');
    hash.update(metadata.source || '');
    return hash.digest('hex').substring(0, 16);
  }

  private calculateChecksum(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }

  private updateProgress(
    documentId: string,
    stage: IngestionStage,
    progress: number,
    message: string
  ): void {
    const progressInfo: IIngestionProgress = {
      documentId,
      stage,
      progress,
      message,
      timestamp: new Date().toISOString(),
    };

    this.processingQueue.set(documentId, progressInfo);
    this.emit('progress', progressInfo);
  }

  async cleanup(): Promise<void> {
    this.processingQueue.clear();
    this.removeAllListeners();
  }
}
