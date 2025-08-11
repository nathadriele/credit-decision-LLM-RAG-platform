// =============================================================================
// VECTOR DATABASE TESTS - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { VectorDatabaseService } from '../vector-db';
import { ChromaDBService } from '../vector-db/chromadb';

// Mock ChromaDB
jest.mock('chromadb', () => ({
  ChromaApi: jest.fn().mockImplementation(() => ({
    heartbeat: jest.fn().mockResolvedValue({}),
    createCollection: jest.fn().mockResolvedValue({}),
    getCollection: jest.fn().mockResolvedValue({
      add: jest.fn().mockResolvedValue({}),
      query: jest.fn().mockResolvedValue({
        ids: [['doc1', 'doc2']],
        documents: [['Document 1', 'Document 2']],
        metadatas: [[{}, {}]],
        distances: [[0.1, 0.2]],
      }),
      get: jest.fn().mockResolvedValue({
        ids: ['doc1'],
        documents: ['Document 1'],
        metadatas: [{}],
      }),
      count: jest.fn().mockResolvedValue(2),
    }),
    listCollections: jest.fn().mockResolvedValue([]),
    deleteCollection: jest.fn().mockResolvedValue({}),
  })),
  OpenAIEmbeddingFunction: jest.fn().mockImplementation(() => ({})),
}));

