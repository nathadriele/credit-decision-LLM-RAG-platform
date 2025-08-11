'use client';

// =============================================================================
// APPLICATIONS PAGE - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

// =============================================================================
// INTERFACES
// =============================================================================

interface Application {
  id: string;
  applicationNumber: string;
  applicantName: string;
  applicantEmail: string;
  requestedAmount: number;
  currency: string;
  purpose: string;
  termMonths: number;
  status: string;
  riskScore?: number;
  riskGrade?: string;
  decision?: string;
  submittedAt: string;
  updatedAt: string;
}

interface FilterOptions {
  status: string;
  purpose: string;
  riskGrade: string;
  amountRange: string;
  dateRange: string;
}

// =============================================================================
// APPLICATIONS PAGE COMPONENT
// =============================================================================

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    purpose: '',
    riskGrade: '',
    amountRange: '',
    dateRange: '',
  });

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    filterAndSortApplications();
  }, [applications, searchTerm, filters, sortBy, sortOrder]);

  const loadApplications = async () => {
    try {
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockApplications: Application[] = [
        {
          id: '1',
          applicationNumber: 'APP-2024010001',
          applicantName: 'John Smith',
          applicantEmail: 'john.smith@email.com',
          requestedAmount: 50000,
          currency: 'USD',
          purpose: 'PERSONAL',
          termMonths: 60,
          status: 'PENDING_REVIEW',
          riskScore: 35,
          riskGrade: 'A',
          submittedAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
        },
        {
          id: '2',
          applicationNumber: 'APP-2024010002',
          applicantName: 'Sarah Johnson',
          applicantEmail: 'sarah.johnson@email.com',
          requestedAmount: 25000,
          currency: 'USD',
          purpose: 'AUTO',
          termMonths: 48,
          status: 'APPROVED',
          riskScore: 28,
          riskGrade: 'AA',
          decision: 'APPROVED',
          submittedAt: '2024-01-15T09:15:00Z',
          updatedAt: '2024-01-15T11:45:00Z',
        },
        {
          id: '3',
          applicationNumber: 'APP-2024010003',
          applicantName: 'Michael Brown',
          applicantEmail: 'michael.brown@email.com',
          requestedAmount: 75000,
          currency: 'USD',
          purpose: 'BUSINESS',
          termMonths: 84,
          status: 'RISK_ASSESSMENT',
          riskScore: 52,
          riskGrade: 'BBB',
          submittedAt: '2024-01-15T08:45:00Z',
          updatedAt: '2024-01-15T09:30:00Z',
        },
        {
          id: '4',
          applicationNumber: 'APP-2024010004',
          applicantName: 'Emily Davis',
          applicantEmail: 'emily.davis@email.com',
          requestedAmount: 30000,
          currency: 'USD',
          purpose: 'DEBT_CONSOLIDATION',
          termMonths: 36,
          status: 'DECLINED',
          riskScore: 78,
          riskGrade: 'B',
          decision: 'DECLINED',
          submittedAt: '2024-01-14T16:20:00Z',
          updatedAt: '2024-01-14T18:15:00Z',
        },
        {
          id: '5',
          applicationNumber: 'APP-2024010005',
          applicantName: 'David Wilson',
          applicantEmail: 'david.wilson@email.com',
          requestedAmount: 40000,
          currency: 'USD',
          purpose: 'HOME',
          termMonths: 120,
          status: 'CONDITIONAL_APPROVAL',
          riskScore: 45,
          riskGrade: 'BBB',
          decision: 'CONDITIONAL_APPROVAL',
          submittedAt: '2024-01-14T14:10:00Z',
          updatedAt: '2024-01-14T16:30:00Z',
        },
        // Add more mock data...
      ];

      setApplications(mockApplications);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load applications:', error);
      setLoading(false);
    }
  };

  const filterAndSortApplications = () => {
    let filtered = applications.filter(app => {
      const matchesSearch = 
        app.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.applicantEmail.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = !filters.status || app.status === filters.status;
      const matchesPurpose = !filters.purpose || app.purpose === filters.purpose;
      const matchesRiskGrade = !filters.riskGrade || app.riskGrade === filters.riskGrade;

      return matchesSearch && matchesStatus && matchesPurpose && matchesRiskGrade;
    });

    // Sort applications
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Application];
      let bValue: any = b[sortBy as keyof Application];

      if (sortBy === 'submittedAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredApplications(filtered);
    setCurrentPage(1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'CONDITIONAL_APPROVAL':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'DECLINED':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'PENDING_REVIEW':
      case 'DECISION_PENDING':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'RISK_ASSESSMENT':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
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

  const getRiskScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Pagination
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentApplications = filteredApplications.slice(startIndex, endIndex);

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
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and review credit applications
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/dashboard/applications/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            New Application
          </Link>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Search */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FunnelIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Filters
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RISK_ASSESSMENT">Risk Assessment</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="DECLINED">Declined</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Purpose</label>
              <select
                value={filters.purpose}
                onChange={(e) => setFilters({ ...filters, purpose: e.target.value })}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Purposes</option>
                <option value="PERSONAL">Personal</option>
                <option value="BUSINESS">Business</option>
                <option value="AUTO">Auto</option>
                <option value="HOME">Home</option>
                <option value="EDUCATION">Education</option>
                <option value="DEBT_CONSOLIDATION">Debt Consolidation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Risk Grade</label>
              <select
                value={filters.riskGrade}
                onChange={(e) => setFilters({ ...filters, riskGrade: e.target.value })}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Grades</option>
                <option value="AAA">AAA</option>
                <option value="AA">AA</option>
                <option value="A">A</option>
                <option value="BBB">BBB</option>
                <option value="BB">BB</option>
                <option value="B">B</option>
                <option value="CCC">CCC</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Sort By</label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="submittedAt-desc">Newest First</option>
                <option value="submittedAt-asc">Oldest First</option>
                <option value="requestedAmount-desc">Amount (High to Low)</option>
                <option value="requestedAmount-asc">Amount (Low to High)</option>
                <option value="riskScore-asc">Risk Score (Low to High)</option>
                <option value="riskScore-desc">Risk Score (High to Low)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Applications table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Applications ({filteredApplications.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Application
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purpose
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(application.status)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {application.applicationNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.termMonths} months
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {application.applicantName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {application.applicantEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(application.requestedAmount, application.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {application.purpose.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          application.status
                        )}`}
                      >
                        {application.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {application.riskScore && (
                        <div className="text-sm">
                          <div className={`font-medium ${getRiskScoreColor(application.riskScore)}`}>
                            {application.riskScore}
                          </div>
                          <div className="text-gray-500">{application.riskGrade}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(application.submittedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/applications/${application.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredApplications.length)} of{' '}
                {filteredApplications.length} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
