// =============================================================================
// DOCUMENT INGESTION TESTS - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { DocumentIngestionService, DocumentType, IngestionStage } from '../document-ingestion';
import { VectorDatabaseService } from '../vector-db';
import { EmbeddingService } from '../embeddings';

// Mock dependencies
jest.mock('../vector-db');
jest.mock('../embeddings');

describe('DocumentIngestionService', () => {
  let ingestionService: DocumentIngestionService;
  let mockVectorDb: jest.Mocked<VectorDatabaseService>;
  let mockEmbedding: jest.Mocked<EmbeddingService>;

  beforeEach(() => {
    mockVectorDb = {
      initialize: jest.fn().mockResolvedValue(undefined),
      createCollection: jest.fn().mockResolvedValue(undefined),
      addDocuments: jest.fn().mockResolvedValue(undefined),
      search: jest.fn().mockResolvedValue([]),
      deleteDocument: jest.fn().mockResolvedValue(undefined),
      healthCheck: jest.fn().mockResolvedValue(true),
      cleanup: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockEmbedding = {
      initialize: jest.fn().mockResolvedValue(undefined),
      generateEmbeddings: jest.fn().mockResolvedValue({
        embeddings: [new Array(1536).fill(0).map(() => Math.random())],
        model: 'text-embedding-ada-002',
        usage: { totalTokens: 10 },
        processingTime: 100,
      }),
      generateSingleEmbedding: jest.fn().mockResolvedValue(
        new Array(1536).fill(0).map(() => Math.random())
      ),
      healthCheck: jest.fn().mockResolvedValue(true),
      cleanup: jest.fn().mockResolvedValue(undefined),
    } as any;

    ingestionService = new DocumentIngestionService({
      vectorDb: mockVectorDb,
      embedding: mockEmbedding,
      chunkSize: 1000,
      chunkOverlap: 200,
      batchSize: 10,
      enableDeduplication: true,
      enableMetadataExtraction: true,
      supportedFormats: ['txt', 'pdf', 'docx'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(ingestionService.initialize()).resolves.not.toThrow();
      expect(mockVectorDb.initialize).toHaveBeenCalled();
      expect(mockEmbedding.initialize).toHaveBeenCalled();
    });
  });

  describe('document ingestion', () => {
    const sampleContent = 'This is a sample credit policy document that contains important information about lending practices and risk assessment procedures.';
    const sampleMetadata = {
      title: 'Credit Policy Document',
      type: DocumentType.CREDIT_POLICY,
      source: 'internal',
      author: 'Risk Team',
      category: 'policies',
    };

    it('should ingest a document successfully', async () => {
      const result = await ingestionService.ingestDocument(sampleContent, sampleMetadata);

      expect(result.status).toBe('success');
      expect(result.chunksProcessed).toBeGreaterThan(0);
      expect(result.metadata.title).toBe(sampleMetadata.title);
      expect(result.metadata.type).toBe(sampleMetadata.type);
      expect(mockEmbedding.generateEmbeddings).toHaveBeenCalled();
      expect(mockVectorDb.addDocuments).toHaveBeenCalled();
    });

    it('should emit progress events during ingestion', async () => {
      const progressEvents: any[] = [];
      ingestionService.on('progress', (progress) => {
        progressEvents.push(progress);
      });

      await ingestionService.ingestDocument(sampleContent, sampleMetadata);

      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0].stage).toBe(IngestionStage.VALIDATION);
      expect(progressEvents[progressEvents.length - 1].stage).toBe(IngestionStage.COMPLETED);
    });

    it('should handle validation errors', async () => {
      await expect(
        ingestionService.ingestDocument('', sampleMetadata)
      ).rejects.toThrow('Document content cannot be empty');
    });

    it('should handle invalid document type', async () => {
      const invalidMetadata = {
        ...sampleMetadata,
        type: 'INVALID_TYPE' as any,
      };

      await expect(
        ingestionService.ingestDocument(sampleContent, invalidMetadata)
      ).rejects.toThrow('Valid document type is required');
    });

    it('should handle missing title', async () => {
      const invalidMetadata = {
        ...sampleMetadata,
        title: '',
      };

      await expect(
        ingestionService.ingestDocument(sampleContent, invalidMetadata)
      ).rejects.toThrow('Document title is required');
    });

    it('should handle document size limit', async () => {
      const largeContent = 'a'.repeat(20 * 1024 * 1024); // 20MB

      await expect(
        ingestionService.ingestDocument(largeContent, sampleMetadata)
      ).rejects.toThrow('Document size exceeds maximum allowed size');
    });
  });

  describe('document chunking', () => {
    it('should chunk long documents appropriately', async () => {
      const longContent = 'This is a sentence. '.repeat(100); // Create long content
      
      const result = await ingestionService.ingestDocument(longContent, {
        title: 'Long Document',
        type: DocumentType.MANUAL,
        source: 'test',
        category: 'test',
      });

      expect(result.chunksProcessed).toBeGreaterThan(1);
    });

    it('should handle short documents', async () => {
      const shortContent = 'Short document.';
      
      const result = await ingestionService.ingestDocument(shortContent, {
        title: 'Short Document',
        type: DocumentType.FAQ,
        source: 'test',
        category: 'test',
      });

      expect(result.chunksProcessed).toBe(1);
    });
  });

  describe('batch ingestion', () => {
    it('should ingest multiple documents', async () => {
      const documents = [
        {
          content: 'Document 1 content',
          metadata: {
            title: 'Document 1',
            type: DocumentType.CREDIT_POLICY,
            source: 'test',
            category: 'test',
          },
        },
        {
          content: 'Document 2 content',
          metadata: {
            title: 'Document 2',
            type: DocumentType.RISK_GUIDELINE,
            source: 'test',
            category: 'test',
          },
        },
      ];

      const results = await ingestionService.ingestBatch(documents);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('success');
    });

    it('should handle partial failures in batch', async () => {
      const documents = [
        {
          content: 'Valid document content',
          metadata: {
            title: 'Valid Document',
            type: DocumentType.CREDIT_POLICY,
            source: 'test',
            category: 'test',
          },
        },
        {
          content: '', // Invalid empty content
          metadata: {
            title: 'Invalid Document',
            type: DocumentType.RISK_GUIDELINE,
            source: 'test',
            category: 'test',
          },
        },
      ];

      const results = await ingestionService.ingestBatch(documents);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('failed');
    });
  });

  describe('document updates', () => {
    it('should update existing document', async () => {
      const documentId = 'test-doc-id';
      const updatedContent = 'Updated document content';
      const updatedMetadata = {
        id: documentId,
        title: 'Updated Document',
        type: DocumentType.CREDIT_POLICY,
        source: 'test',
        category: 'test',
      };

      // Mock the removal of existing document
      mockVectorDb.search.mockResolvedValue([
        {
          id: 'chunk1',
          content: 'old content',
          score: 1.0,
          metadata: { documentId },
        },
      ]);

      const result = await ingestionService.updateDocument(
        documentId,
        updatedContent,
        updatedMetadata
      );

      expect(result.status).toBe('success');
      expect(mockVectorDb.deleteDocument).toHaveBeenCalled();
    });
  });

  describe('document removal', () => {
    it('should remove document and all its chunks', async () => {
      const documentId = 'test-doc-id';

      mockVectorDb.search.mockResolvedValue([
        {
          id: 'chunk1',
          content: 'content1',
          score: 1.0,
          metadata: { documentId },
        },
        {
          id: 'chunk2',
          content: 'content2',
          score: 1.0,
          metadata: { documentId },
        },
      ]);

      await ingestionService.removeDocument(documentId);

      expect(mockVectorDb.search).toHaveBeenCalledWith(
        'documents',
        expect.objectContaining({
          filters: { documentId },
        })
      );
      expect(mockVectorDb.deleteDocument).toHaveBeenCalledTimes(2);
    });
  });

  describe('progress tracking', () => {
    it('should track progress for multiple documents', async () => {
      const doc1Content = 'Document 1 content';
      const doc1Metadata = {
        id: 'doc1',
        title: 'Document 1',
        type: DocumentType.CREDIT_POLICY,
        source: 'test',
        category: 'test',
      };

      // Start ingestion without waiting
      const promise = ingestionService.ingestDocument(doc1Content, doc1Metadata);

      // Check progress
      const progress = ingestionService.getProgress('doc1');
      expect(progress).toBeDefined();

      await promise;

      // Progress should be cleared after completion
      const finalProgress = ingestionService.getProgress('doc1');
      expect(finalProgress).toBeNull();
    });

    it('should return all active progress', async () => {
      const allProgress = ingestionService.getAllProgress();
      expect(Array.isArray(allProgress)).toBe(true);
    });
  });

  describe('metadata extraction', () => {
    it('should extract additional metadata when enabled', async () => {
      const content = 'This document contains credit risk assessment guidelines for loan applications.';
      const metadata = {
        title: 'Risk Guidelines',
        type: DocumentType.RISK_GUIDELINE,
        source: 'test',
        category: 'test',
      };

      const result = await ingestionService.ingestDocument(content, metadata);

      expect(result.metadata.checksum).toBeDefined();
      expect(result.metadata.size).toBe(content.length);
      expect(result.metadata.language).toBeDefined();
    });
  });

  describe('deduplication', () => {
    it('should detect duplicate documents when enabled', async () => {
      const content = 'Duplicate document content';
      const metadata = {
        title: 'Duplicate Document',
        type: DocumentType.CREDIT_POLICY,
        source: 'test',
        category: 'test',
      };

      // Mock existing document with same checksum
      mockVectorDb.search.mockResolvedValue([
        {
          id: 'existing-doc',
          content: 'existing content',
          score: 1.0,
          metadata: { checksum: 'mock-checksum' },
        },
      ]);

      // First ingestion should succeed
      await ingestionService.ingestDocument(content, metadata);

      // Second ingestion with same content should fail
      await expect(
        ingestionService.ingestDocument(content, metadata)
      ).rejects.toThrow('already exists');
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', async () => {
      await expect(ingestionService.cleanup()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle vector database errors', async () => {
      mockVectorDb.addDocuments.mockRejectedValue(new Error('Vector DB error'));

      await expect(
        ingestionService.ingestDocument('test content', {
          title: 'Test Document',
          type: DocumentType.CREDIT_POLICY,
          source: 'test',
          category: 'test',
        })
      ).rejects.toThrow('Vector DB error');
    });

    it('should handle embedding generation errors', async () => {
      mockEmbedding.generateEmbeddings.mockRejectedValue(new Error('Embedding error'));

      await expect(
        ingestionService.ingestDocument('test content', {
          title: 'Test Document',
          type: DocumentType.CREDIT_POLICY,
          source: 'test',
          category: 'test',
        })
      ).rejects.toThrow('Embedding error');
    });
  });
});
