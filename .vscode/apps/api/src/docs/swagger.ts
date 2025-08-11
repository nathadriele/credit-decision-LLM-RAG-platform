// =============================================================================
// SWAGGER/OPENAPI DOCUMENTATION - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import swaggerJsdoc from 'swagger-jsdoc';

const packageJson = require('../../package.json');
const version = packageJson.version;

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Credit Decision LLM RAG Platform API',
      version,
      description: `
        A comprehensive API for AI-powered credit decision making using Large Language Models (LLMs) 
        and Retrieval-Augmented Generation (RAG) technology.
        
        ## Features
        - **AI-Powered Risk Assessment**: Intelligent risk analysis using advanced ML models
        - **Automated Decision Making**: Smart credit decisions with human oversight
        - **RAG-Enhanced Insights**: Context-aware responses using institutional knowledge
        - **Real-time Processing**: Fast, scalable credit application processing
        - **Enterprise Security**: Role-based access control and audit logging
        
        ## Authentication
        This API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## Rate Limiting
        API requests are rate-limited to prevent abuse. Current limits:
        - 100 requests per 15 minutes per IP address
        - 1000 requests per hour per authenticated user
        
        ## Error Handling
        All API responses follow a consistent format:
        \`\`\`json
        {
          "success": boolean,
          "data": object | null,
          "error": {
            "code": "ERROR_CODE",
            "message": "Human readable error message",
            "details": object | null
          } | null,
          "timestamp": "ISO 8601 timestamp"
        }
        \`\`\`
      `,
      contact: {
        name: 'API Support',
        email: 'api-support@creditdecision.com',
        url: 'https://docs.creditdecision.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api-staging.creditdecision.com',
        description: 'Staging server',
      },
      {
        url: 'https://api.creditdecision.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login endpoint',
        },
      },
      schemas: {
        // Common schemas
        APIResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates if the request was successful',
            },
            data: {
              type: 'object',
              description: 'Response data (present when success is true)',
              nullable: true,
            },
            error: {
              type: 'object',
              description: 'Error information (present when success is false)',
              nullable: true,
              properties: {
                code: {
                  type: 'string',
                  description: 'Machine-readable error code',
                },
                message: {
                  type: 'string',
                  description: 'Human-readable error message',
                },
                details: {
                  type: 'object',
                  description: 'Additional error details',
                  nullable: true,
                },
              },
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'ISO 8601 timestamp of the response',
            },
          },
          required: ['success', 'timestamp'],
        },
        
        PaginationInfo: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              description: 'Current page number',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              description: 'Number of items per page',
            },
            total: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of items',
            },
            totalPages: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of pages',
            },
            hasNext: {
              type: 'boolean',
              description: 'Whether there is a next page',
            },
            hasPrev: {
              type: 'boolean',
              description: 'Whether there is a previous page',
            },
          },
          required: ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev'],
        },

        // User schemas
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            firstName: {
              type: 'string',
              description: 'User first name',
            },
            lastName: {
              type: 'string',
              description: 'User last name',
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'CREDIT_MANAGER', 'CREDIT_ANALYST', 'RISK_ANALYST', 'COMPLIANCE_OFFICER', 'VIEWER'],
              description: 'User role',
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'User permissions',
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp',
            },
          },
          required: ['id', 'email', 'firstName', 'lastName', 'role', 'permissions', 'createdAt', 'updatedAt'],
        },

        LoginRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'User password',
            },
          },
          required: ['email', 'password'],
        },

        LoginResponse: {
          allOf: [
            { $ref: '#/components/schemas/APIResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    token: {
                      type: 'string',
                      description: 'JWT authentication token',
                    },
                    refreshToken: {
                      type: 'string',
                      description: 'Refresh token for obtaining new access tokens',
                    },
                    expiresAt: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Token expiration timestamp',
                    },
                  },
                  required: ['user', 'token', 'refreshToken', 'expiresAt'],
                },
              },
            },
          ],
        },

        // Application schemas
        PersonalInfo: {
          type: 'object',
          properties: {
            firstName: { type: 'string', description: 'Applicant first name' },
            lastName: { type: 'string', description: 'Applicant last name' },
            dateOfBirth: { type: 'string', format: 'date', description: 'Date of birth' },
            ssn: { type: 'string', description: 'Social Security Number' },
            email: { type: 'string', format: 'email', description: 'Email address' },
            phone: { type: 'string', description: 'Phone number' },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zipCode: { type: 'string' },
                country: { type: 'string' },
                residenceType: { type: 'string', enum: ['OWN', 'RENT', 'MORTGAGE', 'OTHER'] },
                monthsAtAddress: { type: 'integer', minimum: 0 },
              },
              required: ['street', 'city', 'state', 'zipCode', 'country', 'residenceType', 'monthsAtAddress'],
            },
            maritalStatus: { type: 'string', enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED'] },
            dependents: { type: 'integer', minimum: 0 },
            citizenship: { type: 'string' },
          },
          required: ['firstName', 'lastName', 'dateOfBirth', 'ssn', 'email', 'phone', 'address', 'maritalStatus', 'dependents', 'citizenship'],
        },

        FinancialInfo: {
          type: 'object',
          properties: {
            annualIncome: { type: 'number', minimum: 0, description: 'Annual income in USD' },
            monthlyIncome: { type: 'number', minimum: 0, description: 'Monthly income in USD' },
            otherIncome: { type: 'number', minimum: 0, description: 'Other monthly income', nullable: true },
            monthlyExpenses: { type: 'number', minimum: 0, description: 'Monthly expenses in USD' },
            creditScore: { type: 'integer', minimum: 300, maximum: 850, description: 'Credit score' },
            debtToIncomeRatio: { type: 'number', minimum: 0, maximum: 1, description: 'Debt-to-income ratio' },
            existingDebts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['CREDIT_CARD', 'MORTGAGE', 'AUTO_LOAN', 'STUDENT_LOAN', 'PERSONAL_LOAN', 'OTHER'] },
                  creditor: { type: 'string' },
                  balance: { type: 'number', minimum: 0 },
                  monthlyPayment: { type: 'number', minimum: 0 },
                  interestRate: { type: 'number', minimum: 0, maximum: 1 },
                },
                required: ['type', 'creditor', 'balance', 'monthlyPayment', 'interestRate'],
              },
            },
            assets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['CHECKING', 'SAVINGS', 'INVESTMENT', 'RETIREMENT', 'REAL_ESTATE', 'VEHICLE', 'OTHER'] },
                  description: { type: 'string' },
                  value: { type: 'number', minimum: 0 },
                  liquid: { type: 'boolean' },
                },
                required: ['type', 'description', 'value', 'liquid'],
              },
            },
            bankingHistory: {
              type: 'object',
              properties: {
                primaryBank: { type: 'string' },
                accountAge: { type: 'integer', minimum: 0, description: 'Account age in months' },
                averageBalance: { type: 'number', minimum: 0 },
                overdraftHistory: { type: 'integer', minimum: 0, description: 'Number of overdrafts in last 12 months' },
                returnedChecks: { type: 'integer', minimum: 0, description: 'Number of returned checks in last 12 months' },
              },
              required: ['primaryBank', 'accountAge', 'averageBalance', 'overdraftHistory', 'returnedChecks'],
            },
          },
          required: ['annualIncome', 'monthlyIncome', 'monthlyExpenses', 'creditScore', 'debtToIncomeRatio', 'existingDebts', 'assets', 'bankingHistory'],
        },

        EmploymentInfo: {
          type: 'object',
          properties: {
            employerName: { type: 'string', description: 'Employer name' },
            jobTitle: { type: 'string', description: 'Job title' },
            employmentType: { type: 'string', enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'SELF_EMPLOYED', 'UNEMPLOYED', 'RETIRED'] },
            monthsEmployed: { type: 'integer', minimum: 0, description: 'Months with current employer' },
            industryType: { type: 'string', description: 'Industry type' },
            supervisorName: { type: 'string', description: 'Supervisor name', nullable: true },
            supervisorPhone: { type: 'string', description: 'Supervisor phone', nullable: true },
          },
          required: ['employerName', 'jobTitle', 'employmentType', 'monthsEmployed', 'industryType'],
        },

        CreditApplication: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Application ID' },
            applicationNumber: { type: 'string', description: 'Human-readable application number' },
            applicantId: { type: 'string', format: 'uuid', description: 'Applicant user ID' },
            status: {
              type: 'string',
              enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RISK_ASSESSMENT', 'PENDING_REVIEW', 'DECISION_PENDING', 'APPROVED', 'DECLINED', 'CONDITIONAL_APPROVAL', 'COUNTER_OFFER'],
              description: 'Application status',
            },
            requestedAmount: { type: 'number', minimum: 0, description: 'Requested loan amount' },
            currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'], description: 'Currency code' },
            purpose: {
              type: 'string',
              enum: ['PERSONAL', 'BUSINESS', 'AUTO', 'HOME', 'EDUCATION', 'DEBT_CONSOLIDATION', 'MEDICAL', 'OTHER'],
              description: 'Loan purpose',
            },
            termMonths: { type: 'integer', minimum: 1, maximum: 360, description: 'Loan term in months' },
            applicantData: {
              type: 'object',
              properties: {
                personal: { $ref: '#/components/schemas/PersonalInfo' },
                financial: { $ref: '#/components/schemas/FinancialInfo' },
                employment: { $ref: '#/components/schemas/EmploymentInfo' },
              },
              required: ['personal', 'financial', 'employment'],
            },
            submittedAt: { type: 'string', format: 'date-time', description: 'Submission timestamp', nullable: true },
            createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
          },
          required: ['id', 'applicationNumber', 'applicantId', 'status', 'requestedAmount', 'currency', 'purpose', 'termMonths', 'applicantData', 'createdAt', 'updatedAt'],
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Applications',
        description: 'Credit application management',
      },
      {
        name: 'Risk Assessment',
        description: 'AI-powered risk analysis',
      },
      {
        name: 'Credit Decisions',
        description: 'Automated credit decision making',
      },
      {
        name: 'AI/RAG',
        description: 'AI and RAG pipeline operations',
      },
      {
        name: 'Users',
        description: 'User management',
      },
      {
        name: 'System',
        description: 'System health and monitoring',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/docs/paths/*.yaml',
  ],
};

export const specs = swaggerJsdoc(options);
export default specs;
