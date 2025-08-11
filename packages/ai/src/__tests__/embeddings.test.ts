// =============================================================================
// EMBEDDINGS TESTS - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { EmbeddingService } from '../embeddings';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      models: {
        list: jest.fn().mockResolvedValue({ data: [] }),
      },
      embeddings: {
        create: jest.fn().mockResolvedValue({
          object: 'list',
          data: [
            {
              object: 'embedding',
              embedding: new Array(1536).fill(0).map(() => Math.random()),
              index: 0,
            },
          ],
          model: 'text-embedding-ada-002',
          usage: {
            prompt_tokens: 5,
            total_tokens: 5,
          },
        }),
      },
    })),
  };
});

describe('EmbeddingService', () => {
  let embeddingService: EmbeddingService;

  beforeEach(() => {
    embeddingService = new EmbeddingService({
      provider: 'openai',
      model: 'text-embedding-ada-002',
      apiKey: 'test-api-key',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize OpenAI provider successfully', async () => {
      await expect(embeddingService.initialize()).resolves.not.toThrow();
    });

    it('should throw error for missing API key', async () => {
      const serviceWithoutKey = new EmbeddingService({
        provider: 'openai',
        model: 'text-embedding-ada-002',
      });

      await expect(serviceWithoutKey.initialize()).rejects.toThrow(
        'OpenAI API key is required'
      );
    });

    it('should throw error for unsupported provider', async () => {
      const unsupportedService = new EmbeddingService({
        provider: 'unsupported' as any,
        model: 'test-model',
        apiKey: 'test-key',
      });

      await expect(unsupportedService.initialize()).rejects.toThrow(
        'Unsupported embedding provider: unsupported'
      );
    });
  });

  describe('embedding generation', () => {
    beforeEach(async () => {
      await embeddingService.initialize();
    });

    it('should generate embeddings for single text', async () => {
      const embedding = await embeddingService.generateSingleEmbedding(
        'This is a test document about credit policies.'
      );

      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(1536);
      expect(embedding.every(val => typeof val === 'number')).toBe(true);
    });

    it('should generate embeddings for multiple texts', async () => {
      const texts = [
        'Credit policy document',
        'Risk assessment guidelines',
        'Loan application procedures',
      ];

      const response = await embeddingService.generateEmbeddings({ texts });

      expect(response).toHaveProperty('embeddings');
      expect(response).toHaveProperty('model');
      expect(response).toHaveProperty('usage');
      expect(response).toHaveProperty('processingTime');

      expect(Array.isArray(response.embeddings)).toBe(true);
      expect(response.embeddings.length).toBe(texts.length);
      
      response.embeddings.forEach(embedding => {
        expect(Array.isArray(embedding)).toBe(true);
        expect(embedding.length).toBe(1536);
      });

      expect(typeof response.processingTime).toBe('number');
      expect(response.processingTime).toBeGreaterThan(0);
    });

    it('should handle batch processing for large number of texts', async () => {
      const texts = new Array(150).fill(0).map((_, i) => `Test document ${i}`);

      const response = await embeddingService.generateEmbeddings({ 
        texts,
      });

      expect(response.embeddings.length).toBe(texts.length);
    });

    it('should use custom model when specified', async () => {
      const response = await embeddingService.generateEmbeddings({
        texts: ['Test text'],
        model: 'text-embedding-3-small',
      });

      expect(response.model).toBe('text-embedding-3-small');
    });

    it('should handle empty text array', async () => {
      const response = await embeddingService.generateEmbeddings({
        texts: [],
      });

      expect(response.embeddings).toEqual([]);
      expect(response.usage.totalTokens).toBe(0);
    });
  });

  describe('model information', () => {
    beforeEach(async () => {
      await embeddingService.initialize();
    });

    it('should return model information', async () => {
      const modelInfo = await embeddingService.getModelInfo();

      expect(modelInfo).toHaveProperty('model');
      expect(modelInfo).toHaveProperty('dimension');
      expect(modelInfo).toHaveProperty('maxTokens');

      expect(typeof modelInfo.model).toBe('string');
      expect(typeof modelInfo.dimension).toBe('number');
      expect(typeof modelInfo.maxTokens).toBe('number');
    });

    it('should return correct dimensions for different models', async () => {
      const ada002Service = new EmbeddingService({
        provider: 'openai',
        model: 'text-embedding-ada-002',
        apiKey: 'test-key',
      });

      const modelInfo = await ada002Service.getModelInfo();
      expect(modelInfo.dimension).toBe(1536);
    });
  });

  describe('health check', () => {
    beforeEach(async () => {
      await embeddingService.initialize();
    });

    it('should pass health check', async () => {
      const isHealthy = await embeddingService.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should fail health check on error', async () => {
      // Mock an error
      jest.spyOn(embeddingService, 'generateSingleEmbedding')
        .mockRejectedValue(new Error('API Error'));

      const isHealthy = await embeddingService.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('text processing utilities', () => {
    it('should preprocess text correctly', () => {
      const input = '  This is a test   with\n\nextra   whitespace  ';
      const processed = EmbeddingService.preprocessText(input);
      
      expect(processed).toBe('This is a test with extra whitespace');
    });

    it('should truncate long text', () => {
      const longText = 'a'.repeat(10000);
      const processed = EmbeddingService.preprocessText(longText);
      
      expect(processed.length).toBeLessThanOrEqual(8000);
    });

    it('should chunk text into smaller pieces', () => {
      const longText = 'This is a long document. '.repeat(100);
      const chunks = EmbeddingService.chunkText(longText, 100, 20);

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(1);
      
      chunks.forEach(chunk => {
        expect(chunk.length).toBeLessThanOrEqual(120); // chunk size + overlap
      });
    });

    it('should calculate similarity between embeddings', () => {
      const embedding1 = [1, 0, 0];
      const embedding2 = [0, 1, 0];
      const embedding3 = [1, 0, 0];

      const similarity1 = EmbeddingService.calculateSimilarity(embedding1, embedding2);
      const similarity2 = EmbeddingService.calculateSimilarity(embedding1, embedding3);

      expect(similarity1).toBe(0); // Orthogonal vectors
      expect(similarity2).toBe(1); // Identical vectors
    });

    it('should throw error for mismatched embedding dimensions', () => {
      const embedding1 = [1, 0, 0];
      const embedding2 = [1, 0];

      expect(() => {
        EmbeddingService.calculateSimilarity(embedding1, embedding2);
      }).toThrow('Embeddings must have the same dimension');
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await embeddingService.initialize();
    });

    it('should handle API rate limiting', async () => {
      // Mock rate limit error
      const mockError = new Error('Rate limit exceeded');
      (mockError as any).response = { status: 429 };

      jest.spyOn(embeddingService['openaiClient']!.embeddings, 'create')
        .mockRejectedValue(mockError);

      await expect(
        embeddingService.generateSingleEmbedding('test text')
      ).rejects.toThrow('Failed to generate embeddings');
    });

    it('should handle invalid API key', async () => {
      // Mock authentication error
      const mockError = new Error('Invalid API key');
      (mockError as any).response = { status: 401 };

      jest.spyOn(embeddingService['openaiClient']!.embeddings, 'create')
        .mockRejectedValue(mockError);

      await expect(
        embeddingService.generateSingleEmbedding('test text')
      ).rejects.toThrow('Failed to generate embeddings');
    });

    it('should handle network errors', async () => {
      // Mock network error
      const mockError = new Error('Network error');
      (mockError as any).code = 'ECONNREFUSED';

      jest.spyOn(embeddingService['openaiClient']!.embeddings, 'create')
        .mockRejectedValue(mockError);

      await expect(
        embeddingService.generateSingleEmbedding('test text')
      ).rejects.toThrow('Failed to generate embeddings');
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', async () => {
      await embeddingService.initialize();
      await expect(embeddingService.cleanup()).resolves.not.toThrow();
    });
  });
});
