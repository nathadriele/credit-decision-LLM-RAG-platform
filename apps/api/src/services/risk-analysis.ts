// =============================================================================
// RISK ANALYSIS SERVICE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { EnhancedRAGService } from '@credit-decision/ai';
import { DatabaseService } from './database';
import { CacheService } from './cache';

// =============================================================================
// INTERFACES
// =============================================================================

export interface IApplicantData {
  personal: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    ssn: string;
    email: string;
    phone: string;
    address: IAddress;
    maritalStatus: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
    dependents: number;
    citizenship: string;
  };
  financial: {
    annualIncome: number;
    monthlyIncome: number;
    otherIncome?: number;
    monthlyExpenses: number;
    creditScore: number;
    debtToIncomeRatio: number;
    existingDebts: IDebt[];
    assets: IAsset[];
    bankingHistory: IBankingHistory;
  };
  employment: {
    employerName: string;
    jobTitle: string;
    employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'SELF_EMPLOYED';
    monthsEmployed: number;
    industryType: string;
    supervisorName?: string;
    supervisorPhone?: string;
  };
}

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  residenceType: 'OWN' | 'RENT' | 'MORTGAGE' | 'OTHER';
  monthsAtAddress: number;
}

export interface IDebt {
  type: 'CREDIT_CARD' | 'AUTO_LOAN' | 'MORTGAGE' | 'STUDENT_LOAN' | 'PERSONAL_LOAN' | 'OTHER';
  creditor: string;
  balance: number;
  monthlyPayment: number;
  interestRate: number;
  remainingTerm?: number;
}

export interface IAsset {
  type: 'CHECKING' | 'SAVINGS' | 'INVESTMENT' | 'REAL_ESTATE' | 'VEHICLE' | 'OTHER';
  description: string;
  value: number;
  liquid: boolean;
}

export interface IBankingHistory {
  primaryBank: string;
  accountAge: number;
  averageBalance: number;
  overdraftHistory: number;
  returnedChecks: number;
}

export interface IRiskFactor {
  category: RiskCategory;
  factor: string;
  impact: number; // -100 to +100
  weight: number; // 0 to 1
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  mitigation?: string;
}

export interface IRiskAssessment {
  id: string;
  applicationId: string;
  overallRiskScore: number; // 0 to 100
  riskGrade: RiskGrade;
  probabilityOfDefault: number; // 0 to 1
  expectedLoss: number; // 0 to 1
  riskFactors: IRiskFactor[];
  riskMitigants: IRiskMitigant[];
  modelOutputs: IModelOutput[];
  recommendations: string[];
  aiInsights: string[];
  processingTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface IRiskMitigant {
  category: string;
  mitigant: string;
  impact: number; // Positive impact on risk reduction
  feasibility: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

export interface IModelOutput {
  modelName: string;
  version: string;
  score: number;
  confidence: number;
  features: Record<string, number>;
  explanation: string;
}

export enum RiskCategory {
  CREDIT_HISTORY = 'CREDIT_HISTORY',
  INCOME_STABILITY = 'INCOME_STABILITY',
  DEBT_BURDEN = 'DEBT_BURDEN',
  EMPLOYMENT = 'EMPLOYMENT',
  COLLATERAL = 'COLLATERAL',
  BEHAVIORAL = 'BEHAVIORAL',
  EXTERNAL = 'EXTERNAL',
  REGULATORY = 'REGULATORY',
}

export enum RiskGrade {
  AAA = 'AAA', // Excellent (0-10)
  AA = 'AA',   // Very Good (11-20)
  A = 'A',     // Good (21-35)
  BBB = 'BBB', // Fair (36-50)
  BB = 'BB',   // Poor (51-70)
  B = 'B',     // Very Poor (71-85)
  CCC = 'CCC', // Extremely Poor (86-100)
}

export interface IRiskAnalysisConfig {
  ragService: EnhancedRAGService;
  database: DatabaseService;
  cache: CacheService;
  enableAIInsights: boolean;
  enableModelEnsemble: boolean;
  riskThresholds: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    veryPoor: number;
  };
  weightings: {
    creditHistory: number;
    incomeStability: number;
    debtBurden: number;
    employment: number;
    collateral: number;
    behavioral: number;
  };
}

// =============================================================================
// RISK ANALYSIS SERVICE
// =============================================================================

export class RiskAnalysisService {
  private ragService: EnhancedRAGService;
  private database: DatabaseService;
  private cache: CacheService;
  private config: IRiskAnalysisConfig;

