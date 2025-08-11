// =============================================================================
// PROMPT SERVICE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { IMessage } from '../llm';

// =============================================================================
// PROMPT INTERFACES
// =============================================================================

export interface IPromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  category: PromptCategory;
  version: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export enum PromptCategory {
  CREDIT_ANALYSIS = 'CREDIT_ANALYSIS',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  DOCUMENT_ANALYSIS = 'DOCUMENT_ANALYSIS',
  DECISION_EXPLANATION = 'DECISION_EXPLANATION',
  CUSTOMER_COMMUNICATION = 'CUSTOMER_COMMUNICATION',
  COMPLIANCE = 'COMPLIANCE',
  GENERAL = 'GENERAL',
}

export interface IPromptContext {
  applicantData?: any;
  documents?: any[];
  riskAssessment?: any;
  creditHistory?: any;
  policies?: any[];
  regulations?: any[];
  previousDecisions?: any[];
  [key: string]: unknown;
}

// =============================================================================
// PROMPT SERVICE IMPLEMENTATION
// =============================================================================

export class PromptService {
  private templates: Map<string, IPromptTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  // =============================================================================
  // TEMPLATE MANAGEMENT
  // =============================================================================

  addTemplate(template: IPromptTemplate): void {
    this.templates.set(template.id, template);
  }

  getTemplate(id: string): IPromptTemplate | undefined {
    return this.templates.get(id);
  }

  listTemplates(category?: PromptCategory): IPromptTemplate[] {
    const templates = Array.from(this.templates.values());
    return category 
      ? templates.filter(t => t.category === category && t.isActive)
      : templates.filter(t => t.isActive);
  }

  updateTemplate(id: string, updates: Partial<IPromptTemplate>): void {
    const template = this.templates.get(id);
    if (template) {
      this.templates.set(id, { ...template, ...updates });
    }
  }

  deleteTemplate(id: string): void {
    this.templates.delete(id);
  }

  // =============================================================================
  // PROMPT GENERATION
  // =============================================================================

