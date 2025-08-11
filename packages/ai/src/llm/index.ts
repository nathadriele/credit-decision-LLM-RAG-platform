// =============================================================================
// LLM SERVICE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import OpenAI from 'openai';

// =============================================================================
// LLM INTERFACES
// =============================================================================

export interface ILLMConfig {
  provider: 'openai' | 'bedrock' | 'azure';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number;
}

export interface ILLMRequest {
  messages: IMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  functions?: IFunction[];
  functionCall?: 'auto' | 'none' | { name: string };
  metadata?: Record<string, unknown>;
}

export interface IMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

export interface IFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ILLMResponse {
  id: string;
  content: string;
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  processingTime: number;
  functionCall?: {
    name: string;
    arguments: string;
  };
  metadata?: Record<string, unknown>;
}

export interface ILLMService {
  initialize(): Promise<void>;
  generateResponse(request: ILLMRequest): Promise<ILLMResponse>;
  generateStreamResponse(request: ILLMRequest): AsyncIterable<Partial<ILLMResponse>>;
  healthCheck(): Promise<boolean>;
  cleanup(): Promise<void>;
}

// =============================================================================
// LLM SERVICE IMPLEMENTATION
// =============================================================================

export class LLMService implements ILLMService {
  private config: ILLMConfig;
  private openaiClient?: OpenAI;

