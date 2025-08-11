# API Documentation

## Overview

The Credit Decision Platform API provides RESTful endpoints for managing credit applications, risk assessments, and AI-powered decision making.

## Base URL

```
Development: http://localhost:3001/api
Production: https://api.credit-decision.yourcompany.com/api
```

## Authentication

All API endpoints require authentication using JWT tokens.

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["CREDIT_ANALYST"]
    }
  }
}
```

### Using the Token

Include the token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Credit Applications

### List Applications

```http
GET /applications?page=1&limit=20&status=SUBMITTED
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by status
- `sortBy` (optional): Sort field
- `sortOrder` (optional): asc or desc

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "applicationNumber": "APP-20241201-001",
        "status": "SUBMITTED",
        "requestedAmount": 50000,
        "currency": "USD",
        "purpose": "BUSINESS",
        "termMonths": 36,
        "applicantData": {
          "personal": {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@example.com"
          },
          "financial": {
            "annualIncome": 120000,
            "creditScore": 750
          }
        },
        "createdAt": "2024-12-01T10:00:00Z",
        "updatedAt": "2024-12-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Get Application

```http
GET /applications/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "applicationNumber": "APP-20241201-001",
    "status": "SUBMITTED",
    "requestedAmount": 50000,
    "currency": "USD",
    "purpose": "BUSINESS",
    "termMonths": 36,
    "applicantData": {
      "personal": {
        "firstName": "John",
        "lastName": "Doe",
        "dateOfBirth": "1985-06-15",
        "ssn": "123-45-6789",
        "email": "john.doe@example.com",
        "phone": "+1-555-0123",
        "address": {
          "street": "123 Main St",
          "city": "New York",
          "state": "NY",
          "zipCode": "10001",
          "country": "USA"
        }
      },
      "financial": {
        "annualIncome": 120000,
        "monthlyIncome": 10000,
        "creditScore": 750,
        "debtToIncomeRatio": 0.3
      },
      "employment": {
        "employerName": "Tech Solutions Inc",
        "jobTitle": "Senior Software Engineer",
        "employmentType": "FULL_TIME",
        "monthsEmployed": 48
      }
    },
    "createdAt": "2024-12-01T10:00:00Z",
    "updatedAt": "2024-12-01T10:00:00Z"
  }
}
```

### Create Application

```http
POST /applications
Content-Type: application/json

{
  "applicantId": "uuid",
  "requestedAmount": 50000,
  "currency": "USD",
  "purpose": "BUSINESS",
  "termMonths": 36,
  "applicantData": {
    "personal": {
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1985-06-15",
      "ssn": "123-45-6789",
      "email": "john.doe@example.com",
      "phone": "+1-555-0123",
      "address": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "country": "USA",
        "residenceType": "OWN",
        "monthsAtAddress": 24
      },
      "maritalStatus": "MARRIED",
      "dependents": 2,
      "citizenship": "US"
    },
    "financial": {
      "annualIncome": 120000,
      "monthlyIncome": 10000,
      "otherIncome": 5000,
      "monthlyExpenses": 6000,
      "creditScore": 750,
      "debtToIncomeRatio": 0.3
    },
    "employment": {
      "employerName": "Tech Solutions Inc",
      "jobTitle": "Senior Software Engineer",
      "employmentType": "FULL_TIME",
      "monthsEmployed": 48,
      "supervisorName": "Jane Smith",
      "supervisorPhone": "+1-555-0124"
    }
  }
}
```

### Update Application

```http
PUT /applications/{id}
Content-Type: application/json

{
  "status": "UNDER_REVIEW",
  "requestedAmount": 45000,
  "applicantData": {
    // Updated applicant data
  }
}
```

## Risk Assessment

### Get Risk Assessment

```http
GET /risk-assessment/{applicationId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "applicationId": "uuid",
    "overallRiskScore": 72.5,
    "riskGrade": "A",
    "probabilityOfDefault": 0.025,
    "expectedLoss": 0.0125,
    "riskFactors": [
      {
        "category": "CREDIT_HISTORY",
        "factor": "High credit score",
        "impact": 15.0,
        "weight": 0.3
      },
      {
        "category": "INCOME_STABILITY",
        "factor": "Stable employment",
        "impact": 12.0,
        "weight": 0.25
      }
    ],
    "riskMitigants": [
      {
        "category": "COLLATERAL",
        "mitigant": "Property collateral",
        "value": 200000,
        "impact": -10.0
      }
    ],
    "modelOutputs": {
      "creditScoreModel": {
        "score": 750,
        "features": {
          "paymentHistory": 0.95,
          "creditUtilization": 0.25,
          "lengthOfHistory": 0.8,
          "creditMix": 0.7,
          "newCredit": 0.9
        }
      },
      "incomeStabilityModel": {
        "score": 0.85,
        "features": {
          "employmentLength": 0.9,
          "industryStability": 0.8,
          "incomeGrowth": 0.85
        }
      }
    },
    "createdAt": "2024-12-01T10:05:00Z",
    "updatedAt": "2024-12-01T10:05:00Z"
  }
}
```

