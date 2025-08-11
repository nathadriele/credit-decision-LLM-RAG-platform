'use client';

// =============================================================================
// APPLICATION DETAIL PAGE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { useAuth } from '@/hooks/useAuth';
import {
    ArrowLeftIcon,
    ChartBarIcon,
    CheckCircleIcon,
    ClockIcon,
    CreditCardIcon,
    DocumentTextIcon,
    ExclamationTriangleIcon,
    PencilIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// =============================================================================
// INTERFACES
// =============================================================================

interface ApplicationDetail {
  id: string;
  applicationNumber: string;
  status: string;
  requestedAmount: number;
  currency: string;
  purpose: string;
  termMonths: number;
  applicantData: {
    personal: {
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      ssn: string;
      email: string;
      phone: string;
      address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        residenceType: string;
        monthsAtAddress: number;
      };
      maritalStatus: string;
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
      existingDebts: Array<{
        type: string;
        creditor: string;
        balance: number;
        monthlyPayment: number;
        interestRate: number;
      }>;
      assets: Array<{
        type: string;
        description: string;
        value: number;
        liquid: boolean;
      }>;
      bankingHistory: {
        primaryBank: string;
        accountAge: number;
        averageBalance: number;
        overdraftHistory: number;
        returnedChecks: number;
      };
    };
    employment: {
      employerName: string;
      jobTitle: string;
      employmentType: string;
      monthsEmployed: number;
      industryType: string;
      supervisorName?: string;
      supervisorPhone?: string;
    };
  };
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface RiskAssessment {
  id: string;
  applicationId: string;
  overallRiskScore: number;
  riskGrade: string;
  probabilityOfDefault: number;
  expectedLoss: number;
  riskFactors: Array<{
    category: string;
    factor: string;
    impact: number;
    weight: number;
    severity: string;
    description: string;
    mitigation?: string;
  }>;
  riskMitigants: Array<{
    category: string;
    mitigant: string;
    impact: number;
    feasibility: string;
    description: string;
  }>;
  recommendations: string[];
  aiInsights: string[];
  processingTime: number;
  createdAt: string;
}

interface CreditDecision {
  id: string;
  applicationId: string;
  decision: string;
  approvedAmount?: number;
  interestRate?: number;
  termMonths?: number;
  conditions: string[];
  reasons: string[];
  confidence: number;
  aiRecommendation: {
    decision: string;
    confidence: number;
    reasoning: string[];
    suggestedAmount?: number;
    suggestedRate?: number;
    suggestedTerm?: number;
    requiredConditions: string[];
    alternativeOptions: Array<{
      type: string;
      description: string;
      parameters: Record<string, any>;
      impact: string;
    }>;
  };
  decidedBy: string;
  decidedAt: string;
  expiresAt?: string;
  createdAt: string;
}

// =============================================================================
// APPLICATION DETAIL PAGE COMPONENT
// =============================================================================

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [decision, setDecision] = useState<CreditDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDecisionModal, setShowDecisionModal] = useState(false);

  const applicationId = params.id as string;

  useEffect(() => {
    if (applicationId) {
      loadApplicationData();
    }
  }, [applicationId]);

  const loadApplicationData = async () => {
    try {
      setLoading(true);

      // Load application details
      const appResponse = await fetch(`/api/credit/applications/${applicationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (appResponse.ok) {
        const appData = await appResponse.json();
        setApplication(appData.data);
      }

      // Load risk assessment
      const riskResponse = await fetch(`/api/credit/risk-assessment/${applicationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (riskResponse.ok) {
        const riskData = await riskResponse.json();
        setRiskAssessment(riskData.data);
      }

      // Load decision
      const decisionResponse = await fetch(`/api/credit/decisions/${applicationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (decisionResponse.ok) {
        const decisionData = await decisionResponse.json();
        setDecision(decisionData.data);
      }

    } catch (error) {
      console.error('Failed to load application data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'CONDITIONAL_APPROVAL':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'DECLINED':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'PENDING_REVIEW':
      case 'DECISION_PENDING':
        return <ClockIcon className="h-6 w-6 text-yellow-500" />;
      case 'RISK_ASSESSMENT':
        return <ExclamationTriangleIcon className="h-6 w-6 text-orange-500" />;
      default:
        return <DocumentTextIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'CONDITIONAL_APPROVAL':
        return 'bg-green-100 text-green-800';
      case 'DECLINED':
        return 'bg-red-100 text-red-800';
      case 'PENDING_REVIEW':
      case 'DECISION_PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'RISK_ASSESSMENT':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score <= 30) return 'text-green-600';
    if (score <= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: DocumentTextIcon },
    { id: 'applicant', name: 'Applicant Details', icon: DocumentTextIcon },
    { id: 'risk', name: 'Risk Assessment', icon: ExclamationTriangleIcon },
    { id: 'decision', name: 'Decision', icon: CreditCardIcon },
    { id: 'timeline', name: 'Timeline', icon: ClockIcon },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Application not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The application you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <div className="mt-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back
              </button>
              <div className="flex items-center space-x-3">
                {getStatusIcon(application.status)}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {application.applicationNumber}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {application.applicantData.personal.firstName} {application.applicantData.personal.lastName}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  application.status
                )}`}
              >
                {application.status.replace('_', ' ')}
              </span>

              {hasPermission('applications:update') && (
                <button
                  onClick={() => router.push(`/dashboard/applications/${applicationId}/edit`)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </button>
              )}

              {hasPermission('decisions:make') && !decision && (
                <button
                  onClick={() => setShowDecisionModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Make Decision
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCardIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Requested Amount</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(application.requestedAmount, application.currency)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Term</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {application.termMonths} months
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Credit Score</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {application.applicantData.financial.creditScore}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Risk Score</dt>
                  <dd className={`text-lg font-medium ${getRiskScoreColor(riskAssessment?.overallRiskScore || 0)}`}>
                    {riskAssessment?.overallRiskScore || 'N/A'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <OverviewTab application={application} riskAssessment={riskAssessment} decision={decision} />
          )}
          {activeTab === 'applicant' && (
            <ApplicantTab applicantData={application.applicantData} />
          )}
          {activeTab === 'risk' && (
            <RiskTab riskAssessment={riskAssessment} />
          )}
          {activeTab === 'decision' && (
            <DecisionTab decision={decision} />
          )}
          {activeTab === 'timeline' && (
            <TimelineTab application={application} riskAssessment={riskAssessment} decision={decision} />
          )}
        </div>
      </div>
    </div>
  );
}