  constructor(config: ILLMConfig) {
    this.config = {
      temperature: 0.1,
      maxTokens: 4096,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      timeout: 60000,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'openai':
          await this.initializeOpenAI();
          break;
        case 'bedrock':
          await this.initializeBedrock();
          break;
        case 'azure':
          await this.initializeAzure();
          break;
        default:
          throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
      }
    } catch (error) {
      throw new Error(`Failed to initialize LLM service: ${error.message}`);
    }
  }

  async generateResponse(request: ILLMRequest): Promise<ILLMResponse> {
    const startTime = Date.now();

    try {
      switch (this.config.provider) {
        case 'openai':
          return await this.generateOpenAIResponse(request, startTime);
        case 'bedrock':
          return await this.generateBedrockResponse(request, startTime);
        case 'azure':
          return await this.generateAzureResponse(request, startTime);
        default:
          throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
      }
    } catch (error) {
      throw new Error(`Failed to generate LLM response: ${error.message}`);
    }
  }

  async *generateStreamResponse(request: ILLMRequest): AsyncIterable<Partial<ILLMResponse>> {
    const startTime = Date.now();

    try {
      switch (this.config.provider) {
        case 'openai':
          yield* this.generateOpenAIStreamResponse(request, startTime);
          break;
        default:
          throw new Error(`Streaming not supported for provider: ${this.config.provider}`);
      }
    } catch (error) {
      throw new Error(`Failed to generate streaming LLM response: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.generateResponse({
        messages: [
          { role: 'user', content: 'Hello, this is a health check.' }
        ],
        maxTokens: 10,
      });
      return response.content.length > 0;
    } catch (error) {
      console.error('LLM service health check failed:', error);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    // Cleanup resources if needed
  }

  // =============================================================================
  // OPENAI IMPLEMENTATION
  // =============================================================================

  private async initializeOpenAI(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.openaiClient = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
    });

    // Test connection
    try {
      await this.openaiClient.models.list();
    } catch (error) {
      throw new Error(`Failed to connect to OpenAI: ${error.message}`);
    }
  }

  private async generateOpenAIResponse(
    request: ILLMRequest,
    startTime: number
  ): Promise<ILLMResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const completion = await this.openaiClient.chat.completions.create({
      model: request.model || this.config.model,
      messages: request.messages,
      temperature: request.temperature ?? this.config.temperature,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      top_p: request.topP ?? this.config.topP,
      frequency_penalty: request.frequencyPenalty ?? this.config.frequencyPenalty,
      presence_penalty: request.presencePenalty ?? this.config.presencePenalty,
      stop: request.stop,
      functions: request.functions,
      function_call: request.functionCall,
      stream: false,
    });

    const choice = completion.choices[0];
    
    return {
      id: completion.id,
      content: choice.message.content || '',
      finishReason: this.mapFinishReason(choice.finish_reason),
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
      model: completion.model,
      processingTime: Date.now() - startTime,
      functionCall: choice.message.function_call ? {
        name: choice.message.function_call.name,
        arguments: choice.message.function_call.arguments,
      } : undefined,
      metadata: request.metadata,
    };
  }

  private async *generateOpenAIStreamResponse(
    request: ILLMRequest,
    startTime: number
  ): AsyncIterable<Partial<ILLMResponse>> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const stream = await this.openaiClient.chat.completions.create({
      model: request.model || this.config.model,
      messages: request.messages,
      temperature: request.temperature ?? this.config.temperature,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      top_p: request.topP ?? this.config.topP,
      frequency_penalty: request.frequencyPenalty ?? this.config.frequencyPenalty,
      presence_penalty: request.presencePenalty ?? this.config.presencePenalty,
      stop: request.stop,
      functions: request.functions,
      function_call: request.functionCall,
      stream: true,
    });

    let content = '';
    let functionCall: { name: string; arguments: string } | undefined;

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      
      if (choice.delta.content) {
        content += choice.delta.content;
        yield {
          content: choice.delta.content,
          processingTime: Date.now() - startTime,
        };
      }

      if (choice.delta.function_call) {
        if (!functionCall) {
          functionCall = { name: '', arguments: '' };
        }
        
        if (choice.delta.function_call.name) {
          functionCall.name += choice.delta.function_call.name;
        }
        
        if (choice.delta.function_call.arguments) {
          functionCall.arguments += choice.delta.function_call.arguments;
        }
      }

      if (choice.finish_reason) {
        yield {
          id: chunk.id,
          content,
          finishReason: this.mapFinishReason(choice.finish_reason),
          model: chunk.model,
          processingTime: Date.now() - startTime,
          functionCall,
          metadata: request.metadata,
        };
      }
    }
  }

  // =============================================================================
  // BEDROCK IMPLEMENTATION
  // =============================================================================

  private async initializeBedrock(): Promise<void> {
    // Initialize AWS Bedrock client
    throw new Error('Bedrock LLM provider not implemented');
  }

  private async generateBedrockResponse(
    request: ILLMRequest,
    startTime: number
  ): Promise<ILLMResponse> {
    // Implement Bedrock LLM generation
    throw new Error('Bedrock LLM generation not implemented');
  }

  // =============================================================================
  // AZURE IMPLEMENTATION
  // =============================================================================

  private async initializeAzure(): Promise<void> {
    // Initialize Azure OpenAI client
    throw new Error('Azure LLM provider not implemented');
  }

  private async generateAzureResponse(
    request: ILLMRequest,
    startTime: number
  ): Promise<ILLMResponse> {
    // Implement Azure OpenAI generation
    throw new Error('Azure LLM generation not implemented');
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private mapFinishReason(reason: string | null): 'stop' | 'length' | 'function_call' | 'content_filter' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'function_call':
        return 'function_call';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }

  // =============================================================================
  // CONVERSATION UTILITIES
  // =============================================================================

  static createSystemMessage(content: string): IMessage {
    return { role: 'system', content };
  }

  static createUserMessage(content: string): IMessage {
    return { role: 'user', content };
  }

  static createAssistantMessage(content: string): IMessage {
    return { role: 'assistant', content };
  }

  static createFunctionMessage(name: string, content: string): IMessage {
    return { role: 'function', name, content };
  }

  static truncateMessages(messages: IMessage[], maxTokens: number): IMessage[] {
    // Simple truncation - keep system message and recent messages
    const systemMessages = messages.filter(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    let totalTokens = 0;
    const truncatedMessages: IMessage[] = [...systemMessages];
    
    for (let i = otherMessages.length - 1; i >= 0; i--) {
      const message = otherMessages[i];
      const messageTokens = Math.ceil(message.content.length / 4);
      
      if (totalTokens + messageTokens > maxTokens) {
        break;
      }
      
      totalTokens += messageTokens;
      truncatedMessages.unshift(message);
    }
    
    return truncatedMessages;
  }

  static estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
