'use client';

// =============================================================================
// DASHBOARD LAYOUT - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  ChartBarIcon, 
  CogIcon, 
  UserGroupIcon,
  BellIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';

// =============================================================================
// INTERFACES
// =============================================================================

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: number;
  children?: NavigationItem[];
}

interface QuickStat {
  name: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

// =============================================================================
// DASHBOARD LAYOUT COMPONENT
// =============================================================================

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Navigation items
  const navigation: NavigationItem[] = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: HomeIcon 
    },
    { 
      name: 'Applications', 
      href: '/dashboard/applications', 
      icon: DocumentTextIcon,
      badge: 12,
      children: [
        { name: 'All Applications', href: '/dashboard/applications', icon: DocumentTextIcon },
        { name: 'Pending Review', href: '/dashboard/applications/pending', icon: ClockIcon },
        { name: 'Approved', href: '/dashboard/applications/approved', icon: CheckCircleIcon },
        { name: 'Declined', href: '/dashboard/applications/declined', icon: ExclamationTriangleIcon },
      ]
    },
    { 
      name: 'Risk Analysis', 
      href: '/dashboard/risk', 
      icon: ExclamationTriangleIcon,
      children: [
        { name: 'Risk Dashboard', href: '/dashboard/risk', icon: ChartBarIcon },
        { name: 'Risk Models', href: '/dashboard/risk/models', icon: CogIcon },
        { name: 'Risk Reports', href: '/dashboard/risk/reports', icon: DocumentTextIcon },
      ]
    },
    { 
      name: 'Credit Decisions', 
      href: '/dashboard/decisions', 
      icon: CreditCardIcon,
      badge: 5,
      children: [
        { name: 'Decision Queue', href: '/dashboard/decisions', icon: ClockIcon },
        { name: 'Decision History', href: '/dashboard/decisions/history', icon: DocumentTextIcon },
        { name: 'AI Insights', href: '/dashboard/decisions/ai-insights', icon: ChartBarIcon },
      ]
    },
    { 
      name: 'Analytics', 
      href: '/dashboard/analytics', 
      icon: ChartBarIcon,
      children: [
        { name: 'Performance Metrics', href: '/dashboard/analytics', icon: ChartBarIcon },
        { name: 'Portfolio Analysis', href: '/dashboard/analytics/portfolio', icon: DocumentTextIcon },
        { name: 'Trend Analysis', href: '/dashboard/analytics/trends', icon: ChartBarIcon },
      ]
    },
    { 
      name: 'Knowledge Base', 
      href: '/dashboard/knowledge', 
      icon: DocumentTextIcon,
      children: [
        { name: 'Documents', href: '/dashboard/knowledge/documents', icon: DocumentTextIcon },
        { name: 'Policies', href: '/dashboard/knowledge/policies', icon: CogIcon },
        { name: 'RAG Search', href: '/dashboard/knowledge/search', icon: MagnifyingGlassIcon },
      ]
    },
    { 
      name: 'Users', 
      href: '/dashboard/users', 
      icon: UserGroupIcon 
    },
    { 
      name: 'Settings', 
      href: '/dashboard/settings', 
      icon: CogIcon 
    },
  ];

  // Quick stats for header
  const quickStats: QuickStat[] = [
    {
      name: 'Pending Applications',
      value: '24',
      change: '+12%',
      changeType: 'increase',
      icon: ClockIcon,
    },
    {
      name: 'Approval Rate',
      value: '78%',
      change: '+2.1%',
      changeType: 'increase',
      icon: CheckCircleIcon,
    },
    {
      name: 'Avg Processing Time',
      value: '2.3 days',
      change: '-0.5 days',
      changeType: 'decrease',
      icon: ChartBarIcon,
    },
    {
      name: 'Risk Score Avg',
      value: '42.5',
      change: '-1.2',
      changeType: 'decrease',
      icon: ExclamationTriangleIcon,
    },
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const isActive = isActiveRoute(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const [isExpanded, setIsExpanded] = useState(isActive);

    return (
      <div key={item.name}>
        <Link
          href={item.href}
          className={`
            group flex items-center px-2 py-2 text-sm font-medium rounded-md
            ${level === 0 ? 'pl-3' : 'pl-8'}
            ${isActive
              ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-500'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }
          `}
          onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        >
          <item.icon
            className={`
              mr-3 flex-shrink-0 h-5 w-5
              ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
            `}
            aria-hidden="true"
          />
          <span className="flex-1">{item.name}</span>
          {item.badge && (
            <span className="ml-3 inline-block py-0.5 px-2 text-xs font-medium rounded-full bg-red-100 text-red-800">
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <svg
              className={`ml-2 h-4 w-4 transform transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </Link>
        
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>
          
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <h1 className="text-xl font-bold text-gray-900">Credit Decision Platform</h1>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map(item => renderNavigationItem(item))}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-xl font-bold text-gray-900">Credit Decision Platform</h1>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigation.map(item => renderNavigationItem(item))}
              </nav>
            </div>
            
            {/* User info */}
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between items-center">
            {/* Quick stats */}
            <div className="hidden lg:flex lg:space-x-8">
              {quickStats.map((stat) => (
                <div key={stat.name} className="flex items-center space-x-2">
                  <stat.icon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.name}</p>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      stat.changeType === 'increase'
                        ? 'text-green-600'
                        : stat.changeType === 'decrease'
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
              ))}
            </div>

            {/* Right side */}
            <div className="ml-4 flex items-center md:ml-6 space-x-4">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  placeholder="Search applications..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              {/* Notifications */}
              <button
                type="button"
                className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <BellIcon className="h-6 w-6" aria-hidden="true" />
                <span className="absolute -mt-1 -mr-1 h-3 w-3 rounded-full bg-red-500"></span>
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  type="button"
                  className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={logout}
                >
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
