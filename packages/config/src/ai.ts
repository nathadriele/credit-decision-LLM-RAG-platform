// =============================================================================
// AI CONFIGURATION - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import Joi from 'joi';

export interface AIConfig {
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
  };
  chromadb: {
    host: string;
    port: number;
    timeout: number;
  };
  rag: {
    chunkSize: number;
    chunkOverlap: number;
    topK: number;
    enableConversationMemory: boolean;
    enableCaching: boolean;
    cacheTimeout: number;
  };
}

const aiSchema = Joi.object({
  openai: Joi.object({
    apiKey: Joi.string().required(),
    model: Joi.string().default('gpt-4'),
    maxTokens: Joi.number().min(100).max(8000).default(4000),
    temperature: Joi.number().min(0).max(2).default(0.1),
    timeout: Joi.number().min(5000).default(30000),
  }).required(),
  chromadb: Joi.object({
    host: Joi.string().default('localhost'),
    port: Joi.number().port().default(8000),
    timeout: Joi.number().min(5000).default(10000),
  }).required(),
  rag: Joi.object({
    chunkSize: Joi.number().min(100).max(2000).default(1000),
    chunkOverlap: Joi.number().min(0).max(500).default(200),
    topK: Joi.number().min(1).max(20).default(5),
    enableConversationMemory: Joi.boolean().default(true),
    enableCaching: Joi.boolean().default(true),
    cacheTimeout: Joi.number().min(300).default(3600),
  }).required(),
});

export const getAIConfig = (): AIConfig => {
  const config = {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.1'),
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
    },
    chromadb: {
      host: process.env.CHROMADB_HOST || 'localhost',
      port: parseInt(process.env.CHROMADB_PORT || '8000'),
      timeout: parseInt(process.env.CHROMADB_TIMEOUT || '10000'),
    },
    rag: {
      chunkSize: parseInt(process.env.RAG_CHUNK_SIZE || '1000'),
      chunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP || '200'),
      topK: parseInt(process.env.RAG_TOP_K || '5'),
      enableConversationMemory: process.env.RAG_ENABLE_CONVERSATION_MEMORY !== 'false',
      enableCaching: process.env.RAG_ENABLE_CACHING !== 'false',
      cacheTimeout: parseInt(process.env.RAG_CACHE_TIMEOUT || '3600'),
    },
  };

  const { error, value } = aiSchema.validate(config);
  if (error) {
    throw new Error(`AI configuration error: ${error.message}`);
  }

  return value;
};