  generatePrompt(templateId: string, context: IPromptContext): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    return this.interpolateTemplate(template.template, context);
  }

  generateMessages(templateId: string, context: IPromptContext): IMessage[] {
    const prompt = this.generatePrompt(templateId, context);
    
    // Parse prompt into messages if it contains role indicators
    if (prompt.includes('SYSTEM:') || prompt.includes('USER:') || prompt.includes('ASSISTANT:')) {
      return this.parseMultiRolePrompt(prompt);
    }

    // Default to user message
    return [{ role: 'user', content: prompt }];
  }

  // =============================================================================
  // CREDIT DECISION SPECIFIC PROMPTS
  // =============================================================================

  generateCreditAnalysisPrompt(context: IPromptContext): IMessage[] {
    return this.generateMessages('credit_analysis_comprehensive', context);
  }

  generateRiskAssessmentPrompt(context: IPromptContext): IMessage[] {
    return this.generateMessages('risk_assessment_detailed', context);
  }

  generateDocumentAnalysisPrompt(context: IPromptContext): IMessage[] {
    return this.generateMessages('document_analysis_extraction', context);
  }

  generateDecisionExplanationPrompt(context: IPromptContext): IMessage[] {
    return this.generateMessages('decision_explanation_detailed', context);
  }

  generateComplianceCheckPrompt(context: IPromptContext): IMessage[] {
    return this.generateMessages('compliance_check_comprehensive', context);
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private interpolateTemplate(template: string, context: IPromptContext): string {
    let result = template;

    // Replace variables in the format {{variable}}
    const variableRegex = /\{\{(\w+(?:\.\w+)*)\}\}/g;
    
    result = result.replace(variableRegex, (match, path) => {
      const value = this.getNestedValue(context, path);
      return value !== undefined ? String(value) : match;
    });

    // Replace conditional blocks {{#if variable}}...{{/if}}
    const conditionalRegex = /\{\{#if\s+(\w+(?:\.\w+)*)\}\}(.*?)\{\{\/if\}\}/gs;
    
    result = result.replace(conditionalRegex, (match, path, content) => {
      const value = this.getNestedValue(context, path);
      return value ? content : '';
    });

    // Replace loops {{#each array}}...{{/each}}
    const loopRegex = /\{\{#each\s+(\w+(?:\.\w+)*)\}\}(.*?)\{\{\/each\}\}/gs;
    
    result = result.replace(loopRegex, (match, path, content) => {
      const array = this.getNestedValue(context, path);
      if (Array.isArray(array)) {
        return array.map((item, index) => {
          let itemContent = content;
          itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
          itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));
          return itemContent;
        }).join('');
      }
      return '';
    });

    return result.trim();
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private parseMultiRolePrompt(prompt: string): IMessage[] {
    const messages: IMessage[] = [];
    const sections = prompt.split(/(?=SYSTEM:|USER:|ASSISTANT:)/);

    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('SYSTEM:')) {
        messages.push({
          role: 'system',
          content: trimmed.substring(7).trim(),
        });
      } else if (trimmed.startsWith('USER:')) {
        messages.push({
          role: 'user',
          content: trimmed.substring(5).trim(),
        });
      } else if (trimmed.startsWith('ASSISTANT:')) {
        messages.push({
          role: 'assistant',
          content: trimmed.substring(10).trim(),
        });
      }
    }

    return messages;
  }

  // =============================================================================
  // DEFAULT TEMPLATES
  // =============================================================================

  private initializeDefaultTemplates(): void {
    // Credit Analysis Template
    this.addTemplate({
      id: 'credit_analysis_comprehensive',
      name: 'Comprehensive Credit Analysis',
      description: 'Detailed analysis of credit application with risk factors',
      category: PromptCategory.CREDIT_ANALYSIS,
      version: '1.0.0',
      isActive: true,
      variables: ['applicantData', 'documents', 'creditHistory', 'policies'],
      template: `SYSTEM: You are an expert credit analyst with 20+ years of experience in financial risk assessment. Your role is to provide comprehensive, objective analysis of credit applications based on established lending criteria and regulatory requirements.

USER: Please analyze the following credit application and provide a detailed assessment:

**Applicant Information:**
{{#if applicantData}}
- Name: {{applicantData.personal.firstName}} {{applicantData.personal.lastName}}
- Age: {{applicantData.personal.age}}
- Employment: {{applicantData.employment.jobTitle}} at {{applicantData.employment.employerName}}
- Annual Income: ${{applicantData.financial.annualIncome}}
- Credit Score: {{applicantData.financial.creditScore}}
- Debt-to-Income Ratio: {{applicantData.financial.debtToIncomeRatio}}%
{{/if}}

**Loan Details:**
- Requested Amount: ${{requestedAmount}}
- Purpose: {{purpose}}
- Term: {{termMonths}} months

**Supporting Documents:**
{{#each documents}}
- {{this.type}}: {{this.name}} (Status: {{this.status}})
{{/each}}

**Credit History:**
{{#if creditHistory}}
- Payment History: {{creditHistory.paymentHistory}}
- Credit Utilization: {{creditHistory.creditUtilization}}%
- Length of Credit History: {{creditHistory.lengthOfHistory}} years
- Recent Inquiries: {{creditHistory.recentInquiries}}
{{/if}}

**Applicable Policies:**
{{#each policies}}
- {{this.name}}: {{this.description}}
{{/each}}

Please provide:
1. **Risk Assessment**: Overall risk level (Low/Medium/High) with detailed reasoning
2. **Strengths**: Positive factors supporting approval
3. **Concerns**: Risk factors and potential issues
4. **Recommendation**: Approve/Conditional Approval/Reject with specific conditions if applicable
5. **Interest Rate Suggestion**: Based on risk profile
6. **Required Documentation**: Any additional documents needed
7. **Compliance Notes**: Regulatory considerations

Format your response in clear sections with bullet points for easy review.`,
    });

    // Risk Assessment Template
    this.addTemplate({
      id: 'risk_assessment_detailed',
      name: 'Detailed Risk Assessment',
      description: 'Comprehensive risk evaluation with scoring',
      category: PromptCategory.RISK_ASSESSMENT,
      version: '1.0.0',
      isActive: true,
      variables: ['applicantData', 'riskFactors', 'industryData'],
      template: `SYSTEM: You are a senior risk assessment specialist. Evaluate credit risk using quantitative and qualitative factors, providing detailed scoring and probability assessments.

USER: Conduct a comprehensive risk assessment for this credit application:

**Applicant Profile:**
{{#if applicantData}}
- Income Stability: {{applicantData.employment.monthsEmployed}} months with current employer
- Industry: {{applicantData.employment.industry}}
- Income Verification: {{applicantData.financial.incomeVerified}}
- Assets: ${{applicantData.financial.totalAssets}}
- Liabilities: ${{applicantData.financial.totalLiabilities}}
{{/if}}

**Risk Factors to Evaluate:**
1. **Credit Risk**: Payment history, credit utilization, credit mix
2. **Income Risk**: Employment stability, industry volatility, income trends
3. **Collateral Risk**: Asset quality and liquidity
4. **Market Risk**: Economic conditions, industry outlook
5. **Operational Risk**: Documentation quality, fraud indicators

**Industry Benchmarks:**
{{#if industryData}}
- Industry Default Rate: {{industryData.defaultRate}}%
- Economic Outlook: {{industryData.outlook}}
- Regulatory Environment: {{industryData.regulatoryStatus}}
{{/if}}

Provide:
1. **Risk Score** (1-100 scale) with component breakdown
2. **Probability of Default** (percentage)
3. **Loss Given Default** estimation
4. **Risk Grade** (AAA to D)
5. **Key Risk Drivers** (top 3 factors)
6. **Risk Mitigation** recommendations
7. **Monitoring Requirements** for ongoing assessment

Include quantitative analysis where possible and explain your methodology.`,
    });

    // Document Analysis Template
    this.addTemplate({
      id: 'document_analysis_extraction',
      name: 'Document Analysis and Data Extraction',
      description: 'Extract and verify information from uploaded documents',
      category: PromptCategory.DOCUMENT_ANALYSIS,
      version: '1.0.0',
      isActive: true,
      variables: ['documentContent', 'documentType', 'expectedFields'],
      template: `SYSTEM: You are a document analysis expert specializing in financial document verification and data extraction. Extract accurate information and identify any inconsistencies or red flags.

USER: Analyze the following {{documentType}} document and extract relevant information:

**Document Content:**
{{documentContent}}

**Expected Information to Extract:**
{{#each expectedFields}}
- {{this.name}}: {{this.description}}
{{/each}}

Please provide:

1. **Extracted Data**: 
   - Format as structured JSON with field names and values
   - Include confidence level for each extracted field (High/Medium/Low)

2. **Document Quality Assessment**:
   - Completeness (all required fields present)
   - Clarity (legible and clear)
   - Authenticity indicators
   - Any signs of alteration or fraud

3. **Verification Status**:
   - Cross-reference with application data
   - Identify any discrepancies
   - Flag missing information

4. **Risk Indicators**:
   - Inconsistent information
   - Unusual patterns
   - Missing signatures or dates
   - Quality concerns

5. **Recommendations**:
   - Accept/Request clarification/Reject
   - Additional verification needed
   - Follow-up actions required

Ensure accuracy and highlight any concerns that require human review.`,
    });

    // Decision Explanation Template
    this.addTemplate({
      id: 'decision_explanation_detailed',
      name: 'Credit Decision Explanation',
      description: 'Generate clear explanation for credit decisions',
      category: PromptCategory.DECISION_EXPLANATION,
      version: '1.0.0',
      isActive: true,
      variables: ['decision', 'riskAssessment', 'applicantData', 'policies'],
      template: `SYSTEM: You are a customer communication specialist. Create clear, professional explanations for credit decisions that are compliant with regulations and easy for customers to understand.

USER: Generate a comprehensive explanation for the following credit decision:

**Decision**: {{decision}}
**Risk Assessment**: {{riskAssessment}}
**Application Details**: {{applicantData}}

Create an explanation that includes:

1. **Decision Summary**: Clear statement of approval/rejection/conditional approval

2. **Key Factors** (in order of importance):
   {{#if decision.approved}}
   - Positive factors that supported approval
   - Loan terms and conditions
   {{else}}
   - Primary reasons for rejection
   - Specific areas of concern
   {{/if}}

3. **Supporting Details**:
   - Credit score impact
   - Income and employment factors
   - Debt-to-income considerations
   - Documentation quality

4. **Next Steps**:
   {{#if decision.approved}}
   - Loan processing timeline
   - Required documentation
   - Terms and conditions
   {{else}}
   - Improvement recommendations
   - Reapplication timeline
   - Alternative options
   {{/if}}

5. **Regulatory Disclosures**:
   - Fair Credit Reporting Act notices
   - Equal Credit Opportunity Act compliance
   - Right to obtain credit report

6. **Contact Information**:
   - Customer service details
   - Appeal process if applicable

Ensure the explanation is:
- Professional and empathetic
- Compliant with lending regulations
- Clear and easy to understand
- Actionable for the customer`,
    });

    // Compliance Check Template
    this.addTemplate({
      id: 'compliance_check_comprehensive',
      name: 'Comprehensive Compliance Check',
      description: 'Verify compliance with lending regulations and policies',
      category: PromptCategory.COMPLIANCE,
      version: '1.0.0',
      isActive: true,
      variables: ['application', 'decision', 'regulations', 'policies'],
      template: `SYSTEM: You are a compliance officer with expertise in lending regulations. Review the credit decision for compliance with all applicable laws and internal policies.

USER: Conduct a comprehensive compliance review of this credit decision:

**Application Summary**: {{application}}
**Decision Details**: {{decision}}

**Regulatory Framework to Check**:
1. **Fair Credit Reporting Act (FCRA)**
2. **Equal Credit Opportunity Act (ECOA)**
3. **Truth in Lending Act (TILA)**
4. **Fair Debt Collection Practices Act (FDCPA)**
5. **Bank Secrecy Act (BSA)**
6. **Know Your Customer (KYC) requirements**

**Internal Policies**: {{policies}}

Review for:

1. **Discrimination Compliance**:
   - No prohibited basis factors in decision
   - Consistent application of criteria
   - Documentation of legitimate business reasons

2. **Documentation Requirements**:
   - All required disclosures provided
   - Proper adverse action notices
   - Credit report usage compliance

3. **Decision Consistency**:
   - Alignment with stated policies
   - Similar treatment of comparable applications
   - Appropriate risk-based pricing

4. **Record Keeping**:
   - Complete application file
   - Decision rationale documented
   - Audit trail maintained

5. **Customer Rights**:
   - Proper notifications provided
   - Appeal process available
   - Privacy protections in place

Provide:
- **Compliance Status**: Pass/Fail with specific issues
- **Required Actions**: Immediate corrections needed
- **Risk Assessment**: Regulatory risk level
- **Recommendations**: Process improvements
- **Documentation**: Additional records needed

Flag any high-risk compliance issues for immediate attention.`,
    });
  }
}
