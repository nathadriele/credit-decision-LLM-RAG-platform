// =============================================================================
// LANGCHAIN INTEGRATION - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { VectorStore } from '@langchain/core/vectorstores';
import { Document } from '@langchain/core/documents';
import { BaseRetriever } from '@langchain/core/retrievers';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { VectorDatabaseService } from '../vector-db';
import { EmbeddingService } from '../embeddings';

// =============================================================================
// INTERFACES
// =============================================================================

export interface ILangChainConfig {
  openaiApiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  vectorDb: VectorDatabaseService;
  embedding: EmbeddingService;
  defaultCollection: string;
}

export interface IChainQuery {
  query: string;
  collection?: string;
  topK?: number;
  filters?: Record<string, any>;
  chainType?: 'simple' | 'conversational' | 'map_reduce' | 'refine';
}

export interface IChainResponse {
  answer: string;
  sourceDocuments: Document[];
  processingTime: number;
  metadata: {
    chainType: string;
    model: string;
    tokensUsed: number;
  };
}

export interface IWorkflowStep {
  name: string;
  type: 'retrieval' | 'processing' | 'generation' | 'validation';
  config: Record<string, any>;
}

export interface IWorkflow {
  name: string;
  description: string;
  steps: IWorkflowStep[];
  chain: RunnableSequence;
}

// =============================================================================
// CUSTOM VECTOR STORE ADAPTER
// =============================================================================

class CustomVectorStore extends VectorStore {
  private vectorDb: VectorDatabaseService;
  private collection: string;

  constructor(
    embeddings: OpenAIEmbeddings,
    vectorDb: VectorDatabaseService,
    collection: string
  ) {
    super(embeddings, {});
    this.vectorDb = vectorDb;
    this.collection = collection;
  }

  async addDocuments(documents: Document[]): Promise<void> {
    const vectorDocuments = await Promise.all(
      documents.map(async (doc, index) => {
        const embedding = await this.embeddings.embedQuery(doc.pageContent);
        return {
          id: doc.metadata.id || `doc_${index}`,
          content: doc.pageContent,
          metadata: doc.metadata,
          embedding,
        };
      })
    );

    await this.vectorDb.addDocuments(this.collection, vectorDocuments);
  }

  async addVectors(vectors: number[][], documents: Document[]): Promise<void> {
    const vectorDocuments = documents.map((doc, index) => ({
      id: doc.metadata.id || `doc_${index}`,
      content: doc.pageContent,
      metadata: doc.metadata,
      embedding: vectors[index],
    }));

    await this.vectorDb.addDocuments(this.collection, vectorDocuments);
  }

  async similaritySearchWithScore(
    query: string,
    k: number,
    filter?: Record<string, any>
  ): Promise<[Document, number][]> {
    const embedding = await this.embeddings.embedQuery(query);
    
    const results = await this.vectorDb.search(this.collection, {
      query,
      embedding,
      topK: k,
      filters: filter,
    });

    return results.map(result => [
      new Document({
        pageContent: result.content,
        metadata: result.metadata,
      }),
      result.score,
    ]);
  }

  async similaritySearch(
    query: string,
    k: number,
    filter?: Record<string, any>
  ): Promise<Document[]> {
    const results = await this.similaritySearchWithScore(query, k, filter);
    return results.map(([doc]) => doc);
  }

  static async fromDocuments(
    docs: Document[],
    embeddings: OpenAIEmbeddings,
    vectorDb: VectorDatabaseService,
    collection: string
  ): Promise<CustomVectorStore> {
    const instance = new CustomVectorStore(embeddings, vectorDb, collection);
    await instance.addDocuments(docs);
    return instance;
  }
}

// =============================================================================
// CUSTOM RETRIEVER
// =============================================================================

class CustomRetriever extends BaseRetriever {
  private vectorStore: CustomVectorStore;
  private topK: number;
  private filters?: Record<string, any>;

  constructor(
    vectorStore: CustomVectorStore,
    topK: number = 5,
    filters?: Record<string, any>
  ) {
    super();
    this.vectorStore = vectorStore;
    this.topK = topK;
    this.filters = filters;
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    return this.vectorStore.similaritySearch(query, this.topK, this.filters);
  }
}

// =============================================================================
// LANGCHAIN SERVICE
// =============================================================================

export class LangChainService {
  private llm: BaseLanguageModel;
  private embeddings: OpenAIEmbeddings;
  private vectorDb: VectorDatabaseService;
  private embeddingService: EmbeddingService;
  private config: ILangChainConfig;
  private workflows: Map<string, IWorkflow> = new Map();

