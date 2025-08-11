// =============================================================================
// CHROMADB SERVICE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { ChromaApi, OpenAIEmbeddingFunction } from 'chromadb';
import { IVectorDatabase, IDocument, ISearchQuery, ISearchResult } from './index';

// =============================================================================
// CHROMADB CONFIGURATION
// =============================================================================

export interface IChromaDBConfig {
  host?: string;
  port?: number;
  authToken?: string;
  ssl?: boolean;
  timeout?: number;
}

// =============================================================================
// CHROMADB SERVICE IMPLEMENTATION
// =============================================================================

export class ChromaDBService implements IVectorDatabase {
  private client: ChromaApi;
  private config: IChromaDBConfig;
  private embeddingFunction: OpenAIEmbeddingFunction;

  constructor(config: IChromaDBConfig) {
    this.config = {
      host: 'localhost',
      port: 8000,
      ssl: false,
      timeout: 30000,
      ...config,
    };

    // Initialize ChromaDB client
    this.client = new ChromaApi({
      path: `${this.config.ssl ? 'https' : 'http'}://${this.config.host}:${this.config.port}`,
      auth: this.config.authToken ? { provider: 'token', credentials: this.config.authToken } : undefined,
    });

    // Initialize embedding function
    this.embeddingFunction = new OpenAIEmbeddingFunction({
      openai_api_key: process.env.OPENAI_API_KEY || '',
      openai_model: 'text-embedding-ada-002',
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test connection
      await this.client.heartbeat();
      console.log('ChromaDB connection established');
    } catch (error) {
      throw new Error(`Failed to connect to ChromaDB: ${error.message}`);
    }
  }

  async createCollection(name: string, dimension?: number): Promise<void> {
    try {
      await this.client.createCollection({
        name,
        embeddingFunction: this.embeddingFunction,
        metadata: {
          dimension: dimension || 1536,
          created_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      if (error.message?.includes('already exists')) {
        // Collection already exists, which is fine
        return;
      }
      throw new Error(`Failed to create collection ${name}: ${error.message}`);
    }
  }

  async deleteCollection(name: string): Promise<void> {
    try {
      await this.client.deleteCollection({ name });
    } catch (error) {
      throw new Error(`Failed to delete collection ${name}: ${error.message}`);
    }
  }

  async listCollections(): Promise<string[]> {
    try {
      const collections = await this.client.listCollections();
      return collections.map(collection => collection.name);
    } catch (error) {
      throw new Error(`Failed to list collections: ${error.message}`);
    }
  }

  async addDocuments(collection: string, documents: IDocument[]): Promise<void> {
    try {
      const chromaCollection = await this.client.getCollection({
        name: collection,
        embeddingFunction: this.embeddingFunction,
      });

      const ids = documents.map(doc => doc.id);
      const texts = documents.map(doc => doc.content);
      const metadatas = documents.map(doc => doc.metadata);
      const embeddings = documents.some(doc => doc.embedding) 
        ? documents.map(doc => doc.embedding || [])
        : undefined;

      await chromaCollection.add({
        ids,
        documents: texts,
        metadatas,
        embeddings,
      });
    } catch (error) {
      throw new Error(`Failed to add documents to collection ${collection}: ${error.message}`);
    }
  }

  async updateDocument(collection: string, document: IDocument): Promise<void> {
    try {
      const chromaCollection = await this.client.getCollection({
        name: collection,
        embeddingFunction: this.embeddingFunction,
      });

      await chromaCollection.update({
        ids: [document.id],
        documents: [document.content],
        metadatas: [document.metadata],
        embeddings: document.embedding ? [document.embedding] : undefined,
      });
    } catch (error) {
      throw new Error(`Failed to update document ${document.id} in collection ${collection}: ${error.message}`);
    }
  }

  async deleteDocument(collection: string, id: string): Promise<void> {
    try {
      const chromaCollection = await this.client.getCollection({
        name: collection,
        embeddingFunction: this.embeddingFunction,
      });

      await chromaCollection.delete({ ids: [id] });
    } catch (error) {
      throw new Error(`Failed to delete document ${id} from collection ${collection}: ${error.message}`);
    }
  }

  async search(collection: string, query: ISearchQuery): Promise<ISearchResult[]> {
    try {
      const chromaCollection = await this.client.getCollection({
        name: collection,
        embeddingFunction: this.embeddingFunction,
      });

      const searchParams: any = {
        nResults: query.topK || 5,
        include: ['documents', 'metadatas', 'distances'],
      };

      // Use embedding if provided, otherwise use query text
      if (query.embedding) {
        searchParams.queryEmbeddings = [query.embedding];
      } else {
        searchParams.queryTexts = [query.query];
      }

      // Add filters if provided
      if (query.filters) {
        searchParams.where = query.filters;
      }

      const results = await chromaCollection.query(searchParams);

      // Transform results
      const searchResults: ISearchResult[] = [];
      
      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const score = 1 - (results.distances?.[0]?.[i] || 0); // Convert distance to similarity
          
          // Apply threshold filter
          if (query.threshold && score < query.threshold) {
            continue;
          }

          searchResults.push({
            id: results.ids[0][i],
            content: results.documents?.[0]?.[i] || '',
            score,
            metadata: (query.includeMetadata !== false) 
              ? (results.metadatas?.[0]?.[i] || {})
              : {},
          });
        }
      }

      return searchResults;
    } catch (error) {
      throw new Error(`Failed to search collection ${collection}: ${error.message}`);
    }
  }

  async getDocument(collection: string, id: string): Promise<IDocument | null> {
    try {
      const chromaCollection = await this.client.getCollection({
        name: collection,
        embeddingFunction: this.embeddingFunction,
      });

      const results = await chromaCollection.get({
        ids: [id],
        include: ['documents', 'metadatas', 'embeddings'],
      });

      if (!results.ids || results.ids.length === 0) {
        return null;
      }

      return {
        id: results.ids[0],
        content: results.documents?.[0] || '',
        metadata: results.metadatas?.[0] || {},
        embedding: results.embeddings?.[0],
      };
    } catch (error) {
      throw new Error(`Failed to get document ${id} from collection ${collection}: ${error.message}`);
    }
  }

  async getCollectionStats(collection: string): Promise<{
    documentCount: number;
    dimension: number;
  }> {
    try {
      const chromaCollection = await this.client.getCollection({
        name: collection,
        embeddingFunction: this.embeddingFunction,
      });

      const count = await chromaCollection.count();
      
      // Get dimension from collection metadata or default
      const collectionInfo = await this.client.getCollection({ name: collection });
      const dimension = collectionInfo.metadata?.dimension || 1536;

      return {
        documentCount: count,
        dimension: Number(dimension),
      };
    } catch (error) {
      throw new Error(`Failed to get stats for collection ${collection}: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.heartbeat();
      return true;
    } catch (error) {
      console.error('ChromaDB health check failed:', error);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    // ChromaDB client doesn't require explicit cleanup
    // Connection will be closed automatically
  }

  // =============================================================================
  // CHROMADB SPECIFIC METHODS
  // =============================================================================

  async peek(collection: string, limit: number = 10): Promise<IDocument[]> {
    try {
      const chromaCollection = await this.client.getCollection({
        name: collection,
        embeddingFunction: this.embeddingFunction,
      });

      const results = await chromaCollection.peek({ limit });
      
      const documents: IDocument[] = [];
      if (results.ids) {
        for (let i = 0; i < results.ids.length; i++) {
          documents.push({
            id: results.ids[i],
            content: results.documents?.[i] || '',
            metadata: results.metadatas?.[i] || {},
            embedding: results.embeddings?.[i],
          });
        }
      }

      return documents;
    } catch (error) {
      throw new Error(`Failed to peek collection ${collection}: ${error.message}`);
    }
  }

  async reset(): Promise<void> {
    try {
      await this.client.reset();
    } catch (error) {
      throw new Error(`Failed to reset ChromaDB: ${error.message}`);
    }
  }

  async getVersion(): Promise<string> {
    try {
      const version = await this.client.version();
      return version;
    } catch (error) {
      throw new Error(`Failed to get ChromaDB version: ${error.message}`);
    }
  }
}
