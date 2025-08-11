// =============================================================================
// VECTOR DATABASE SERVICE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { ChromaDBService } from './chromadb';
import { FAISSService } from './faiss';
import { PineconeService } from './pinecone';

// =============================================================================
// VECTOR DATABASE INTERFACE
// =============================================================================

export interface IVectorDatabaseConfig {
  type: 'chromadb' | 'faiss' | 'pinecone';
  config: Record<string, unknown>;
}

export interface IDocument {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
}

export interface ISearchQuery {
  query: string;
  embedding?: number[];
  topK?: number;
  threshold?: number;
  filters?: Record<string, unknown>;
  includeMetadata?: boolean;
}

export interface ISearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface IVectorDatabase {
  initialize(): Promise<void>;
  createCollection(name: string, dimension?: number): Promise<void>;
  deleteCollection(name: string): Promise<void>;
  listCollections(): Promise<string[]>;
  addDocuments(collection: string, documents: IDocument[]): Promise<void>;
  updateDocument(collection: string, document: IDocument): Promise<void>;
  deleteDocument(collection: string, id: string): Promise<void>;
  search(collection: string, query: ISearchQuery): Promise<ISearchResult[]>;
  getDocument(collection: string, id: string): Promise<IDocument | null>;
  getCollectionStats(collection: string): Promise<{
    documentCount: number;
    dimension: number;
  }>;
  healthCheck(): Promise<boolean>;
  cleanup(): Promise<void>;
}

// =============================================================================
// VECTOR DATABASE SERVICE FACTORY
// =============================================================================

export class VectorDatabaseService implements IVectorDatabase {
  private service: IVectorDatabase;

  constructor(config: IVectorDatabaseConfig) {
    switch (config.type) {
      case 'chromadb':
        this.service = new ChromaDBService(config.config);
        break;
      case 'faiss':
        this.service = new FAISSService(config.config);
        break;
      case 'pinecone':
        this.service = new PineconeService(config.config);
        break;
      default:
        throw new Error(`Unsupported vector database type: ${config.type}`);
    }
  }

  async initialize(): Promise<void> {
    return this.service.initialize();
  }

  async createCollection(name: string, dimension?: number): Promise<void> {
    return this.service.createCollection(name, dimension);
  }

  async deleteCollection(name: string): Promise<void> {
    return this.service.deleteCollection(name);
  }

  async listCollections(): Promise<string[]> {
    return this.service.listCollections();
  }

  async addDocuments(collection: string, documents: IDocument[]): Promise<void> {
    return this.service.addDocuments(collection, documents);
  }

  async updateDocument(collection: string, document: IDocument): Promise<void> {
    return this.service.updateDocument(collection, document);
  }

  async deleteDocument(collection: string, id: string): Promise<void> {
    return this.service.deleteDocument(collection, id);
  }

  async search(collection: string, query: ISearchQuery): Promise<ISearchResult[]> {
    return this.service.search(collection, query);
  }

  async getDocument(collection: string, id: string): Promise<IDocument | null> {
    return this.service.getDocument(collection, id);
  }

  async getCollectionStats(collection: string): Promise<{
    documentCount: number;
    dimension: number;
  }> {
    return this.service.getCollectionStats(collection);
  }

  async healthCheck(): Promise<boolean> {
    return this.service.healthCheck();
  }

  async cleanup(): Promise<void> {
    return this.service.cleanup();
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export * from './chromadb';
export * from './faiss';
export * from './pinecone';