  constructor(config: ILangChainConfig) {
    this.config = config;
    this.vectorDb = config.vectorDb;
    this.embeddingService = config.embedding;
    
    this.llm = new ChatOpenAI({
      openAIApiKey: config.openaiApiKey,
      modelName: config.model || 'gpt-4',
      temperature: config.temperature || 0.1,
      maxTokens: config.maxTokens || 1000,
    });

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openaiApiKey,
    });

    this.initializeWorkflows();
  }

  async initialize(): Promise<void> {
    await this.vectorDb.initialize();
    await this.embeddingService.initialize();
  }

  async createRAGChain(collection?: string): Promise<RunnableSequence> {
    const vectorStore = new CustomVectorStore(
      this.embeddings,
      this.vectorDb,
      collection || this.config.defaultCollection
    );

    const retriever = new CustomRetriever(vectorStore, 5);

    const prompt = PromptTemplate.fromTemplate(`
You are a credit decision expert. Use the following context to answer the question accurately.

Context: {context}

Question: {question}

Provide a detailed answer based on the context. If the context doesn't contain enough information, indicate what's missing.

Answer:`);

    const formatDocs = (docs: Document[]) => {
      return docs.map(doc => doc.pageContent).join('\n\n');
    };

    const ragChain = RunnableSequence.from([
      {
        context: retriever.pipe(formatDocs),
        question: new RunnablePassthrough(),
      },
      prompt,
      this.llm,
      new StringOutputParser(),
    ]);

    return ragChain;
  }

  async createConversationalChain(collection?: string): Promise<RunnableSequence> {
    const vectorStore = new CustomVectorStore(
      this.embeddings,
      this.vectorDb,
      collection || this.config.defaultCollection
    );

    const retriever = new CustomRetriever(vectorStore, 5);

    const prompt = PromptTemplate.fromTemplate(`
You are a credit decision expert engaged in a conversation. Use the context and chat history to provide accurate answers.

Context: {context}

Chat History: {chat_history}

Current Question: {question}

Provide a conversational response that takes into account the previous discussion.

Answer:`);

    const formatDocs = (docs: Document[]) => {
      return docs.map(doc => doc.pageContent).join('\n\n');
    };

    const conversationalChain = RunnableSequence.from([
      {
        context: retriever.pipe(formatDocs),
        chat_history: new RunnablePassthrough(),
        question: new RunnablePassthrough(),
      },
      prompt,
      this.llm,
      new StringOutputParser(),
    ]);

    return conversationalChain;
  }

  async createMapReduceChain(collection?: string): Promise<RunnableSequence> {
    const vectorStore = new CustomVectorStore(
      this.embeddings,
      this.vectorDb,
      collection || this.config.defaultCollection
    );

    const retriever = new CustomRetriever(vectorStore, 10); // Get more docs for map-reduce

    const mapPrompt = PromptTemplate.fromTemplate(`
Analyze the following document excerpt and extract key information relevant to the question.

Document: {document}

Question: {question}

Key Information:`);

    const reducePrompt = PromptTemplate.fromTemplate(`
Combine the following key information to provide a comprehensive answer to the question.

Key Information:
{summaries}

Question: {question}

Comprehensive Answer:`);

    // Map step: process each document
    const mapChain = RunnableSequence.from([
      mapPrompt,
      this.llm,
      new StringOutputParser(),
    ]);

    // Reduce step: combine all summaries
    const reduceChain = RunnableSequence.from([
      reducePrompt,
      this.llm,
      new StringOutputParser(),
    ]);

    const mapReduceChain = RunnableSequence.from([
      {
        documents: retriever,
        question: new RunnablePassthrough(),
      },
      async (input) => {
        const { documents, question } = input;
        
        // Map step
        const summaries = await Promise.all(
          documents.map(doc => 
            mapChain.invoke({ document: doc.pageContent, question })
          )
        );

        // Reduce step
        return reduceChain.invoke({
          summaries: summaries.join('\n\n'),
          question,
        });
      },
    ]);

    return mapReduceChain;
  }

  async query(request: IChainQuery): Promise<IChainResponse> {
    const startTime = Date.now();
    
    try {
      let chain: RunnableSequence;
      
      switch (request.chainType) {
        case 'conversational':
          chain = await this.createConversationalChain(request.collection);
          break;
        case 'map_reduce':
          chain = await this.createMapReduceChain(request.collection);
          break;
        case 'refine':
          chain = await this.createRefineChain(request.collection);
          break;
        default:
          chain = await this.createRAGChain(request.collection);
      }

      const result = await chain.invoke(request.query);

      // Get source documents for reference
      const vectorStore = new CustomVectorStore(
        this.embeddings,
        this.vectorDb,
        request.collection || this.config.defaultCollection
      );

      const sourceDocuments = await vectorStore.similaritySearch(
        request.query,
        request.topK || 5,
        request.filters
      );

      return {
        answer: result,
        sourceDocuments,
        processingTime: Date.now() - startTime,
        metadata: {
          chainType: request.chainType || 'simple',
          model: this.config.model || 'gpt-4',
          tokensUsed: 0, // Would need to track this properly
        },
      };

    } catch (error) {
      throw new Error(`LangChain query failed: ${error.message}`);
    }
  }

  async createCustomWorkflow(
    name: string,
    description: string,
    steps: IWorkflowStep[]
  ): Promise<IWorkflow> {
    const runnables: any[] = [];

    for (const step of steps) {
      switch (step.type) {
        case 'retrieval':
          const vectorStore = new CustomVectorStore(
            this.embeddings,
            this.vectorDb,
            step.config.collection || this.config.defaultCollection
          );
          const retriever = new CustomRetriever(
            vectorStore,
            step.config.topK || 5,
            step.config.filters
          );
          runnables.push(retriever);
          break;

        case 'processing':
          const processingPrompt = PromptTemplate.fromTemplate(step.config.template);
          runnables.push(processingPrompt);
          break;

        case 'generation':
          runnables.push(this.llm);
          runnables.push(new StringOutputParser());
          break;

        case 'validation':
          // Custom validation logic would go here
          runnables.push(new RunnablePassthrough());
          break;
      }
    }

    const chain = RunnableSequence.from(runnables);

    const workflow: IWorkflow = {
      name,
      description,
      steps,
      chain,
    };

    this.workflows.set(name, workflow);
    return workflow;
  }

  async executeWorkflow(workflowName: string, input: any): Promise<any> {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new Error(`Workflow ${workflowName} not found`);
    }

    return workflow.chain.invoke(input);
  }

  getWorkflow(name: string): IWorkflow | undefined {
    return this.workflows.get(name);
  }

  listWorkflows(): string[] {
    return Array.from(this.workflows.keys());
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private async createRefineChain(collection?: string): Promise<RunnableSequence> {
    const vectorStore = new CustomVectorStore(
      this.embeddings,
      this.vectorDb,
      collection || this.config.defaultCollection
    );

    const retriever = new CustomRetriever(vectorStore, 10);

    const initialPrompt = PromptTemplate.fromTemplate(`
Based on the following document, provide an initial answer to the question.

Document: {document}

Question: {question}

Initial Answer:`);

    const refinePrompt = PromptTemplate.fromTemplate(`
You have an existing answer to a question. Use the new document to refine and improve your answer.

Existing Answer: {existing_answer}

New Document: {document}

Question: {question}

Refined Answer:`);

    const refineChain = RunnableSequence.from([
      {
        documents: retriever,
        question: new RunnablePassthrough(),
      },
      async (input) => {
        const { documents, question } = input;
        
        if (documents.length === 0) {
          return "No relevant documents found.";
        }

        // Initial answer from first document
        let answer = await initialPrompt
          .pipe(this.llm)
          .pipe(new StringOutputParser())
          .invoke({
            document: documents[0].pageContent,
            question,
          });

        // Refine with remaining documents
        for (let i = 1; i < documents.length; i++) {
          answer = await refinePrompt
            .pipe(this.llm)
            .pipe(new StringOutputParser())
            .invoke({
              existing_answer: answer,
              document: documents[i].pageContent,
              question,
            });
        }

        return answer;
      },
    ]);

    return refineChain;
  }

  private initializeWorkflows(): void {
    // Initialize default workflows
    this.createDefaultCreditWorkflow();
    this.createDefaultRiskWorkflow();
    this.createDefaultComplianceWorkflow();
  }

  private async createDefaultCreditWorkflow(): Promise<void> {
    const steps: IWorkflowStep[] = [
      {
        name: 'retrieve_credit_policies',
        type: 'retrieval',
        config: {
          collection: 'credit_policies',
          topK: 5,
        },
      },
      {
        name: 'analyze_credit_context',
        type: 'processing',
        config: {
          template: `Analyze the following credit policies for the given question:

Policies: {context}

Question: {question}

Analysis:`,
        },
      },
      {
        name: 'generate_credit_response',
        type: 'generation',
        config: {},
      },
    ];

    await this.createCustomWorkflow(
      'credit_analysis',
      'Analyze credit-related queries using policy documents',
      steps
    );
  }

  private async createDefaultRiskWorkflow(): Promise<void> {
    const steps: IWorkflowStep[] = [
      {
        name: 'retrieve_risk_guidelines',
        type: 'retrieval',
        config: {
          collection: 'risk_guidelines',
          topK: 7,
        },
      },
      {
        name: 'assess_risk_factors',
        type: 'processing',
        config: {
          template: `Assess risk factors based on the following guidelines:

Guidelines: {context}

Question: {question}

Risk Assessment:`,
        },
      },
      {
        name: 'generate_risk_response',
        type: 'generation',
        config: {},
      },
    ];

    await this.createCustomWorkflow(
      'risk_assessment',
      'Assess risk factors using risk management guidelines',
      steps
    );
  }

  private async createDefaultComplianceWorkflow(): Promise<void> {
    const steps: IWorkflowStep[] = [
      {
        name: 'retrieve_regulations',
        type: 'retrieval',
        config: {
          collection: 'regulations',
          topK: 5,
        },
      },
      {
        name: 'check_compliance',
        type: 'processing',
        config: {
          template: `Check compliance requirements based on regulations:

Regulations: {context}

Question: {question}

Compliance Check:`,
        },
      },
      {
        name: 'generate_compliance_response',
        type: 'generation',
        config: {},
      },
      {
        name: 'validate_compliance',
        type: 'validation',
        config: {},
      },
    ];

    await this.createCustomWorkflow(
      'compliance_check',
      'Check compliance requirements against regulations',
      steps
    );
  }

  async cleanup(): Promise<void> {
    this.workflows.clear();
  }
}
