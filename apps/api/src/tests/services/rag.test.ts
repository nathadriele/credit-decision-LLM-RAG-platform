// =============================================================================
// RAG SERVICE TESTS - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { EnhancedRAGService } from '../../services/rag/enhanced-rag';
import { MockServices, testCache } from '../setup';

describe('EnhancedRAGService', () => {
  let ragService: EnhancedRAGService;

  beforeEach(() => {
    ragService = new EnhancedRAGService({
      llmService: MockServices.mockLLMService as any,
      vectorDbService: MockServices.mockVectorDB as any,
      embeddingService: {
        generateEmbedding: MockServices.mockLLMService.generateEmbedding,
      } as any,
      cacheService: testCache,
      config: {
        defaultCollection: 'test_collection',
        maxTokens: 4000,
        temperature: 0.1,
        topK: 5,
        enableConversationMemory: true,
        enableCaching: true,
        domains: {
          credit: {
            collections: ['credit_policies', 'credit_guidelines'],
            systemPrompt: 'You are a credit analysis expert.',
            temperature: 0.1,
          },
          risk: {
            collections: ['risk_models', 'risk_guidelines'],
            systemPrompt: 'You are a risk assessment specialist.',
            temperature: 0.1,
          },
        },
      },
    });
  });

  describe('query', () => {
    test('should perform basic RAG query', async () => {
      // Arrange
      const query = 'What is the minimum credit score required?';
      
      MockServices.mockVectorDB.search.mockResolvedValue([
        {
          id: 'doc1',
          content: 'Minimum credit score of 650 is required for personal loans.',
          metadata: { source: 'credit_policy.pdf', page: 1 },
          score: 0.95,
        },
        {
          id: 'doc2',
          content: 'Credit score requirements may vary by loan type and amount.',
          metadata: { source: 'guidelines.pdf', page: 3 },
          score: 0.87,
        },
      ]);

      MockServices.mockLLMService.generateCompletion.mockResolvedValue({
        content: 'Based on the credit policy, the minimum credit score required for personal loans is 650. However, requirements may vary depending on the loan type and amount.',
        usage: { totalTokens: 150 },
      });

      // Act
      const result = await ragService.query({
        query,
        collection: 'credit_policies',
        topK: 5,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.answer).toContain('minimum credit score required for personal loans is 650');
      expect(result.sources).toHaveLength(2);
      expect(result.sources[0].id).toBe('doc1');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.usage.totalTokens).toBe(150);
    });

    test('should use domain-specific configuration', async () => {
      // Arrange
      const query = 'Analyze the risk factors for this application';
      
      MockServices.mockVectorDB.search.mockResolvedValue([
        {
          id: 'risk1',
          content: 'High debt-to-income ratio is a significant risk factor.',
          metadata: { source: 'risk_model.pdf' },
          score: 0.92,
        },
      ]);

      MockServices.mockLLMService.generateCompletion.mockResolvedValue({
        content: 'As a risk assessment specialist, I can identify that high debt-to-income ratio is indeed a significant risk factor that should be carefully evaluated.',
        usage: { totalTokens: 120 },
      });

      // Act
      const result = await ragService.query({
        query,
        domain: 'risk',
        topK: 3,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.answer).toContain('risk assessment specialist');
      expect(MockServices.mockLLMService.generateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: 'You are a risk assessment specialist.',
          temperature: 0.1,
        })
      );
    });

    test('should handle conversation memory', async () => {
      // Arrange
      const conversationId = 'test-conversation-1';
      const query1 = 'What is the minimum credit score?';
      const query2 = 'What about for business loans?';

      MockServices.mockVectorDB.search.mockResolvedValue([
        {
          id: 'doc1',
          content: 'Minimum credit score of 650 for personal loans, 700 for business loans.',
          metadata: { source: 'policy.pdf' },
          score: 0.9,
        },
      ]);

      MockServices.mockLLMService.generateCompletion
        .mockResolvedValueOnce({
          content: 'The minimum credit score is 650 for personal loans.',
          usage: { totalTokens: 100 },
        })
        .mockResolvedValueOnce({
          content: 'For business loans, the minimum credit score is 700.',
          usage: { totalTokens: 110 },
        });

      // Act
      const result1 = await ragService.conversationQuery({
        query: query1,
        conversationId,
        collection: 'credit_policies',
      });

      const result2 = await ragService.conversationQuery({
        query: query2,
        conversationId,
        collection: 'credit_policies',
      });

      // Assert
      expect(result1.answer).toContain('650 for personal loans');
      expect(result2.answer).toContain('business loans, the minimum credit score is 700');
      
      // Verify conversation memory was used
      const secondCallArgs = MockServices.mockLLMService.generateCompletion.mock.calls[1][0];
      expect(secondCallArgs.messages).toHaveLength(3); // system + previous Q&A + current query
    });

    test('should use caching for repeated queries', async () => {
      // Arrange
      const query = 'What is the approval process?';
      const cacheKey = expect.stringContaining('rag_query:');
      
      const mockResponse = {
        answer: 'The approval process involves risk assessment and decision making.',
        sources: [],
        confidence: 0.8,
        usage: { totalTokens: 100 },
      };

      MockServices.mockVectorDB.search.mockResolvedValue([]);
      MockServices.mockLLMService.generateCompletion.mockResolvedValue({
        content: mockResponse.answer,
        usage: mockResponse.usage,
      });

      // Act - First query
      const result1 = await ragService.query({
        query,
        collection: 'credit_policies',
        enableCaching: true,
      });

      // Act - Second query (should use cache)
      const result2 = await ragService.query({
        query,
        collection: 'credit_policies',
        enableCaching: true,
      });

      // Assert
      expect(result1.answer).toBe(mockResponse.answer);
      expect(result2.answer).toBe(mockResponse.answer);
      
      // LLM should only be called once due to caching
      expect(MockServices.mockLLMService.generateCompletion).toHaveBeenCalledTimes(1);
    });

    test('should handle empty search results', async () => {
      // Arrange
      const query = 'What is the policy on alien loans?';
      
      MockServices.mockVectorDB.search.mockResolvedValue([]);
      MockServices.mockLLMService.generateCompletion.mockResolvedValue({
        content: 'I don\'t have specific information about that topic in the available documents.',
        usage: { totalTokens: 50 },
      });

      // Act
      const result = await ragService.query({
        query,
        collection: 'credit_policies',
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.answer).toContain('don\'t have specific information');
      expect(result.sources).toHaveLength(0);
      expect(result.confidence).toBeLessThan(0.5);
    });

    test('should handle LLM service errors gracefully', async () => {
      // Arrange
      const query = 'Test query';
      
      MockServices.mockVectorDB.search.mockResolvedValue([
        {
          id: 'doc1',
          content: 'Test content',
          metadata: { source: 'test.pdf' },
          score: 0.9,
        },
      ]);

      MockServices.mockLLMService.generateCompletion.mockRejectedValue(
        new Error('LLM service unavailable')
      );

      // Act & Assert
      await expect(
        ragService.query({
          query,
          collection: 'test_collection',
        })
      ).rejects.toThrow('LLM service unavailable');
    });

    test('should validate query parameters', async () => {
      // Act & Assert
      await expect(
        ragService.query({
          query: '',
          collection: 'test_collection',
        })
      ).rejects.toThrow('Query cannot be empty');

      await expect(
        ragService.query({
          query: 'test',
          collection: '',
        })
      ).rejects.toThrow('Collection cannot be empty');

      await expect(
        ragService.query({
          query: 'test',
          collection: 'test_collection',
          topK: 0,
        })
      ).rejects.toThrow('topK must be greater than 0');
    });
  });

  describe('ingestDocuments', () => {
    test('should ingest documents successfully', async () => {
      // Arrange
      const documents = [
        {
          content: 'Credit policy document content',
          metadata: {
            title: 'Credit Policy',
            source: 'policy.pdf',
            type: 'CREDIT_POLICY',
          },
        },
        {
          content: 'Risk guidelines document content',
          metadata: {
            title: 'Risk Guidelines',
            source: 'risk.pdf',
            type: 'RISK_GUIDELINES',
          },
        },
      ];

      MockServices.mockVectorDB.addDocuments.mockResolvedValue(true);

      // Act
      const result = await ragService.ingestDocuments({
        documents,
        collection: 'credit_policies',
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.documentsProcessed).toBe(2);
      expect(result.chunksCreated).toBeGreaterThan(0);
      expect(MockServices.mockVectorDB.addDocuments).toHaveBeenCalled();
    });

    test('should handle document chunking', async () => {
      // Arrange
      const longContent = 'A'.repeat(5000); // Long document that needs chunking
      const documents = [
        {
          content: longContent,
          metadata: {
            title: 'Long Document',
            source: 'long.pdf',
          },
        },
      ];

      MockServices.mockVectorDB.addDocuments.mockResolvedValue(true);

      // Act
      const result = await ragService.ingestDocuments({
        documents,
        collection: 'test_collection',
        chunkSize: 1000,
        chunkOverlap: 100,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.chunksCreated).toBeGreaterThan(1); // Should create multiple chunks
    });

    test('should handle duplicate documents', async () => {
      // Arrange
      const documents = [
        {
          content: 'Duplicate content',
          metadata: {
            title: 'Document 1',
            source: 'doc1.pdf',
            hash: 'abc123',
          },
        },
        {
          content: 'Duplicate content',
          metadata: {
            title: 'Document 2',
            source: 'doc2.pdf',
            hash: 'abc123',
          },
        },
      ];

      MockServices.mockVectorDB.addDocuments.mockResolvedValue(true);

      // Act
      const result = await ragService.ingestDocuments({
        documents,
        collection: 'test_collection',
        deduplication: true,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.documentsProcessed).toBe(1); // Only one document should be processed
      expect(result.duplicatesSkipped).toBe(1);
    });
  });

  describe('clearConversationMemory', () => {
    test('should clear conversation memory', async () => {
      // Arrange
      const conversationId = 'test-conversation';
      
      // Add some conversation memory
      await ragService.conversationQuery({
        query: 'Test query',
        conversationId,
        collection: 'test_collection',
      });

      // Act
      await ragService.clearConversationMemory(conversationId);

      // Assert
      const memoryKey = `conversation_memory:${conversationId}`;
      const memory = await testCache.get(memoryKey);
      expect(memory).toBeNull();
    });
  });
});
