// =============================================================================
// CREDIT ROUTES - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { CreditDecisionService, ICreditApplication, DecisionType } from '../services/credit-decision';
import { RiskAnalysisService, IApplicantData, DocumentType } from '../services/risk-analysis';
import { DatabaseService } from '../services/database';
import { CacheService } from '../services/cache';
import { EnhancedRAGService } from '@credit-decision/ai';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const AddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  zipCode: z.string().min(5),
  country: z.string().min(2),
  residenceType: z.enum(['OWN', 'RENT', 'MORTGAGE', 'OTHER']),
  monthsAtAddress: z.number().min(0),
});

const DebtSchema = z.object({
  type: z.enum(['CREDIT_CARD', 'AUTO_LOAN', 'MORTGAGE', 'STUDENT_LOAN', 'PERSONAL_LOAN', 'OTHER']),
  creditor: z.string().min(1),
  balance: z.number().min(0),
  monthlyPayment: z.number().min(0),
  interestRate: z.number().min(0).max(1),
  remainingTerm: z.number().optional(),
});

const AssetSchema = z.object({
  type: z.enum(['CHECKING', 'SAVINGS', 'INVESTMENT', 'REAL_ESTATE', 'VEHICLE', 'OTHER']),
  description: z.string().min(1),
  value: z.number().min(0),
  liquid: z.boolean(),
});

const BankingHistorySchema = z.object({
  primaryBank: z.string().min(1),
  accountAge: z.number().min(0),
  averageBalance: z.number().min(0),
  overdraftHistory: z.number().min(0),
  returnedChecks: z.number().min(0),
});

const ApplicantDataSchema = z.object({
  personal: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ssn: z.string().regex(/^\d{3}-\d{2}-\d{4}$/),
    email: z.string().email(),
    phone: z.string().min(10),
    address: AddressSchema,
    maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']),
    dependents: z.number().min(0),
    citizenship: z.string().min(2),
  }),
  financial: z.object({
    annualIncome: z.number().min(0),
    monthlyIncome: z.number().min(0),
    otherIncome: z.number().optional(),
    monthlyExpenses: z.number().min(0),
    creditScore: z.number().min(300).max(850),
    debtToIncomeRatio: z.number().min(0).max(1),
    existingDebts: z.array(DebtSchema),
    assets: z.array(AssetSchema),
    bankingHistory: BankingHistorySchema,
  }),
  employment: z.object({
    employerName: z.string().min(1),
    jobTitle: z.string().min(1),
    employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'SELF_EMPLOYED']),
    monthsEmployed: z.number().min(0),
    industryType: z.string().min(1),
    supervisorName: z.string().optional(),
    supervisorPhone: z.string().optional(),
  }),
});

const CreateApplicationSchema = z.object({
  requestedAmount: z.number().min(1000).max(1000000),
  currency: z.string().default('USD'),
  purpose: z.enum(['PERSONAL', 'BUSINESS', 'AUTO', 'HOME', 'EDUCATION', 'DEBT_CONSOLIDATION', 'OTHER']),
  termMonths: z.number().min(6).max(360),
  applicantData: ApplicantDataSchema,
});

const UpdateApplicationSchema = CreateApplicationSchema.partial();

const MakeDecisionSchema = z.object({
  overrideAI: z.boolean().default(false),
  comments: z.string().optional(),
});

const ReviewDecisionSchema = z.object({
  action: z.enum(['APPROVE', 'MODIFY', 'REJECT']),
  comments: z.string().optional(),
  modifications: z.object({
    decision: z.enum(['APPROVED', 'DECLINED', 'CONDITIONAL_APPROVAL', 'COUNTER_OFFER']).optional(),
    approvedAmount: z.number().optional(),
    interestRate: z.number().optional(),
    termMonths: z.number().optional(),
    conditions: z.array(z.string()).optional(),
  }).optional(),
});

// =============================================================================
// ROUTER SETUP
// =============================================================================