  constructor(config: IRiskAnalysisConfig) {
    this.ragService = config.ragService;
    this.database = config.database;
    this.cache = config.cache;
    this.config = config;
  }

  async assessRisk(
    applicationId: string,
    applicantData: IApplicantData,
    loanAmount: number,
    loanTerm: number,
    loanPurpose: string
  ): Promise<IRiskAssessment> {
    const startTime = Date.now();

    try {
      // Step 1: Calculate individual risk factors
      const riskFactors = await this.calculateRiskFactors(applicantData, loanAmount, loanTerm);

      // Step 2: Apply AI-powered risk insights
      const aiInsights = this.config.enableAIInsights
        ? await this.generateAIInsights(applicantData, loanAmount, loanPurpose, riskFactors)
        : [];

      // Step 3: Calculate overall risk score
      const overallRiskScore = this.calculateOverallRiskScore(riskFactors);

      // Step 4: Determine risk grade
      const riskGrade = this.determineRiskGrade(overallRiskScore);

      // Step 5: Calculate probability of default and expected loss
      const probabilityOfDefault = this.calculateProbabilityOfDefault(overallRiskScore, riskFactors);
      const expectedLoss = this.calculateExpectedLoss(probabilityOfDefault, loanAmount);

      // Step 6: Generate risk mitigants
      const riskMitigants = await this.generateRiskMitigants(riskFactors, applicantData);

      // Step 7: Run ensemble models if enabled
      const modelOutputs = this.config.enableModelEnsemble
        ? await this.runEnsembleModels(applicantData, loanAmount, loanTerm)
        : [];

      // Step 8: Generate recommendations
      const recommendations = await this.generateRecommendations(
        riskFactors,
        riskMitigants,
        overallRiskScore,
        aiInsights
      );

      const assessment: IRiskAssessment = {
        id: this.generateAssessmentId(),
        applicationId,
        overallRiskScore,
        riskGrade,
        probabilityOfDefault,
        expectedLoss,
        riskFactors,
        riskMitigants,
        modelOutputs,
        recommendations,
        aiInsights,
        processingTime: Date.now() - startTime,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Cache the assessment
      await this.cache.set(`risk_assessment:${applicationId}`, assessment, 3600);

      // Store in database
      await this.storeAssessment(assessment);

      return assessment;

    } catch (error) {
      throw new Error(`Risk assessment failed: ${error.message}`);
    }
  }

  async getRiskAssessment(applicationId: string): Promise<IRiskAssessment | null> {
    // Try cache first
    const cached = await this.cache.get(`risk_assessment:${applicationId}`);
    if (cached) {
      return cached;
    }

    // Fallback to database
    const result = await this.database.query(
      'SELECT * FROM risk_assessments WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1',
      [applicationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const assessment = this.mapDatabaseToAssessment(result.rows[0]);
    
    // Cache for future requests
    await this.cache.set(`risk_assessment:${applicationId}`, assessment, 3600);

    return assessment;
  }

  // =============================================================================
  // PRIVATE METHODS - RISK CALCULATION
  // =============================================================================

  private async calculateRiskFactors(
    applicantData: IApplicantData,
    loanAmount: number,
    loanTerm: number
  ): Promise<IRiskFactor[]> {
    const factors: IRiskFactor[] = [];

    // Credit History Factors
    factors.push(...this.assessCreditHistory(applicantData.financial));

    // Income Stability Factors
    factors.push(...this.assessIncomeStability(applicantData.financial, applicantData.employment));

    // Debt Burden Factors
    factors.push(...this.assessDebtBurden(applicantData.financial, loanAmount));

    // Employment Factors
    factors.push(...this.assessEmployment(applicantData.employment));

    // Behavioral Factors
    factors.push(...this.assessBehavioralFactors(applicantData));

    // External Factors
    factors.push(...await this.assessExternalFactors(applicantData));

    return factors;
  }

  private assessCreditHistory(financial: IApplicantData['financial']): IRiskFactor[] {
    const factors: IRiskFactor[] = [];

    // Credit Score Assessment
    if (financial.creditScore >= 750) {
      factors.push({
        category: RiskCategory.CREDIT_HISTORY,
        factor: 'Excellent Credit Score',
        impact: 25,
        weight: 0.3,
        severity: 'LOW',
        description: `Credit score of ${financial.creditScore} indicates excellent credit management`,
      });
    } else if (financial.creditScore >= 700) {
      factors.push({
        category: RiskCategory.CREDIT_HISTORY,
        factor: 'Good Credit Score',
        impact: 15,
        weight: 0.3,
        severity: 'LOW',
        description: `Credit score of ${financial.creditScore} indicates good credit management`,
      });
    } else if (financial.creditScore >= 650) {
      factors.push({
        category: RiskCategory.CREDIT_HISTORY,
        factor: 'Fair Credit Score',
        impact: -10,
        weight: 0.3,
        severity: 'MEDIUM',
        description: `Credit score of ${financial.creditScore} indicates fair credit management`,
        mitigation: 'Consider requiring additional collateral or co-signer',
      });
    } else {
      factors.push({
        category: RiskCategory.CREDIT_HISTORY,
        factor: 'Poor Credit Score',
        impact: -30,
        weight: 0.3,
        severity: 'HIGH',
        description: `Credit score of ${financial.creditScore} indicates poor credit management`,
        mitigation: 'Require significant collateral and higher interest rate',
      });
    }

    return factors;
  }

  private assessIncomeStability(
    financial: IApplicantData['financial'],
    employment: IApplicantData['employment']
  ): IRiskFactor[] {
    const factors: IRiskFactor[] = [];

    // Employment Length
    if (employment.monthsEmployed >= 24) {
      factors.push({
        category: RiskCategory.INCOME_STABILITY,
        factor: 'Stable Employment History',
        impact: 15,
        weight: 0.25,
        severity: 'LOW',
        description: `${employment.monthsEmployed} months of employment shows stability`,
      });
    } else if (employment.monthsEmployed >= 12) {
      factors.push({
        category: RiskCategory.INCOME_STABILITY,
        factor: 'Moderate Employment History',
        impact: 5,
        weight: 0.25,
        severity: 'MEDIUM',
        description: `${employment.monthsEmployed} months of employment is acceptable`,
      });
    } else {
      factors.push({
        category: RiskCategory.INCOME_STABILITY,
        factor: 'Short Employment History',
        impact: -15,
        weight: 0.25,
        severity: 'HIGH',
        description: `Only ${employment.monthsEmployed} months of employment`,
        mitigation: 'Verify income stability and consider probationary period',
      });
    }

    // Employment Type
    if (employment.employmentType === 'SELF_EMPLOYED') {
      factors.push({
        category: RiskCategory.INCOME_STABILITY,
        factor: 'Self-Employed Income',
        impact: -10,
        weight: 0.2,
        severity: 'MEDIUM',
        description: 'Self-employed income can be variable',
        mitigation: 'Require additional income documentation and tax returns',
      });
    }

    return factors;
  }

  private assessDebtBurden(
    financial: IApplicantData['financial'],
    loanAmount: number
  ): IRiskFactor[] {
    const factors: IRiskFactor[] = [];

    // Debt-to-Income Ratio
    const newMonthlyPayment = this.estimateMonthlyPayment(loanAmount, 0.06, 60); // Estimate
    const projectedDTI = (financial.monthlyExpenses + newMonthlyPayment) / financial.monthlyIncome;

    if (projectedDTI <= 0.3) {
      factors.push({
        category: RiskCategory.DEBT_BURDEN,
        factor: 'Low Debt-to-Income Ratio',
        impact: 20,
        weight: 0.25,
        severity: 'LOW',
        description: `Projected DTI of ${(projectedDTI * 100).toFixed(1)}% is excellent`,
      });
    } else if (projectedDTI <= 0.4) {
      factors.push({
        category: RiskCategory.DEBT_BURDEN,
        factor: 'Moderate Debt-to-Income Ratio',
        impact: 0,
        weight: 0.25,
        severity: 'MEDIUM',
        description: `Projected DTI of ${(projectedDTI * 100).toFixed(1)}% is acceptable`,
      });
    } else {
      factors.push({
        category: RiskCategory.DEBT_BURDEN,
        factor: 'High Debt-to-Income Ratio',
        impact: -25,
        weight: 0.25,
        severity: 'HIGH',
        description: `Projected DTI of ${(projectedDTI * 100).toFixed(1)}% is concerning`,
        mitigation: 'Consider reducing loan amount or requiring debt consolidation',
      });
    }

    return factors;
  }

  private assessEmployment(employment: IApplicantData['employment']): IRiskFactor[] {
    const factors: IRiskFactor[] = [];

    // Industry Risk Assessment
    const highRiskIndustries = ['HOSPITALITY', 'RETAIL', 'CONSTRUCTION', 'ENTERTAINMENT'];
    const stableIndustries = ['HEALTHCARE', 'EDUCATION', 'GOVERNMENT', 'UTILITIES'];

    if (stableIndustries.includes(employment.industryType)) {
      factors.push({
        category: RiskCategory.EMPLOYMENT,
        factor: 'Stable Industry Employment',
        impact: 10,
        weight: 0.15,
        severity: 'LOW',
        description: `Employment in ${employment.industryType} is typically stable`,
      });
    } else if (highRiskIndustries.includes(employment.industryType)) {
      factors.push({
        category: RiskCategory.EMPLOYMENT,
        factor: 'Volatile Industry Employment',
        impact: -15,
        weight: 0.15,
        severity: 'MEDIUM',
        description: `Employment in ${employment.industryType} can be volatile`,
        mitigation: 'Consider additional income verification or emergency fund requirements',
      });
    }

    return factors;
  }

  private assessBehavioralFactors(applicantData: IApplicantData): IRiskFactor[] {
    const factors: IRiskFactor[] = [];

    // Banking History
    if (applicantData.financial.bankingHistory.overdraftHistory > 5) {
      factors.push({
        category: RiskCategory.BEHAVIORAL,
        factor: 'Frequent Overdrafts',
        impact: -20,
        weight: 0.1,
        severity: 'HIGH',
        description: `${applicantData.financial.bankingHistory.overdraftHistory} overdrafts indicate poor money management`,
        mitigation: 'Require financial counseling or automatic payment setup',
      });
    }

    return factors;
  }

  private async assessExternalFactors(applicantData: IApplicantData): Promise<IRiskFactor[]> {
    const factors: IRiskFactor[] = [];

    // Economic conditions, regional factors, etc.
    // This would typically involve external data sources

    return factors;
  }

  private calculateOverallRiskScore(riskFactors: IRiskFactor[]): number {
    let weightedScore = 0;
    let totalWeight = 0;

    for (const factor of riskFactors) {
      weightedScore += factor.impact * factor.weight;
      totalWeight += factor.weight;
    }

    // Normalize to 0-100 scale (50 is neutral)
    const normalizedScore = 50 + (weightedScore / totalWeight);
    
    // Ensure score is within bounds
    return Math.max(0, Math.min(100, normalizedScore));
  }

  private determineRiskGrade(riskScore: number): RiskGrade {
    if (riskScore <= 10) return RiskGrade.AAA;
    if (riskScore <= 20) return RiskGrade.AA;
    if (riskScore <= 35) return RiskGrade.A;
    if (riskScore <= 50) return RiskGrade.BBB;
    if (riskScore <= 70) return RiskGrade.BB;
    if (riskScore <= 85) return RiskGrade.B;
    return RiskGrade.CCC;
  }

  private calculateProbabilityOfDefault(riskScore: number, riskFactors: IRiskFactor[]): number {
    // Simplified PD calculation - in practice, this would use sophisticated models
    const basePD = Math.pow(riskScore / 100, 2) * 0.15; // Max 15% PD
    
    // Adjust based on specific risk factors
    let adjustment = 0;
    for (const factor of riskFactors) {
      if (factor.severity === 'CRITICAL') adjustment += 0.02;
      else if (factor.severity === 'HIGH') adjustment += 0.01;
    }

    return Math.min(0.5, basePD + adjustment); // Cap at 50%
  }

  private calculateExpectedLoss(probabilityOfDefault: number, loanAmount: number): number {
    const lossGivenDefault = 0.45; // Assume 45% LGD
    const exposureAtDefault = 1.0; // Assume full exposure
    
    return probabilityOfDefault * lossGivenDefault * exposureAtDefault;
  }

  private async generateAIInsights(
    applicantData: IApplicantData,
    loanAmount: number,
    loanPurpose: string,
    riskFactors: IRiskFactor[]
  ): Promise<string[]> {
    try {
      const query = `
        Analyze the following credit application for key risk insights:
        
        Applicant Profile:
        - Credit Score: ${applicantData.financial.creditScore}
        - Annual Income: $${applicantData.financial.annualIncome.toLocaleString()}
        - DTI Ratio: ${(applicantData.financial.debtToIncomeRatio * 100).toFixed(1)}%
        - Employment: ${applicantData.employment.employmentType} for ${applicantData.employment.monthsEmployed} months
        
        Loan Details:
        - Amount: $${loanAmount.toLocaleString()}
        - Purpose: ${loanPurpose}
        
        Risk Factors Identified:
        ${riskFactors.map(f => `- ${f.factor}: ${f.description}`).join('\n')}
        
        Provide 3-5 key insights about this application's risk profile.
      `;

      const response = await this.ragService.query({
        query,
        domain: 'risk',
        responseFormat: 'bullet_points',
        topK: 5,
      });

      // Extract insights from the response
      const insights = response.answer
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map(line => line.replace(/^[-•]\s*/, '').trim())
        .filter(insight => insight.length > 0);

      return insights.slice(0, 5); // Limit to 5 insights

    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      return [];
    }
  }

  private async generateRiskMitigants(
    riskFactors: IRiskFactor[],
    applicantData: IApplicantData
  ): Promise<IRiskMitigant[]> {
    const mitigants: IRiskMitigant[] = [];

    // Generate mitigants based on risk factors
    for (const factor of riskFactors) {
      if (factor.mitigation) {
        mitigants.push({
          category: factor.category,
          mitigant: factor.mitigation,
          impact: Math.abs(factor.impact) * 0.5, // Mitigation reduces impact by 50%
          feasibility: this.assessMitigationFeasibility(factor, applicantData),
          description: `Mitigation for: ${factor.factor}`,
        });
      }
    }

    return mitigants;
  }

  private assessMitigationFeasibility(
    factor: IRiskFactor,
    applicantData: IApplicantData
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    // Simplified feasibility assessment
    if (factor.severity === 'LOW') return 'HIGH';
    if (factor.severity === 'MEDIUM') return 'MEDIUM';
    return 'LOW';
  }

  private async runEnsembleModels(
    applicantData: IApplicantData,
    loanAmount: number,
    loanTerm: number
  ): Promise<IModelOutput[]> {
    // Placeholder for ensemble model execution
    // In practice, this would call various ML models
    return [];
  }

  private async generateRecommendations(
    riskFactors: IRiskFactor[],
    riskMitigants: IRiskMitigant[],
    overallRiskScore: number,
    aiInsights: string[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Risk-based recommendations
    if (overallRiskScore <= 35) {
      recommendations.push('Application shows low risk - recommend approval with standard terms');
    } else if (overallRiskScore <= 70) {
      recommendations.push('Application shows moderate risk - consider approval with enhanced terms');
      recommendations.push('Implement additional monitoring and review requirements');
    } else {
      recommendations.push('Application shows high risk - recommend decline or require significant risk mitigation');
    }

    // Factor-specific recommendations
    const highRiskFactors = riskFactors.filter(f => f.severity === 'HIGH' || f.severity === 'CRITICAL');
    if (highRiskFactors.length > 0) {
      recommendations.push(`Address ${highRiskFactors.length} high-risk factors before approval`);
    }

    // Mitigation recommendations
    const feasibleMitigants = riskMitigants.filter(m => m.feasibility === 'HIGH');
    if (feasibleMitigants.length > 0) {
      recommendations.push(`Consider implementing ${feasibleMitigants.length} feasible risk mitigations`);
    }

    return recommendations;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private estimateMonthlyPayment(principal: number, rate: number, termMonths: number): number {
    const monthlyRate = rate / 12;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
           (Math.pow(1 + monthlyRate, termMonths) - 1);
  }

  private generateAssessmentId(): string {
    return `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storeAssessment(assessment: IRiskAssessment): Promise<void> {
    await this.database.query(`
      INSERT INTO risk_assessments (
        id, application_id, overall_risk_score, risk_grade, 
        probability_of_default, expected_loss, risk_factors, 
        risk_mitigants, model_outputs, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      assessment.id,
      assessment.applicationId,
      assessment.overallRiskScore,
      assessment.riskGrade,
      assessment.probabilityOfDefault,
      assessment.expectedLoss,
      JSON.stringify(assessment.riskFactors),
      JSON.stringify(assessment.riskMitigants),
      JSON.stringify(assessment.modelOutputs),
      assessment.createdAt,
      assessment.updatedAt,
    ]);
  }

  private mapDatabaseToAssessment(row: any): IRiskAssessment {
    return {
      id: row.id,
      applicationId: row.application_id,
      overallRiskScore: row.overall_risk_score,
      riskGrade: row.risk_grade,
      probabilityOfDefault: row.probability_of_default,
      expectedLoss: row.expected_loss,
      riskFactors: JSON.parse(row.risk_factors || '[]'),
      riskMitigants: JSON.parse(row.risk_mitigants || '[]'),
      modelOutputs: JSON.parse(row.model_outputs || '[]'),
      recommendations: [],
      aiInsights: [],
      processingTime: 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
