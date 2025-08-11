// =============================================================================
// MSW HANDLERS - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { rest } from 'msw';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// =============================================================================
// MOCK DATA
// =============================================================================

const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  isActive: true,
  roles: ['CREDIT_ANALYST'],
  permissions: ['APPLICATION_READ', 'APPLICATION_CREATE'],
  lastLoginAt: '2024-12-01T09:00:00Z',
};

const mockApplications = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    applicationNumber: 'APP-20241201-001',
    status: 'SUBMITTED',
    requestedAmount: 50000,
    currency: 'USD',
    purpose: 'BUSINESS',
    termMonths: 36,
    applicantData: {
      personal: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0123',
      },
      financial: {
        annualIncome: 120000,
        creditScore: 750,
      },
    },
    createdAt: '2024-12-01T10:00:00Z',
    updatedAt: '2024-12-01T10:00:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    applicationNumber: 'APP-20241201-002',
    status: 'APPROVED',
    requestedAmount: 25000,
    currency: 'USD',
    purpose: 'PERSONAL',
    termMonths: 24,
    applicantData: {
      personal: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+1-555-0124',
      },
      financial: {
        annualIncome: 85000,
        creditScore: 720,
      },
    },
    createdAt: '2024-12-01T09:00:00Z',
    updatedAt: '2024-12-01T11:00:00Z',
  },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const createSuccessResponse = (data: any) => ({
  success: true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    requestId: 'mock-request-id',
  },
});

const createErrorResponse = (code: string, message: string, status: number = 400) => ({
  success: false,
  error: {
    code,
    message,
  },
  meta: {
    timestamp: new Date().toISOString(),
    requestId: 'mock-request-id',
  },
});

const createPaginatedResponse = (data: any[], page: number = 1, limit: number = 20) => ({
  success: true,
  data: {
    items: data.slice((page - 1) * limit, page * limit),
    pagination: {
      page,
      limit,
      total: data.length,
      totalPages: Math.ceil(data.length / limit),
      hasNext: page * limit < data.length,
      hasPrev: page > 1,
    },
  },
  meta: {
    timestamp: new Date().toISOString(),
    requestId: 'mock-request-id',
  },
});

// =============================================================================
// REQUEST HANDLERS
// =============================================================================