export function createCreditRouter(
  creditDecisionService: CreditDecisionService,
  riskAnalysisService: RiskAnalysisService,
  ragService: EnhancedRAGService,
  database: DatabaseService,
  cache: CacheService
): Router {
  const router = Router();

  // =============================================================================
  // APPLICATION ROUTES
  // =============================================================================

  // Get all applications
  router.get('/applications', 
    authenticate,
    authorize(['CREDIT_ANALYST', 'CREDIT_MANAGER', 'ADMIN']),
    async (req: Request, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const status = req.query.status as string;
        const sortBy = req.query.sortBy as string || 'created_at';
        const sortOrder = req.query.sortOrder as string || 'desc';

        const offset = (page - 1) * limit;

        let query = `
          SELECT * FROM credit_applications 
          WHERE 1=1
        `;
        const params: any[] = [];

        if (status) {
          query += ` AND status = $${params.length + 1}`;
          params.push(status);
        }

        query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await database.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM credit_applications WHERE 1=1';
        const countParams: any[] = [];
        
        if (status) {
          countQuery += ` AND status = $${countParams.length + 1}`;
          countParams.push(status);
        }

        const countResult = await database.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        const applications = result.rows.map(row => ({
          id: row.id,
          applicationNumber: row.application_number,
          applicantId: row.applicant_id,
          status: row.status,
          requestedAmount: row.requested_amount,
          currency: row.currency,
          purpose: row.purpose,
          termMonths: row.term_months,
          applicantData: JSON.parse(row.applicant_data),
          submittedAt: row.submitted_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        res.json({
          success: true,
          data: {
            items: applications,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
              hasNext: page * limit < total,
              hasPrev: page > 1,
            },
          },
        });

      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            code: 'FETCH_APPLICATIONS_ERROR',
            message: error.message,
          },
        });
      }
    }
  );

  // Get application by ID
  router.get('/applications/:id',
    authenticate,
    authorize(['CREDIT_ANALYST', 'CREDIT_MANAGER', 'ADMIN']),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        const result = await database.query(
          'SELECT * FROM credit_applications WHERE id = $1',
          [id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'APPLICATION_NOT_FOUND',
              message: 'Application not found',
            },
          });
        }

        const application = {
          id: result.rows[0].id,
          applicationNumber: result.rows[0].application_number,
          applicantId: result.rows[0].applicant_id,
          status: result.rows[0].status,
          requestedAmount: result.rows[0].requested_amount,
          currency: result.rows[0].currency,
          purpose: result.rows[0].purpose,
          termMonths: result.rows[0].term_months,
          applicantData: JSON.parse(result.rows[0].applicant_data),
          submittedAt: result.rows[0].submitted_at,
          createdAt: result.rows[0].created_at,
          updatedAt: result.rows[0].updated_at,
        };

        res.json({
          success: true,
          data: application,
        });

      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            code: 'FETCH_APPLICATION_ERROR',
            message: error.message,
          },
        });
      }
    }
  );

  // Create new application
  router.post('/applications',
    authenticate,
    authorize(['CREDIT_ANALYST', 'CREDIT_MANAGER', 'ADMIN']),
    validateRequest(CreateApplicationSchema),
    async (req: Request, res: Response) => {
      try {
        const applicationData = req.body;
        const userId = req.user?.id;

        const applicationId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const applicationNumber = `APP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        const result = await database.query(`
          INSERT INTO credit_applications (
            id, application_number, applicant_id, status, requested_amount, 
            currency, purpose, term_months, applicant_data, submitted_at, 
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `, [
          applicationId,
          applicationNumber,
          userId,
          'SUBMITTED',
          applicationData.requestedAmount,
          applicationData.currency,
          applicationData.purpose,
          applicationData.termMonths,
          JSON.stringify(applicationData.applicantData),
          new Date().toISOString(),
          new Date().toISOString(),
          new Date().toISOString(),
        ]);

        const application = {
          id: result.rows[0].id,
          applicationNumber: result.rows[0].application_number,
          applicantId: result.rows[0].applicant_id,
          status: result.rows[0].status,
          requestedAmount: result.rows[0].requested_amount,
          currency: result.rows[0].currency,
          purpose: result.rows[0].purpose,
          termMonths: result.rows[0].term_months,
          applicantData: JSON.parse(result.rows[0].applicant_data),
          submittedAt: result.rows[0].submitted_at,
          createdAt: result.rows[0].created_at,
          updatedAt: result.rows[0].updated_at,
        };

        res.status(201).json({
          success: true,
          data: application,
        });

      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            code: 'CREATE_APPLICATION_ERROR',
            message: error.message,
          },
        });
      }
    }
  );

  // Update application
  router.put('/applications/:id',
    authenticate,
    authorize(['CREDIT_ANALYST', 'CREDIT_MANAGER', 'ADMIN']),
    validateRequest(UpdateApplicationSchema),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        // Check if application exists
        const existingResult = await database.query(
          'SELECT * FROM credit_applications WHERE id = $1',
          [id]
        );

        if (existingResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'APPLICATION_NOT_FOUND',
              message: 'Application not found',
            },
          });
        }

        // Build update query
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramIndex = 1;

        Object.entries(updates).forEach(([key, value]) => {
          if (key === 'applicantData') {
            updateFields.push(`applicant_data = $${paramIndex}`);
            updateValues.push(JSON.stringify(value));
          } else {
            const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            updateFields.push(`${dbField} = $${paramIndex}`);
            updateValues.push(value);
          }
          paramIndex++;
        });

        updateFields.push(`updated_at = $${paramIndex}`);
        updateValues.push(new Date().toISOString());
        updateValues.push(id);

        const query = `
          UPDATE credit_applications 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex + 1}
          RETURNING *
        `;

        const result = await database.query(query, updateValues);

        const application = {
          id: result.rows[0].id,
          applicationNumber: result.rows[0].application_number,
          applicantId: result.rows[0].applicant_id,
          status: result.rows[0].status,
          requestedAmount: result.rows[0].requested_amount,
          currency: result.rows[0].currency,
          purpose: result.rows[0].purpose,
          termMonths: result.rows[0].term_months,
          applicantData: JSON.parse(result.rows[0].applicant_data),
          submittedAt: result.rows[0].submitted_at,
          createdAt: result.rows[0].created_at,
          updatedAt: result.rows[0].updated_at,
        };

        res.json({
          success: true,
          data: application,
        });

      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            code: 'UPDATE_APPLICATION_ERROR',
            message: error.message,
          },
        });
      }
    }
  );

  // =============================================================================
  // RISK ASSESSMENT ROUTES
  // =============================================================================

  // Get risk assessment
  router.get('/risk-assessment/:applicationId',
    authenticate,
    authorize(['CREDIT_ANALYST', 'CREDIT_MANAGER', 'ADMIN']),
    async (req: Request, res: Response) => {
      try {
        const { applicationId } = req.params;

        const assessment = await riskAnalysisService.getRiskAssessment(applicationId);

        if (!assessment) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'RISK_ASSESSMENT_NOT_FOUND',
              message: 'Risk assessment not found',
            },
          });
        }

        res.json({
          success: true,
          data: assessment,
        });

      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            code: 'FETCH_RISK_ASSESSMENT_ERROR',
            message: error.message,
          },
        });
      }
    }
  );

  // Create risk assessment
  router.post('/risk-assessment',
    authenticate,
    authorize(['CREDIT_ANALYST', 'CREDIT_MANAGER', 'ADMIN']),
    async (req: Request, res: Response) => {
      try {
        const { applicationId } = req.body;

        // Get application data
        const appResult = await database.query(
          'SELECT * FROM credit_applications WHERE id = $1',
          [applicationId]
        );

        if (appResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'APPLICATION_NOT_FOUND',
              message: 'Application not found',
            },
          });
        }

        const application = appResult.rows[0];
        const applicantData = JSON.parse(application.applicant_data);

        const assessment = await riskAnalysisService.assessRisk(
          applicationId,
          applicantData,
          application.requested_amount,
          application.term_months,
          application.purpose
        );

        res.status(201).json({
          success: true,
          data: assessment,
        });

      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            code: 'CREATE_RISK_ASSESSMENT_ERROR',
            message: error.message,
          },
        });
      }
    }
  );

  // =============================================================================
  // DECISION ROUTES
  // =============================================================================

  // Get decision
  router.get('/decisions/:applicationId',
    authenticate,
    authorize(['CREDIT_ANALYST', 'CREDIT_MANAGER', 'ADMIN']),
    async (req: Request, res: Response) => {
      try {
        const { applicationId } = req.params;

        const decision = await creditDecisionService.getDecision(applicationId);

        if (!decision) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'DECISION_NOT_FOUND',
              message: 'Decision not found',
            },
          });
        }

        res.json({
          success: true,
          data: decision,
        });

      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            code: 'FETCH_DECISION_ERROR',
            message: error.message,
          },
        });
      }
    }
  );

  // Make decision
  router.post('/decisions',
    authenticate,
    authorize(['CREDIT_MANAGER', 'ADMIN']),
    validateRequest(MakeDecisionSchema),
    async (req: Request, res: Response) => {
      try {
        const { applicationId, overrideAI } = req.body;
        const userId = req.user?.id;

        const decision = await creditDecisionService.makeDecision(
          applicationId,
          userId,
          overrideAI
        );

        res.status(201).json({
          success: true,
          data: decision,
        });

      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            code: 'MAKE_DECISION_ERROR',
            message: error.message,
          },
        });
      }
    }
  );

  // Review decision
  router.post('/decisions/:decisionId/review',
    authenticate,
    authorize(['CREDIT_MANAGER', 'ADMIN']),
    validateRequest(ReviewDecisionSchema),
    async (req: Request, res: Response) => {
      try {
        const { decisionId } = req.params;
        const { action, comments, modifications } = req.body;
        const userId = req.user?.id;

        const decision = await creditDecisionService.reviewDecision(
          decisionId,
          userId,
          action,
          comments,
          modifications
        );

        res.json({
          success: true,
          data: decision,
        });

      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            code: 'REVIEW_DECISION_ERROR',
            message: error.message,
          },
        });
      }
    }
  );

  return router;
}
