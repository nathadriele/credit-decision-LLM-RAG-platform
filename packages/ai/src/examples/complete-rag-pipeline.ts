// =============================================================================
// COMPLETE RAG PIPELINE EXAMPLE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import {
  LLMService,
  EmbeddingService,
  VectorDatabaseService,
  DocumentIngestionService,
  AdvancedRetrievalService,
  EnhancedRAGService,
  LangChainService,
  DocumentType,
} from '../index';

// =============================================================================
// EXAMPLE: COMPLETE RAG PIPELINE SETUP AND USAGE
// =============================================================================

export class CompleteRAGPipelineExample {
  private llm: LLMService;
  private embedding: EmbeddingService;
  private vectorDb: VectorDatabaseService;
  private ingestion: DocumentIngestionService;
  private retrieval: AdvancedRetrievalService;
  private enhancedRAG: EnhancedRAGService;
  private langchain: LangChainService;

  constructor() {
    this.initializeServices();
  }

  private initializeServices(): void {
    // Initialize core services
    this.llm = new LLMService({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: process.env.OPENAI_API_KEY!,
      temperature: 0.1,
      maxTokens: 1000,
    });

    this.embedding = new EmbeddingService({
      provider: 'openai',
      model: 'text-embedding-ada-002',
      apiKey: process.env.OPENAI_API_KEY!,
    });

    this.vectorDb = new VectorDatabaseService({
      provider: 'chromadb',
      host: process.env.CHROMADB_HOST || 'localhost',
      port: parseInt(process.env.CHROMADB_PORT || '8000'),
    });

    // Initialize advanced services
    this.ingestion = new DocumentIngestionService({
      vectorDb: this.vectorDb,
      embedding: this.embedding,
      chunkSize: 1000,
      chunkOverlap: 200,
      batchSize: 10,
      enableDeduplication: true,
      enableMetadataExtraction: true,
      supportedFormats: ['txt', 'pdf', 'docx'],
      maxFileSize: 10 * 1024 * 1024,
    });

    this.retrieval = new AdvancedRetrievalService({
      vectorDb: this.vectorDb,
      embedding: this.embedding,
      defaultCollection: 'credit_documents',
      defaultTopK: 5,
      defaultThreshold: 0.7,
      enableQueryExpansion: true,
      enableReranking: true,
      rerankingConfig: {
        enabled: true,
        model: 'semantic',
        threshold: 0.8,
        maxResults: 10,
      },
      enableHybridSearch: true,
      keywordWeight: 0.3,
      semanticWeight: 0.7,
    });

    this.enhancedRAG = new EnhancedRAGService({
      llm: this.llm,
      vectorDb: this.vectorDb,
      embedding: this.embedding,
      retrieval: this.retrieval,
      ingestion: this.ingestion,
      defaultCollection: 'credit_documents',
      defaultTopK: 5,
      defaultThreshold: 0.7,
      maxContextLength: 4000,
      enableCaching: true,
      enableConversationMemory: true,
      maxConversationTurns: 10,
      enableCitations: true,
      enableFollowUpQuestions: true,
      enableDomainSpecialization: true,
    });

    this.langchain = new LangChainService({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
      temperature: 0.1,
      maxTokens: 1000,
      vectorDb: this.vectorDb,
      embedding: this.embedding,
      defaultCollection: 'credit_documents',
    });
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing RAG Pipeline...');
    
    await this.llm.initialize();
    await this.embedding.initialize();
    await this.vectorDb.initialize();
    await this.ingestion.initialize();
    await this.retrieval.initialize();
    await this.enhancedRAG.initialize();
    await this.langchain.initialize();

    console.log('✅ RAG Pipeline initialized successfully!');
  }

  // =============================================================================
  // STEP 1: DOCUMENT INGESTION
  // =============================================================================