export const handlers = [
  // =============================================================================
  // AUTHENTICATION ENDPOINTS
  // =============================================================================

  // Login
  rest.post(`${API_BASE_URL}/api/auth/login`, (req, res, ctx) => {
    const { email, password } = req.body as any;

    if (email === 'test@example.com' && password === 'password123') {
      return res(
        ctx.status(200),
        ctx.json(createSuccessResponse({
          token: 'mock-jwt-token',
          user: mockUser,
        }))
      );
    }

    return res(
      ctx.status(401),
      ctx.json(createErrorResponse('AUTHENTICATION_ERROR', 'Invalid credentials', 401))
    );
  }),

  // Logout
  rest.post(`${API_BASE_URL}/api/auth/logout`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(createSuccessResponse({ message: 'Logged out successfully' }))
    );
  }),

  // Get current user
  rest.get(`${API_BASE_URL}/api/auth/me`, (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res(
        ctx.status(401),
        ctx.json(createErrorResponse('AUTHENTICATION_ERROR', 'No token provided', 401))
      );
    }

    return res(
      ctx.status(200),
      ctx.json(createSuccessResponse({ user: mockUser }))
    );
  }),

  // =============================================================================
  // CREDIT APPLICATIONS ENDPOINTS
  // =============================================================================

  // Get applications list
  rest.get(`${API_BASE_URL}/api/applications`, (req, res, ctx) => {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');

    let filteredApplications = mockApplications;
    
    if (status) {
      filteredApplications = mockApplications.filter(app => app.status === status);
    }

    return res(
      ctx.status(200),
      ctx.json(createPaginatedResponse(filteredApplications, page, limit))
    );
  }),

  // Get single application
  rest.get(`${API_BASE_URL}/api/applications/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const application = mockApplications.find(app => app.id === id);

    if (!application) {
      return res(
        ctx.status(404),
        ctx.json(createErrorResponse('NOT_FOUND', 'Application not found', 404))
      );
    }

    return res(
      ctx.status(200),
      ctx.json(createSuccessResponse(application))
    );
  }),

  // Create application
  rest.post(`${API_BASE_URL}/api/applications`, (req, res, ctx) => {
    const applicationData = req.body as any;
    
    const newApplication = {
      id: '550e8400-e29b-41d4-a716-446655440999',
      applicationNumber: `APP-${Date.now()}`,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...applicationData,
    };

    return res(
      ctx.status(201),
      ctx.json(createSuccessResponse(newApplication))
    );
  }),

  // Update application
  rest.put(`${API_BASE_URL}/api/applications/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const updates = req.body as any;
    const application = mockApplications.find(app => app.id === id);

    if (!application) {
      return res(
        ctx.status(404),
        ctx.json(createErrorResponse('NOT_FOUND', 'Application not found', 404))
      );
    }

    const updatedApplication = {
      ...application,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return res(
      ctx.status(200),
      ctx.json(createSuccessResponse(updatedApplication))
    );
  }),

  // =============================================================================
  // RISK ASSESSMENT ENDPOINTS
  // =============================================================================

  // Get risk assessment
  rest.get(`${API_BASE_URL}/api/risk-assessment/:applicationId`, (req, res, ctx) => {
    const { applicationId } = req.params;

    const mockRiskAssessment = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      applicationId,
      overallRiskScore: 72.5,
      riskGrade: 'A',
      probabilityOfDefault: 0.025,
      expectedLoss: 0.0125,
      riskFactors: [
        {
          category: 'CREDIT_HISTORY',
          factor: 'High credit score',
          impact: 15.0,
          weight: 0.3,
        },
        {
          category: 'INCOME_STABILITY',
          factor: 'Stable employment',
          impact: 12.0,
          weight: 0.25,
        },
      ],
      createdAt: '2024-12-01T10:05:00Z',
      updatedAt: '2024-12-01T10:05:00Z',
    };

    return res(
      ctx.status(200),
      ctx.json(createSuccessResponse(mockRiskAssessment))
    );
  }),

  // Create risk assessment
  rest.post(`${API_BASE_URL}/api/risk-assessment`, (req, res, ctx) => {
    const assessmentData = req.body as any;

    const newAssessment = {
      id: '550e8400-e29b-41d4-a716-446655440999',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...assessmentData,
    };

    return res(
      ctx.status(201),
      ctx.json(createSuccessResponse(newAssessment))
    );
  }),

  // =============================================================================
  // DECISIONS ENDPOINTS
  // =============================================================================

  // Get decision
  rest.get(`${API_BASE_URL}/api/decisions/:applicationId`, (req, res, ctx) => {
    const { applicationId } = req.params;

    const mockDecision = {
      id: '550e8400-e29b-41d4-a716-446655440004',
      applicationId,
      decision: 'APPROVED',
      approvedAmount: 45000,
      interestRate: 0.0675,
      termMonths: 36,
      conditions: ['Provide quarterly financial statements'],
      reasons: ['Strong credit history', 'Stable income'],
      confidence: 0.87,
      aiRecommendation: {
        decision: 'APPROVED',
        confidence: 0.87,
        reasoning: ['Excellent credit score', 'Stable employment'],
      },
      createdAt: '2024-12-01T10:10:00Z',
      updatedAt: '2024-12-01T10:10:00Z',
    };

    return res(
      ctx.status(200),
      ctx.json(createSuccessResponse(mockDecision))
    );
  }),

  // Create decision
  rest.post(`${API_BASE_URL}/api/decisions`, (req, res, ctx) => {
    const decisionData = req.body as any;

    const newDecision = {
      id: '550e8400-e29b-41d4-a716-446655440999',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...decisionData,
    };

    return res(
      ctx.status(201),
      ctx.json(createSuccessResponse(newDecision))
    );
  }),

  // =============================================================================
  // LLM/RAG ENDPOINTS
  // =============================================================================

  // LLM query
  rest.post(`${API_BASE_URL}/api/llm/query`, (req, res, ctx) => {
    const { prompt } = req.body as any;

    const mockResponse = {
      id: 'llm-response-123',
      content: `This is a mock LLM response to the prompt: "${prompt}"`,
      finishReason: 'stop',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      model: 'gpt-4',
      processingTime: 1500,
    };

    return res(
      ctx.status(200),
      ctx.json(createSuccessResponse(mockResponse))
    );
  }),

  // RAG query
  rest.post(`${API_BASE_URL}/api/rag/query`, (req, res, ctx) => {
    const { query } = req.body as any;

    const mockResponse = {
      answer: `This is a mock RAG response based on the query: "${query}"`,
      sources: [
        {
          id: 'doc1',
          content: 'Relevant document content 1',
          score: 0.95,
          metadata: { title: 'Credit Policy Document' },
        },
        {
          id: 'doc2',
          content: 'Relevant document content 2',
          score: 0.87,
          metadata: { title: 'Risk Assessment Guidelines' },
        },
      ],
      confidence: 0.91,
      processingTime: 2000,
      usage: {
        embeddingTokens: 5,
        llmTokens: 25,
        totalTokens: 30,
      },
      metadata: {
        query,
        collection: 'credit_documents',
        retrievedDocuments: 2,
        model: 'gpt-4',
      },
    };

    return res(
      ctx.status(200),
      ctx.json(createSuccessResponse(mockResponse))
    );
  }),

  // =============================================================================
  // HEALTH CHECK
  // =============================================================================

  rest.get(`${API_BASE_URL}/api/health`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          database: 'healthy',
          redis: 'healthy',
          vectorDb: 'healthy',
          llm: 'healthy',
        },
      })
    );
  }),

  // =============================================================================
  // FALLBACK HANDLER
  // =============================================================================

  rest.all('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} request to ${req.url}`);
    return res(
      ctx.status(404),
      ctx.json(createErrorResponse('NOT_FOUND', 'Endpoint not found', 404))
    );
  }),
];

export { createSuccessResponse, createErrorResponse, createPaginatedResponse };