### Create Risk Assessment

```http
POST /risk-assessment
Content-Type: application/json

{
  "applicationId": "uuid",
  "modelVersion": "v2.1",
  "parameters": {
    "includeExternalData": true,
    "riskThreshold": 0.7
  }
}
```

## Credit Decisions

### Get Decision

```http
GET /decisions/{applicationId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "applicationId": "uuid",
    "decision": "APPROVED",
    "approvedAmount": 45000,
    "interestRate": 0.0675,
    "termMonths": 36,
    "conditions": [
      "Provide quarterly financial statements",
      "Maintain minimum credit score of 700"
    ],
    "reasons": [
      "Strong credit history",
      "Stable income",
      "Low debt-to-income ratio"
    ],
    "confidence": 0.87,
    "aiRecommendation": {
      "decision": "APPROVED",
      "confidence": 0.87,
      "reasoning": [
        "Excellent credit score (750)",
        "Stable employment history (4 years)",
        "Low risk profile"
      ],
      "suggestedAmount": 45000,
      "suggestedRate": 0.0675
    },
    "decidedBy": "uuid",
    "decidedAt": "2024-12-01T10:10:00Z",
    "createdAt": "2024-12-01T10:10:00Z",
    "updatedAt": "2024-12-01T10:10:00Z"
  }
}
```

### Create Decision

```http
POST /decisions
Content-Type: application/json

{
  "applicationId": "uuid",
  "decision": "APPROVED",
  "approvedAmount": 45000,
  "interestRate": 0.0675,
  "termMonths": 36,
  "conditions": [
    "Provide quarterly financial statements"
  ],
  "reasons": [
    "Strong credit history",
    "Stable income"
  ]
}
```

## AI Services

### LLM Query

```http
POST /llm/query
Content-Type: application/json

{
  "prompt": "Analyze the credit risk for this application",
  "model": "gpt-4",
  "temperature": 0.1,
  "maxTokens": 1000,
  "context": {
    "applicationId": "uuid",
    "applicantData": {}
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "llm-response-123",
    "content": "Based on the analysis...",
    "finishReason": "stop",
    "usage": {
      "promptTokens": 150,
      "completionTokens": 300,
      "totalTokens": 450
    },
    "model": "gpt-4",
    "processingTime": 2500
  }
}
```

### RAG Query

```http
POST /rag/query
Content-Type: application/json

{
  "query": "What are the credit policy requirements for business loans?",
  "collection": "credit_policies",
  "topK": 5,
  "threshold": 0.7,
  "includeMetadata": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Based on the credit policies...",
    "sources": [
      {
        "id": "doc1",
        "content": "Business loan requirements include...",
        "score": 0.95,
        "metadata": {
          "title": "Business Credit Policy",
          "section": "Requirements",
          "lastUpdated": "2024-11-01"
        }
      }
    ],
    "confidence": 0.91,
    "processingTime": 1800,
    "usage": {
      "embeddingTokens": 10,
      "llmTokens": 200,
      "totalTokens": 210
    },
    "metadata": {
      "query": "What are the credit policy requirements for business loans?",
      "collection": "credit_policies",
      "retrievedDocuments": 5,
      "model": "gpt-4"
    }
  }
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Additional error details
    }
  },
  "meta": {
    "timestamp": "2024-12-01T10:00:00Z",
    "requestId": "req-123",
    "path": "/api/applications",
    "method": "POST"
  }
}
```

### Common Error Codes

- `AUTHENTICATION_ERROR` (401): Invalid or missing authentication
- `AUTHORIZATION_ERROR` (403): Insufficient permissions
- `VALIDATION_ERROR` (400): Invalid request data
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource conflict
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_SERVER_ERROR` (500): Server error

## Rate Limiting

API endpoints are rate limited:
- **Authenticated users**: 1000 requests per hour
- **Unauthenticated**: 100 requests per hour

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

## Webhooks

The platform supports webhooks for real-time notifications:

### Webhook Events

- `application.created`
- `application.updated`
- `application.submitted`
- `risk_assessment.completed`
- `decision.made`
- `decision.approved`
- `decision.rejected`

### Webhook Payload

```json
{
  "event": "application.submitted",
  "timestamp": "2024-12-01T10:00:00Z",
  "data": {
    "applicationId": "uuid",
    "status": "SUBMITTED",
    // Event-specific data
  }
}
```