  async ingestSampleDocuments(): Promise<void> {
    console.log('📄 Ingesting sample documents...');

    const sampleDocuments = [
      {
        content: `
# Credit Policy Guidelines

## Overview
This document outlines the credit policy guidelines for loan applications and risk assessment procedures.

## Credit Scoring Criteria
- Minimum credit score: 650
- Debt-to-income ratio: Maximum 40%
- Employment history: Minimum 2 years
- Income verification required

## Risk Assessment Process
1. Initial application review
2. Credit bureau check
3. Income verification
4. Collateral assessment
5. Final decision

## Approval Limits
- Personal loans: Up to $50,000
- Business loans: Up to $500,000
- Mortgage loans: Up to $1,000,000
        `,
        metadata: {
          title: 'Credit Policy Guidelines',
          type: DocumentType.CREDIT_POLICY,
          source: 'internal_policies',
          author: 'Risk Management Team',
          category: 'lending',
          version: '2.1',
        },
      },
      {
        content: `
# Risk Assessment Framework

## Risk Categories
### High Risk
- Credit score below 600
- DTI ratio above 50%
- Recent bankruptcies
- Irregular income

### Medium Risk
- Credit score 600-700
- DTI ratio 30-50%
- Limited credit history
- Self-employed applicants

### Low Risk
- Credit score above 700
- DTI ratio below 30%
- Stable employment
- Strong credit history

## Mitigation Strategies
- Require additional collateral
- Increase interest rates
- Reduce loan amounts
- Add co-signers
        `,
        metadata: {
          title: 'Risk Assessment Framework',
          type: DocumentType.RISK_GUIDELINE,
          source: 'risk_management',
          author: 'Risk Analysis Team',
          category: 'risk',
          version: '1.5',
        },
      },
      {
        content: `
# Regulatory Compliance Manual

## Fair Lending Practices
All lending decisions must comply with:
- Equal Credit Opportunity Act (ECOA)
- Fair Housing Act
- Truth in Lending Act (TILA)
- Fair Credit Reporting Act (FCRA)

## Documentation Requirements
- Complete application forms
- Income verification documents
- Credit reports
- Property appraisals
- Decision rationale

## Audit Trail
Maintain complete records of:
- Application processing steps
- Decision criteria used
- Risk factors considered
- Approval/denial reasons
        `,
        metadata: {
          title: 'Regulatory Compliance Manual',
          type: DocumentType.REGULATION,
          source: 'compliance_team',
          author: 'Legal Department',
          category: 'compliance',
          version: '3.0',
        },
      },
    ];

    // Ingest documents with progress tracking
    for (const doc of sampleDocuments) {
      console.log(`📝 Ingesting: ${doc.metadata.title}`);
      
      const result = await this.ingestion.ingestDocument(
        doc.content,
        doc.metadata,
        'credit_documents'
      );

      console.log(`✅ Ingested: ${result.metadata.title} (${result.chunksProcessed} chunks)`);
    }

    console.log('📚 All sample documents ingested successfully!');
  }

  // =============================================================================
  // STEP 2: BASIC RAG QUERIES
  // =============================================================================

  async demonstrateBasicRAG(): Promise<void> {
    console.log('\n🔍 Demonstrating Basic RAG Queries...');

    const queries = [
      'What is the minimum credit score required for loan approval?',
      'What are the risk categories and their criteria?',
      'What documentation is required for compliance?',
    ];

    for (const query of queries) {
      console.log(`\n❓ Query: ${query}`);
      
      const response = await this.enhancedRAG.query({
        query,
        collection: 'credit_documents',
        topK: 3,
        responseFormat: 'detailed',
        citationStyle: 'numbered',
        domain: 'credit',
      });

      console.log(`💬 Answer: ${response.answer}`);
      console.log(`🎯 Confidence: ${(response.confidence * 100).toFixed(1)}%`);
      console.log(`📊 Sources: ${response.sources.length}`);
      
      if (response.followUpQuestions && response.followUpQuestions.length > 0) {
        console.log(`❓ Follow-up questions:`);
        response.followUpQuestions.forEach((q, i) => {
          console.log(`   ${i + 1}. ${q}`);
        });
      }
    }
  }

  // =============================================================================
  // STEP 3: CONVERSATIONAL RAG
  // =============================================================================

  async demonstrateConversationalRAG(): Promise<void> {
    console.log('\n💬 Demonstrating Conversational RAG...');

    const conversationId = 'demo-conversation-1';
    
    const conversationQueries = [
      'What are the credit score requirements?',
      'What if the applicant has a score of 620?',
      'What additional documentation would be needed?',
      'Are there any regulatory considerations?',
    ];

    for (const query of conversationQueries) {
      console.log(`\n👤 User: ${query}`);
      
      const response = await this.enhancedRAG.conversationalQuery(
        query,
        conversationId,
        {
          collection: 'credit_documents',
          responseFormat: 'concise',
          domain: 'credit',
        }
      );

      console.log(`🤖 Assistant: ${response.answer}`);
    }
  }

  // =============================================================================
  // STEP 4: ADVANCED RETRIEVAL
  // =============================================================================

