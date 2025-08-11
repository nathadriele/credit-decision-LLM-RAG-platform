// =============================================================================
// CREDIT DECISION SERVICE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { EnhancedRAGService } from '@credit-decision/ai';
import { DatabaseService } from './database';
import { CacheService } from './cache';
import { RiskAnalysisService, IRiskAssessment, IApplicantData } from './risk-analysis';

// =============================================================================
// INTERFACES
// =============================================================================

export interface ICreditApplication {
  id: string;
  applicationNumber: string;
  applicantId: string;
  status: ApplicationStatus;
  requestedAmount: number;
  currency: string;
  purpose: LoanPurpose;
  termMonths: number;
  applicantData: IApplicantData;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICreditDecision {
  id: string;
  applicationId: string;
  decision: DecisionType;
  approvedAmount?: number;
  interestRate?: number;
  termMonths?: number;
  conditions: string[];
  reasons: string[];
  confidence: number;
  aiRecommendation: IAIRecommendation;
  riskAssessmentId: string;
  decidedBy: string;
  decidedAt: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAIRecommendation {
  decision: DecisionType;
  confidence: number;
  reasoning: string[];
  suggestedAmount?: number;
  suggestedRate?: number;
  suggestedTerm?: number;
  requiredConditions: string[];
  alternativeOptions: IAlternativeOption[];
}

export interface IAlternativeOption {
  type: 'REDUCED_AMOUNT' | 'SHORTER_TERM' | 'HIGHER_RATE' | 'ADDITIONAL_COLLATERAL' | 'CO_SIGNER';
  description: string;
  parameters: Record<string, any>;
  impact: string;
}

export interface IDecisionCriteria {
  minCreditScore: number;
  maxDebtToIncomeRatio: number;
  minEmploymentMonths: number;
  maxLoanToValueRatio: number;
  requiredDocuments: string[];
  autoApprovalThresholds: {
    riskScore: number;
    amount: number;
    creditScore: number;
  };
  autoDeclineThresholds: {
    riskScore: number;
    creditScore: number;
    debtToIncomeRatio: number;
  };
}

export interface IDecisionContext {
  application: ICreditApplication;
  riskAssessment: IRiskAssessment;
  criteria: IDecisionCriteria;
  marketConditions: IMarketConditions;
  regulatoryRequirements: IRegulatoryRequirement[];
}

export interface IMarketConditions {
  baseInterestRate: number;
  economicIndicators: Record<string, number>;
  competitiveRates: Record<string, number>;
  liquidityPosition: number;
}

export interface IRegulatoryRequirement {
  regulation: string;
  requirement: string;
  applicable: boolean;
  compliance: boolean;
  notes?: string;
}

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PENDING_DOCUMENTS = 'PENDING_DOCUMENTS',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  DECISION_PENDING = 'DECISION_PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
}

export enum DecisionType {
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  CONDITIONAL_APPROVAL = 'CONDITIONAL_APPROVAL',
  COUNTER_OFFER = 'COUNTER_OFFER',
  PENDING_REVIEW = 'PENDING_REVIEW',
}

export enum LoanPurpose {
  PERSONAL = 'PERSONAL',
  BUSINESS = 'BUSINESS',
  AUTO = 'AUTO',
  HOME = 'HOME',
  EDUCATION = 'EDUCATION',
  DEBT_CONSOLIDATION = 'DEBT_CONSOLIDATION',
  OTHER = 'OTHER',
}

export interface ICreditDecisionConfig {
  ragService: EnhancedRAGService;
  riskAnalysisService: RiskAnalysisService;
  database: DatabaseService;
  cache: CacheService;
  enableAIDecisions: boolean;
  enableAutoDecisions: boolean;
  requireHumanReview: boolean;
  decisionCriteria: IDecisionCriteria;
}

// =============================================================================
// CREDIT DECISION SERVICE
// =============================================================================

export class CreditDecisionService {
  private ragService: EnhancedRAGService;
  private riskAnalysisService: RiskAnalysisService;
  private database: DatabaseService;
  private cache: CacheService;
  private config: ICreditDecisionConfig;

  constructor(config: ICreditDecisionConfig) {
    this.ragService = config.ragService;
    this.riskAnalysisService = config.riskAnalysisService;
    this.database = config.database;
    this.cache = config.cache;
    this.config = config;
  }