describe('VectorDatabaseService', () => {
  let vectorDb: VectorDatabaseService;

  beforeEach(() => {
    vectorDb = new VectorDatabaseService({
      type: 'chromadb',
      config: {
        host: 'localhost',
        port: 8000,
        authToken: 'test-token',
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(vectorDb.initialize()).resolves.not.toThrow();
    });

    it('should throw error for unsupported database type', () => {
      expect(() => {
        new VectorDatabaseService({
          type: 'unsupported' as any,
          config: {},
        });
      }).toThrow('Unsupported vector database type: unsupported');
    });
  });

  describe('collection management', () => {
    beforeEach(async () => {
      await vectorDb.initialize();
    });

    it('should create a collection', async () => {
      await expect(
        vectorDb.createCollection('test-collection', 1536)
      ).resolves.not.toThrow();
    });

    it('should list collections', async () => {
      const collections = await vectorDb.listCollections();
      expect(Array.isArray(collections)).toBe(true);
    });

    it('should delete a collection', async () => {
      await expect(
        vectorDb.deleteCollection('test-collection')
      ).resolves.not.toThrow();
    });

    it('should get collection stats', async () => {
      const stats = await vectorDb.getCollectionStats('test-collection');
      expect(stats).toHaveProperty('documentCount');
      expect(stats).toHaveProperty('dimension');
      expect(typeof stats.documentCount).toBe('number');
      expect(typeof stats.dimension).toBe('number');
    });
  });

  describe('document operations', () => {
    const testDocuments = [
      {
        id: 'doc1',
        content: 'This is a test document about credit policies.',
        metadata: { type: 'policy', category: 'credit' },
        embedding: new Array(1536).fill(0).map(() => Math.random()),
      },
      {
        id: 'doc2',
        content: 'This document contains risk assessment guidelines.',
        metadata: { type: 'guideline', category: 'risk' },
        embedding: new Array(1536).fill(0).map(() => Math.random()),
      },
    ];

    beforeEach(async () => {
      await vectorDb.initialize();
      await vectorDb.createCollection('test-collection', 1536);
    });

    it('should add documents to collection', async () => {
      await expect(
        vectorDb.addDocuments('test-collection', testDocuments)
      ).resolves.not.toThrow();
    });

    it('should update a document', async () => {
      const updatedDoc = {
        ...testDocuments[0],
        content: 'Updated content for the test document.',
      };

      await expect(
        vectorDb.updateDocument('test-collection', updatedDoc)
      ).resolves.not.toThrow();
    });

    it('should delete a document', async () => {
      await expect(
        vectorDb.deleteDocument('test-collection', 'doc1')
      ).resolves.not.toThrow();
    });

    it('should get a document by id', async () => {
      const document = await vectorDb.getDocument('test-collection', 'doc1');
      expect(document).toHaveProperty('id');
      expect(document).toHaveProperty('content');
      expect(document).toHaveProperty('metadata');
    });
  });

  describe('search operations', () => {
    beforeEach(async () => {
      await vectorDb.initialize();
      await vectorDb.createCollection('test-collection', 1536);
    });

    it('should search with query text', async () => {
      const results = await vectorDb.search('test-collection', {
        query: 'credit policy guidelines',
        topK: 5,
        threshold: 0.7,
      });

      expect(Array.isArray(results)).toBe(true);
      results.forEach(result => {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('metadata');
        expect(typeof result.score).toBe('number');
      });
    });

    it('should search with embedding vector', async () => {
      const embedding = new Array(1536).fill(0).map(() => Math.random());
      
      const results = await vectorDb.search('test-collection', {
        query: '',
        embedding,
        topK: 3,
        threshold: 0.5,
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should apply filters in search', async () => {
      const results = await vectorDb.search('test-collection', {
        query: 'test query',
        filters: { type: 'policy' },
        topK: 5,
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should respect topK parameter', async () => {
      const results = await vectorDb.search('test-collection', {
        query: 'test query',
        topK: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should filter by threshold', async () => {
      const results = await vectorDb.search('test-collection', {
        query: 'test query',
        threshold: 0.9, // High threshold
        topK: 10,
      });

      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0.9);
      });
    });
  });

  describe('health check', () => {
    it('should return health status', async () => {
      await vectorDb.initialize();
      const isHealthy = await vectorDb.healthCheck();
      expect(typeof isHealthy).toBe('boolean');
    });

    it('should handle health check failure gracefully', async () => {
      // Mock a failure
      const chromaService = vectorDb['service'] as ChromaDBService;
      jest.spyOn(chromaService, 'healthCheck').mockResolvedValue(false);

      const isHealthy = await vectorDb.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', async () => {
      await vectorDb.initialize();
      await expect(vectorDb.cleanup()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle collection not found error', async () => {
      await vectorDb.initialize();
      
      await expect(
        vectorDb.search('non-existent-collection', {
          query: 'test query',
        })
      ).rejects.toThrow();
    });

    it('should handle invalid embedding dimension', async () => {
      await vectorDb.initialize();
      await vectorDb.createCollection('test-collection', 1536);

      const invalidDoc = {
        id: 'invalid-doc',
        content: 'Test content',
        metadata: {},
        embedding: [1, 2, 3], // Wrong dimension
      };

      // This should either throw or handle gracefully
      // depending on the implementation
      await expect(
        vectorDb.addDocuments('test-collection', [invalidDoc])
      ).rejects.toThrow();
    });
  });
});

describe('ChromaDBService', () => {
  let chromaService: ChromaDBService;

  beforeEach(() => {
    chromaService = new ChromaDBService({
      host: 'localhost',
      port: 8000,
      authToken: 'test-token',
    });
  });

  describe('configuration', () => {
    it('should use default configuration values', () => {
      const defaultService = new ChromaDBService({});
      expect(defaultService['config'].host).toBe('localhost');
      expect(defaultService['config'].port).toBe(8000);
      expect(defaultService['config'].ssl).toBe(false);
    });

    it('should override default configuration', () => {
      const customService = new ChromaDBService({
        host: 'custom-host',
        port: 9000,
        ssl: true,
      });
      
      expect(customService['config'].host).toBe('custom-host');
      expect(customService['config'].port).toBe(9000);
      expect(customService['config'].ssl).toBe(true);
    });
  });

  describe('ChromaDB specific methods', () => {
    beforeEach(async () => {
      await chromaService.initialize();
    });

    it('should peek collection documents', async () => {
      const documents = await chromaService.peek('test-collection', 5);
      expect(Array.isArray(documents)).toBe(true);
    });

    it('should get ChromaDB version', async () => {
      // Mock version response
      jest.spyOn(chromaService['client'], 'version').mockResolvedValue('0.4.0');
      
      const version = await chromaService.getVersion();
      expect(typeof version).toBe('string');
    });
  });
});