  async demonstrateAdvancedRetrieval(): Promise<void> {
    console.log('\n🔬 Demonstrating Advanced Retrieval...');

    const query = 'high risk loan applications';
    
    console.log(`🔍 Query: ${query}`);
    
    const retrievalResponse = await this.retrieval.retrieve({
      query,
      collection: 'credit_documents',
      topK: 5,
      reranking: true,
      expandQuery: true,
      hybridSearch: true,
    });

    console.log(`📈 Strategy: ${retrievalResponse.strategy}`);
    console.log(`⏱️  Processing time: ${retrievalResponse.processingTime}ms`);
    console.log(`📄 Retrieved documents: ${retrievalResponse.results.length}`);

    retrievalResponse.results.forEach((result, index) => {
      console.log(`\n📋 Result ${index + 1}:`);
      console.log(`   Score: ${result.score.toFixed(3)}`);
      console.log(`   Source: ${result.metadata.title}`);
      console.log(`   Content: ${result.content.substring(0, 100)}...`);
      if (result.highlights) {
        console.log(`   Highlights: ${result.highlights.slice(0, 2).join('; ')}`);
      }
    });
  }

  // =============================================================================
  // STEP 5: LANGCHAIN WORKFLOWS
  // =============================================================================

  async demonstrateLangChainWorkflows(): Promise<void> {
    console.log('\n⛓️  Demonstrating LangChain Workflows...');

    // Credit analysis workflow
    console.log('\n🏦 Credit Analysis Workflow:');
    const creditQuery = 'What factors should be considered for a business loan application?';
    
    const creditResult = await this.langchain.executeWorkflow('credit_analysis', creditQuery);
    console.log(`💼 Credit Analysis Result: ${creditResult}`);

    // Risk assessment workflow
    console.log('\n⚠️  Risk Assessment Workflow:');
    const riskQuery = 'How should we assess risk for self-employed applicants?';
    
    const riskResult = await this.langchain.executeWorkflow('risk_assessment', riskQuery);
    console.log(`📊 Risk Assessment Result: ${riskResult}`);

    // Compliance check workflow
    console.log('\n📋 Compliance Check Workflow:');
    const complianceQuery = 'What compliance requirements apply to mortgage lending?';
    
    const complianceResult = await this.langchain.executeWorkflow('compliance_check', complianceQuery);
    console.log(`⚖️  Compliance Result: ${complianceResult}`);
  }

  // =============================================================================
  // STEP 6: MULTI-DOMAIN QUERIES
  // =============================================================================

  async demonstrateMultiDomainQueries(): Promise<void> {
    console.log('\n🌐 Demonstrating Multi-Domain Queries...');

    const query = 'What are the key considerations for loan approval?';
    const domains = ['credit', 'risk', 'compliance'];

    const results = await this.enhancedRAG.multiDomainQuery(query, domains, {
      topK: 3,
      responseFormat: 'structured',
    });

    results.forEach((response, domain) => {
      console.log(`\n🏷️  Domain: ${domain.toUpperCase()}`);
      console.log(`💬 Answer: ${response.answer}`);
      console.log(`🎯 Confidence: ${(response.confidence * 100).toFixed(1)}%`);
      
      if (response.keyInsights && response.keyInsights.length > 0) {
        console.log(`💡 Key Insights: ${response.keyInsights.join(', ')}`);
      }
      
      if (response.riskFactors && response.riskFactors.length > 0) {
        console.log(`⚠️  Risk Factors: ${response.riskFactors.join(', ')}`);
      }
    });
  }

  // =============================================================================
  // MAIN DEMO RUNNER
  // =============================================================================

  async runCompleteDemo(): Promise<void> {
    try {
      console.log('🎯 Starting Complete RAG Pipeline Demo\n');

      // Initialize all services
      await this.initialize();

      // Step 1: Ingest sample documents
      await this.ingestSampleDocuments();

      // Step 2: Basic RAG queries
      await this.demonstrateBasicRAG();

      // Step 3: Conversational RAG
      await this.demonstrateConversationalRAG();

      // Step 4: Advanced retrieval
      await this.demonstrateAdvancedRetrieval();

      // Step 5: LangChain workflows
      await this.demonstrateLangChainWorkflows();

      // Step 6: Multi-domain queries
      await this.demonstrateMultiDomainQueries();

      console.log('\n🎉 Complete RAG Pipeline Demo finished successfully!');

    } catch (error) {
      console.error('❌ Demo failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up resources...');
    
    await this.enhancedRAG.cleanup();
    await this.langchain.cleanup();
    await this.retrieval.cleanup();
    await this.ingestion.cleanup();
    await this.vectorDb.cleanup();
    await this.embedding.cleanup();
    await this.llm.cleanup();

    console.log('✅ Cleanup completed!');
  }
}

// =============================================================================
// USAGE EXAMPLE
// =============================================================================

export async function runRAGPipelineExample(): Promise<void> {
  const demo = new CompleteRAGPipelineExample();
  
  try {
    await demo.runCompleteDemo();
  } finally {
    await demo.cleanup();
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runRAGPipelineExample().catch(console.error);
}
