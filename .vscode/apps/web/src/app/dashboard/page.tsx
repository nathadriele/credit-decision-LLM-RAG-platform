'use client';

// =============================================================================
// DASHBOARD PAGE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// =============================================================================
// INTERFACES
// =============================================================================

interface DashboardMetric {
  name: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
}

interface RecentApplication {
  id: string;
  applicationNumber: string;
  applicantName: string;
  requestedAmount: number;
  status: string;
  riskScore: number;
  submittedAt: string;
}

interface AlertItem {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

// =============================================================================
// DASHBOARD PAGE COMPONENT
// =============================================================================

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Simulate API calls - replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock metrics data
      setMetrics([
        {
          name: 'Total Applications',
          value: '1,247',
          change: '+12.5%',
          changeType: 'increase',
          icon: DocumentTextIcon,
          description: 'Applications this month',
        },
        {
          name: 'Approval Rate',
          value: '78.3%',
          change: '+2.1%',
          changeType: 'increase',
          icon: CheckCircleIcon,
          description: 'Approved applications',
        },
        {
          name: 'Avg Risk Score',
          value: '42.5',
          change: '-1.2',
          changeType: 'decrease',
          icon: ExclamationTriangleIcon,
          description: 'Lower is better',
        },
        {
          name: 'Processing Time',
          value: '2.3 days',
          change: '-0.5 days',
          changeType: 'decrease',
          icon: ClockIcon,
          description: 'Average processing time',
        },
        {
          name: 'Portfolio Value',
          value: '$12.4M',
          change: '+8.7%',
          changeType: 'increase',
          icon: CreditCardIcon,
          description: 'Total loan portfolio',
        },
        {
          name: 'Active Users',
          value: '156',
          change: '+5',
          changeType: 'increase',
          icon: UserGroupIcon,
          description: 'Platform users',
        },
      ]);

      // Mock recent applications
      setRecentApplications([
        {
          id: '1',
          applicationNumber: 'APP-2024010001',
          applicantName: 'John Smith',
          requestedAmount: 50000,
          status: 'PENDING_REVIEW',
          riskScore: 35,
          submittedAt: '2024-01-15T10:30:00Z',
        },
        {
          id: '2',
          applicationNumber: 'APP-2024010002',
          applicantName: 'Sarah Johnson',
          requestedAmount: 25000,
          status: 'APPROVED',
          riskScore: 28,
          submittedAt: '2024-01-15T09:15:00Z',
        },
        {
          id: '3',
          applicationNumber: 'APP-2024010003',
          applicantName: 'Michael Brown',
          requestedAmount: 75000,
          status: 'RISK_ASSESSMENT',
          riskScore: 52,
          submittedAt: '2024-01-15T08:45:00Z',
        },
        {
          id: '4',
          applicationNumber: 'APP-2024010004',
          applicantName: 'Emily Davis',
          requestedAmount: 30000,
          status: 'DECLINED',
          riskScore: 78,
          submittedAt: '2024-01-14T16:20:00Z',
        },
        {
          id: '5',
          applicationNumber: 'APP-2024010005',
          applicantName: 'David Wilson',
          requestedAmount: 40000,
          status: 'CONDITIONAL_APPROVAL',
          riskScore: 45,
          submittedAt: '2024-01-14T14:10:00Z',
        },
      ]);

      // Mock alerts
      setAlerts([
        {
          id: '1',
          type: 'warning',
          title: 'High Risk Application',
          message: 'Application APP-2024010003 has a risk score of 85. Requires immediate review.',
          timestamp: '2024-01-15T11:00:00Z',
        },
        {
          id: '2',
          type: 'info',
          title: 'Model Update Available',
          message: 'New risk assessment model v2.1 is available for deployment.',
          timestamp: '2024-01-15T09:30:00Z',
        },
        {
          id: '3',
          type: 'error',
          title: 'API Rate Limit',
          message: 'Credit bureau API rate limit reached. Some applications may be delayed.',
          timestamp: '2024-01-15T08:15:00Z',
        },
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  };

  // Chart data
  const applicationTrendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Applications',
        data: [120, 135, 145, 160, 155, 170, 180, 165, 175, 190, 185, 200],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Approvals',
        data: [95, 105, 115, 125, 120, 135, 140, 130, 140, 150, 145, 155],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const riskDistributionData = {
    labels: ['Low Risk (0-30)', 'Medium Risk (31-60)', 'High Risk (61-100)'],
    datasets: [
      {
        data: [45, 35, 20],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  const statusDistributionData = {
    labels: ['Approved', 'Pending', 'Declined', 'Under Review'],
    datasets: [
      {
        data: [156, 45, 32, 28],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#6B7280'],
        borderWidth: 0,
      },
    ],
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'CONDITIONAL_APPROVAL':
        return 'bg-green-100 text-green-800';
      case 'DECLINED':
        return 'bg-red-100 text-red-800';
      case 'PENDING_REVIEW':
      case 'RISK_ASSESSMENT':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score <= 30) return 'text-green-600';
    if (score <= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of credit decision platform performance and metrics
        </p>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <metric.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{metric.name}</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{metric.value}</div>
                      <div
                        className={`ml-2 flex items-baseline text-sm font-semibold ${
                          metric.changeType === 'increase'
                            ? 'text-green-600'
                            : metric.changeType === 'decrease'
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {metric.changeType === 'increase' ? (
                          <TrendingUpIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                        ) : metric.changeType === 'decrease' ? (
                          <TrendingDownIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" />
                        ) : null}
                        <span className="sr-only">
                          {metric.changeType === 'increase' ? 'Increased' : 'Decreased'} by
                        </span>
                        {metric.change}
                      </div>
                    </dd>
                    <dd className="text-xs text-gray-500 mt-1">{metric.description}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Application Trends</h3>
          <div className="h-64">
            <Line
              data={applicationTrendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Risk distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Distribution</h3>
          <div className="h-64">
            <Doughnut
              data={riskDistributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent applications and alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent applications */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Applications</h3>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {recentApplications.map((application) => (
                  <li key={application.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {application.applicantName}
                        </p>
                        <p className="text-sm text-gray-500">{application.applicationNumber}</p>
                        <p className="text-sm text-gray-500">
                          ${application.requestedAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            application.status
                          )}`}
                        >
                          {application.status.replace('_', ' ')}
                        </span>
                        <span className={`text-sm font-medium ${getRiskScoreColor(application.riskScore)}`}>
                          Risk: {application.riskScore}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6">
              <a
                href="/dashboard/applications"
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                View all applications
              </a>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Alerts</h3>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {alerts.map((alert) => (
                  <li key={alert.id} className="py-4">
                    <div className="flex space-x-3">
                      <div className="flex-shrink-0">
                        <span className="text-lg">{getAlertIcon(alert.type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                        <p className="text-sm text-gray-500">{alert.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6">
              <a
                href="/dashboard/alerts"
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                View all alerts
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Status distribution chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Application Status Distribution</h3>
        <div className="h-64">
          <Bar
            data={statusDistributionData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