  async makeDecision(
    applicationId: string,
    decidedBy: string,
    overrideAI: boolean = false
  ): Promise<ICreditDecision> {
    try {
      // Step 1: Get application and risk assessment
      const application = await this.getApplication(applicationId);
      if (!application) {
        throw new Error(`Application ${applicationId} not found`);
      }

      const riskAssessment = await this.riskAnalysisService.getRiskAssessment(applicationId);
      if (!riskAssessment) {
        throw new Error(`Risk assessment not found for application ${applicationId}`);
      }

      // Step 2: Build decision context
      const context = await this.buildDecisionContext(application, riskAssessment);

      // Step 3: Generate AI recommendation
      const aiRecommendation = await this.generateAIRecommendation(context);

      // Step 4: Apply decision logic
      const decision = overrideAI
        ? await this.makeManualDecision(context, aiRecommendation, decidedBy)
        : await this.makeAutomatedDecision(context, aiRecommendation, decidedBy);

      // Step 5: Store decision
      await this.storeDecision(decision);

      // Step 6: Update application status
      await this.updateApplicationStatus(applicationId, this.getStatusFromDecision(decision.decision));

      return decision;

    } catch (error) {
      throw new Error(`Credit decision failed: ${error.message}`);
    }
  }

  async getDecision(applicationId: string): Promise<ICreditDecision | null> {
    // Try cache first
    const cached = await this.cache.get(`credit_decision:${applicationId}`);
    if (cached) {
      return cached;
    }

    // Fallback to database
    const result = await this.database.query(
      'SELECT * FROM credit_decisions WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1',
      [applicationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const decision = this.mapDatabaseToDecision(result.rows[0]);
    
    // Cache for future requests
    await this.cache.set(`credit_decision:${applicationId}`, decision, 3600);

    return decision;
  }

  async reviewDecision(
    decisionId: string,
    reviewerId: string,
    action: 'APPROVE' | 'MODIFY' | 'REJECT',
    comments?: string,
    modifications?: Partial<ICreditDecision>
  ): Promise<ICreditDecision> {
    const decision = await this.getDecisionById(decisionId);
    if (!decision) {
      throw new Error(`Decision ${decisionId} not found`);
    }

    if (action === 'MODIFY' && modifications) {
      // Apply modifications
      const updatedDecision = { ...decision, ...modifications };
      await this.storeDecision(updatedDecision);
      return updatedDecision;
    }

    // Log review action
    await this.logDecisionReview(decisionId, reviewerId, action, comments);

    return decision;
  }

  // =============================================================================
  // PRIVATE METHODS - DECISION LOGIC
  // =============================================================================

  private async buildDecisionContext(
    application: ICreditApplication,
    riskAssessment: IRiskAssessment
  ): Promise<IDecisionContext> {
    const marketConditions = await this.getMarketConditions();
    const regulatoryRequirements = await this.checkRegulatoryRequirements(application);

    return {
      application,
      riskAssessment,
      criteria: this.config.decisionCriteria,
      marketConditions,
      regulatoryRequirements,
    };
  }

  private async generateAIRecommendation(context: IDecisionContext): Promise<IAIRecommendation> {
    if (!this.config.enableAIDecisions) {
      return this.getDefaultRecommendation(context);
    }

    try {
      const query = this.buildAIDecisionQuery(context);
      
      const response = await this.ragService.query({
        query,
        domain: 'credit',
        responseFormat: 'structured',
        topK: 10,
        temperature: 0.1,
      });

      return this.parseAIRecommendation(response.answer, context);

    } catch (error) {
      console.error('AI recommendation failed:', error);
      return this.getDefaultRecommendation(context);
    }
  }

  private buildAIDecisionQuery(context: IDecisionContext): string {
    const { application, riskAssessment } = context;

    return `
      Analyze this credit application and provide a detailed recommendation:

      APPLICATION DETAILS:
      - Requested Amount: $${application.requestedAmount.toLocaleString()}
      - Purpose: ${application.purpose}
      - Term: ${application.termMonths} months
      - Applicant Credit Score: ${application.applicantData.financial.creditScore}
      - Annual Income: $${application.applicantData.financial.annualIncome.toLocaleString()}
      - DTI Ratio: ${(application.applicantData.financial.debtToIncomeRatio * 100).toFixed(1)}%
      - Employment: ${application.applicantData.employment.employmentType} for ${application.applicantData.employment.monthsEmployed} months

      RISK ASSESSMENT:
      - Overall Risk Score: ${riskAssessment.overallRiskScore}/100
      - Risk Grade: ${riskAssessment.riskGrade}
      - Probability of Default: ${(riskAssessment.probabilityOfDefault * 100).toFixed(2)}%
      - Key Risk Factors: ${riskAssessment.riskFactors.slice(0, 3).map(f => f.factor).join(', ')}

      DECISION CRITERIA:
      - Min Credit Score: ${context.criteria.minCreditScore}
      - Max DTI Ratio: ${(context.criteria.maxDebtToIncomeRatio * 100).toFixed(1)}%
      - Auto Approval Risk Threshold: ${context.criteria.autoApprovalThresholds.riskScore}

      Please provide:
      1. Recommended decision (APPROVED/DECLINED/CONDITIONAL_APPROVAL/COUNTER_OFFER)
      2. Confidence level (0-100%)
      3. Detailed reasoning
      4. Suggested loan terms if approved
      5. Required conditions if any
      6. Alternative options if declined

      Consider current market conditions, regulatory requirements, and institutional risk appetite.
    `;
  }

  private parseAIRecommendation(aiResponse: string, context: IDecisionContext): IAIRecommendation {
    // Parse AI response into structured recommendation
    // This is a simplified parser - in practice, you'd use more sophisticated NLP
    
    const lines = aiResponse.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let decision = DecisionType.PENDING_REVIEW;
    let confidence = 0.5;
    const reasoning: string[] = [];
    const requiredConditions: string[] = [];
    const alternativeOptions: IAlternativeOption[] = [];

    // Extract decision
    const decisionLine = lines.find(line => 
      line.toLowerCase().includes('recommend') || 
      line.toLowerCase().includes('decision')
    );
    
    if (decisionLine) {
      if (decisionLine.toLowerCase().includes('approv')) decision = DecisionType.APPROVED;
      else if (decisionLine.toLowerCase().includes('declin')) decision = DecisionType.DECLINED;
      else if (decisionLine.toLowerCase().includes('conditional')) decision = DecisionType.CONDITIONAL_APPROVAL;
      else if (decisionLine.toLowerCase().includes('counter')) decision = DecisionType.COUNTER_OFFER;
    }

    // Extract confidence
    const confidenceMatch = aiResponse.match(/confidence[:\s]*(\d+)%?/i);
    if (confidenceMatch) {
      confidence = parseInt(confidenceMatch[1]) / 100;
    }

    // Extract reasoning
    const reasoningSection = aiResponse.toLowerCase().indexOf('reasoning');
    if (reasoningSection !== -1) {
      const reasoningText = aiResponse.substring(reasoningSection);
      const reasoningLines = reasoningText.split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map(line => line.replace(/^[-•]\s*/, '').trim())
        .slice(0, 5);
      reasoning.push(...reasoningLines);
    }

    // Calculate suggested terms
    const suggestedAmount = this.calculateSuggestedAmount(context, decision);
    const suggestedRate = this.calculateSuggestedRate(context, decision);
    const suggestedTerm = this.calculateSuggestedTerm(context, decision);

    return {
      decision,
      confidence,
      reasoning,
      suggestedAmount,
      suggestedRate,
      suggestedTerm,
      requiredConditions,
      alternativeOptions,
    };
  }

  private async makeAutomatedDecision(
    context: IDecisionContext,
    aiRecommendation: IAIRecommendation,
    decidedBy: string
  ): Promise<ICreditDecision> {
    const { application, riskAssessment, criteria } = context;

    // Check auto-approval criteria
    if (this.meetsAutoApprovalCriteria(context)) {
      return this.createDecision(
        application.id,
        DecisionType.APPROVED,
        aiRecommendation,
        riskAssessment.id,
        decidedBy,
        'Automated approval based on excellent risk profile'
      );
    }

    // Check auto-decline criteria
    if (this.meetsAutoDeclineCriteria(context)) {
      return this.createDecision(
        application.id,
        DecisionType.DECLINED,
        aiRecommendation,
        riskAssessment.id,
        decidedBy,
        'Automated decline based on high risk factors'
      );
    }

    // Use AI recommendation for borderline cases
    if (this.config.enableAIDecisions && aiRecommendation.confidence > 0.8) {
      return this.createDecision(
        application.id,
        aiRecommendation.decision,
        aiRecommendation,
        riskAssessment.id,
        decidedBy,
        'AI-powered decision with high confidence'
      );
    }

    // Require human review
    return this.createDecision(
      application.id,
      DecisionType.PENDING_REVIEW,
      aiRecommendation,
      riskAssessment.id,
      decidedBy,
      'Requires human review due to complex risk profile'
    );
  }

  private async makeManualDecision(
    context: IDecisionContext,
    aiRecommendation: IAIRecommendation,
    decidedBy: string
  ): Promise<ICreditDecision> {
    // For manual decisions, use AI recommendation as guidance but require human input
    return this.createDecision(
      context.application.id,
      DecisionType.PENDING_REVIEW,
      aiRecommendation,
      context.riskAssessment.id,
      decidedBy,
      'Manual review requested'
    );
  }

  private meetsAutoApprovalCriteria(context: IDecisionContext): boolean {
    const { application, riskAssessment, criteria } = context;
    const { applicantData } = application;

    return (
      riskAssessment.overallRiskScore <= criteria.autoApprovalThresholds.riskScore &&
      application.requestedAmount <= criteria.autoApprovalThresholds.amount &&
      applicantData.financial.creditScore >= criteria.autoApprovalThresholds.creditScore &&
      applicantData.financial.debtToIncomeRatio <= criteria.maxDebtToIncomeRatio &&
      applicantData.employment.monthsEmployed >= criteria.minEmploymentMonths
    );
  }

  private meetsAutoDeclineCriteria(context: IDecisionContext): boolean {
    const { application, riskAssessment, criteria } = context;
    const { applicantData } = application;

    return (
      riskAssessment.overallRiskScore >= criteria.autoDeclineThresholds.riskScore ||
      applicantData.financial.creditScore < criteria.autoDeclineThresholds.creditScore ||
      applicantData.financial.debtToIncomeRatio > criteria.autoDeclineThresholds.debtToIncomeRatio
    );
  }

  private createDecision(
    applicationId: string,
    decision: DecisionType,
    aiRecommendation: IAIRecommendation,
    riskAssessmentId: string,
    decidedBy: string,
    reason: string
  ): ICreditDecision {
    const now = new Date().toISOString();
    
    return {
      id: this.generateDecisionId(),
      applicationId,
      decision,
      approvedAmount: decision === DecisionType.APPROVED ? aiRecommendation.suggestedAmount : undefined,
      interestRate: decision === DecisionType.APPROVED ? aiRecommendation.suggestedRate : undefined,
      termMonths: decision === DecisionType.APPROVED ? aiRecommendation.suggestedTerm : undefined,
      conditions: aiRecommendation.requiredConditions,
      reasons: [reason, ...aiRecommendation.reasoning],
      confidence: aiRecommendation.confidence,
      aiRecommendation,
      riskAssessmentId,
      decidedBy,
      decidedAt: now,
      expiresAt: decision === DecisionType.APPROVED ? this.calculateExpirationDate() : undefined,
      createdAt: now,
      updatedAt: now,
    };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private calculateSuggestedAmount(context: IDecisionContext, decision: DecisionType): number | undefined {
    if (decision === DecisionType.DECLINED) return undefined;
    
    const { application, riskAssessment } = context;
    let amount = application.requestedAmount;

    // Reduce amount based on risk
    if (riskAssessment.overallRiskScore > 50) {
      amount *= 0.8; // Reduce by 20%
    }

    return Math.round(amount);
  }

  private calculateSuggestedRate(context: IDecisionContext, decision: DecisionType): number | undefined {
    if (decision === DecisionType.DECLINED) return undefined;

    const { riskAssessment, marketConditions } = context;
    let rate = marketConditions.baseInterestRate;

    // Add risk premium
    const riskPremium = (riskAssessment.overallRiskScore / 100) * 0.05; // Up to 5% premium
    rate += riskPremium;

    return Math.round(rate * 10000) / 10000; // Round to 4 decimal places
  }

  private calculateSuggestedTerm(context: IDecisionContext, decision: DecisionType): number | undefined {
    if (decision === DecisionType.DECLINED) return undefined;
    return context.application.termMonths; // Keep requested term for now
  }

  private getDefaultRecommendation(context: IDecisionContext): IAIRecommendation {
    return {
      decision: DecisionType.PENDING_REVIEW,
      confidence: 0.5,
      reasoning: ['AI recommendation not available'],
      requiredConditions: [],
      alternativeOptions: [],
    };
  }

  private getStatusFromDecision(decision: DecisionType): ApplicationStatus {
    switch (decision) {
      case DecisionType.APPROVED:
      case DecisionType.CONDITIONAL_APPROVAL:
        return ApplicationStatus.APPROVED;
      case DecisionType.DECLINED:
        return ApplicationStatus.DECLINED;
      default:
        return ApplicationStatus.DECISION_PENDING;
    }
  }

  private generateDecisionId(): string {
    return `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateExpirationDate(): string {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30); // 30 days from now
    return expirationDate.toISOString();
  }

  private async getApplication(applicationId: string): Promise<ICreditApplication | null> {
    const result = await this.database.query(
      'SELECT * FROM credit_applications WHERE id = $1',
      [applicationId]
    );

    return result.rows.length > 0 ? this.mapDatabaseToApplication(result.rows[0]) : null;
  }

  private async getMarketConditions(): Promise<IMarketConditions> {
    // Placeholder - would fetch from external sources
    return {
      baseInterestRate: 0.05,
      economicIndicators: {},
      competitiveRates: {},
      liquidityPosition: 0.8,
    };
  }

  private async checkRegulatoryRequirements(application: ICreditApplication): Promise<IRegulatoryRequirement[]> {
    // Placeholder - would check against regulatory databases
    return [];
  }

  private async getDecisionById(decisionId: string): Promise<ICreditDecision | null> {
    const result = await this.database.query(
      'SELECT * FROM credit_decisions WHERE id = $1',
      [decisionId]
    );

    return result.rows.length > 0 ? this.mapDatabaseToDecision(result.rows[0]) : null;
  }

  private async storeDecision(decision: ICreditDecision): Promise<void> {
    await this.database.query(`
      INSERT INTO credit_decisions (
        id, application_id, decision, approved_amount, interest_rate, 
        term_months, conditions, reasons, confidence, ai_recommendation,
        risk_assessment_id, decided_by, decided_at, expires_at, 
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        decision = EXCLUDED.decision,
        approved_amount = EXCLUDED.approved_amount,
        interest_rate = EXCLUDED.interest_rate,
        term_months = EXCLUDED.term_months,
        conditions = EXCLUDED.conditions,
        reasons = EXCLUDED.reasons,
        confidence = EXCLUDED.confidence,
        ai_recommendation = EXCLUDED.ai_recommendation,
        updated_at = EXCLUDED.updated_at
    `, [
      decision.id,
      decision.applicationId,
      decision.decision,
      decision.approvedAmount,
      decision.interestRate,
      decision.termMonths,
      JSON.stringify(decision.conditions),
      JSON.stringify(decision.reasons),
      decision.confidence,
      JSON.stringify(decision.aiRecommendation),
      decision.riskAssessmentId,
      decision.decidedBy,
      decision.decidedAt,
      decision.expiresAt,
      decision.createdAt,
      decision.updatedAt,
    ]);

    // Cache the decision
    await this.cache.set(`credit_decision:${decision.applicationId}`, decision, 3600);
  }

  private async updateApplicationStatus(applicationId: string, status: ApplicationStatus): Promise<void> {
    await this.database.query(
      'UPDATE credit_applications SET status = $1, updated_at = $2 WHERE id = $3',
      [status, new Date().toISOString(), applicationId]
    );
  }

  private async logDecisionReview(
    decisionId: string,
    reviewerId: string,
    action: string,
    comments?: string
  ): Promise<void> {
    await this.database.query(`
      INSERT INTO decision_reviews (decision_id, reviewer_id, action, comments, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [decisionId, reviewerId, action, comments, new Date().toISOString()]);
  }

  private mapDatabaseToApplication(row: any): ICreditApplication {
    return {
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
    };
  }

  private mapDatabaseToDecision(row: any): ICreditDecision {
    return {
      id: row.id,
      applicationId: row.application_id,
      decision: row.decision,
      approvedAmount: row.approved_amount,
      interestRate: row.interest_rate,
      termMonths: row.term_months,
      conditions: JSON.parse(row.conditions || '[]'),
      reasons: JSON.parse(row.reasons || '[]'),
      confidence: row.confidence,
      aiRecommendation: JSON.parse(row.ai_recommendation || '{}'),
      riskAssessmentId: row.risk_assessment_id,
      decidedBy: row.decided_by,
      decidedAt: row.decided_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
