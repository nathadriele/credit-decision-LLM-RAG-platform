'use client';

// =============================================================================
// AUTH HOOK - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// =============================================================================
// INTERFACES
// =============================================================================

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

interface LoginResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
    refreshToken: string;
    expiresAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// =============================================================================
// AUTH CONTEXT
// =============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =============================================================================
// AUTH PROVIDER
// =============================================================================

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Validate token with API
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data: LoginResponse = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error?.message || 'Login failed');
      }

      // Store tokens
      localStorage.setItem('auth_token', data.data.token);
      localStorage.setItem('refresh_token', data.data.refreshToken);

      // Set user
      setUser(data.data.user);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    // Clear tokens
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');

    // Clear user
    setUser(null);

    // Redirect to login
    router.push('/auth/login');
  };

  const refreshToken = async (): Promise<void> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error?.message || 'Token refresh failed');
      }

      // Update tokens
      localStorage.setItem('auth_token', data.data.token);
      localStorage.setItem('refresh_token', data.data.refreshToken);

      // Update user if provided
      if (data.data.user) {
        setUser(data.data.user);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      throw error;
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission) || user.permissions.includes('*');
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role || user.role === 'ADMIN';
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshToken,
    hasPermission,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================================================
// AUTH HOOK
// =============================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// =============================================================================
// AUTH UTILITIES
// =============================================================================

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

export const createAuthenticatedFetch = () => {
  return async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle token expiration
    if (response.status === 401) {
      // Try to refresh token
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });

          const refreshData = await refreshResponse.json();

          if (refreshData.success && refreshData.data) {
            localStorage.setItem('auth_token', refreshData.data.token);
            localStorage.setItem('refresh_token', refreshData.data.refreshToken);

            // Retry original request with new token
            headers['Authorization'] = `Bearer ${refreshData.data.token}`;
            return fetch(url, { ...options, headers });
          }
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
      }

      // If refresh failed, redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/auth/login';
    }

    return response;
  };
};

// =============================================================================
// ROLE AND PERMISSION CONSTANTS
// =============================================================================

export const ROLES = {
  ADMIN: 'ADMIN',
  CREDIT_MANAGER: 'CREDIT_MANAGER',
  CREDIT_ANALYST: 'CREDIT_ANALYST',
  RISK_ANALYST: 'RISK_ANALYST',
  COMPLIANCE_OFFICER: 'COMPLIANCE_OFFICER',
  VIEWER: 'VIEWER',
} as const;

export const PERMISSIONS = {
  // Application permissions
  VIEW_APPLICATIONS: 'applications:view',
  CREATE_APPLICATIONS: 'applications:create',
  UPDATE_APPLICATIONS: 'applications:update',
  DELETE_APPLICATIONS: 'applications:delete',

  // Decision permissions
  VIEW_DECISIONS: 'decisions:view',
  MAKE_DECISIONS: 'decisions:make',
  REVIEW_DECISIONS: 'decisions:review',
  OVERRIDE_DECISIONS: 'decisions:override',

  // Risk assessment permissions
  VIEW_RISK_ASSESSMENTS: 'risk:view',
  CREATE_RISK_ASSESSMENTS: 'risk:create',
  UPDATE_RISK_MODELS: 'risk:update_models',

  // Analytics permissions
  VIEW_ANALYTICS: 'analytics:view',
  EXPORT_DATA: 'analytics:export',

  // User management permissions
  VIEW_USERS: 'users:view',
  CREATE_USERS: 'users:create',
  UPDATE_USERS: 'users:update',
  DELETE_USERS: 'users:delete',

  // System permissions
  VIEW_SYSTEM_SETTINGS: 'system:view_settings',
  UPDATE_SYSTEM_SETTINGS: 'system:update_settings',
  VIEW_AUDIT_LOGS: 'system:view_audit_logs',

  // Knowledge base permissions
  VIEW_KNOWLEDGE_BASE: 'knowledge:view',
  UPDATE_KNOWLEDGE_BASE: 'knowledge:update',
  MANAGE_DOCUMENTS: 'knowledge:manage_documents',
} as const;

// Role-based permission mapping
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ['*'], // All permissions
  [ROLES.CREDIT_MANAGER]: [
    PERMISSIONS.VIEW_APPLICATIONS,
    PERMISSIONS.CREATE_APPLICATIONS,
    PERMISSIONS.UPDATE_APPLICATIONS,
    PERMISSIONS.VIEW_DECISIONS,
    PERMISSIONS.MAKE_DECISIONS,
    PERMISSIONS.REVIEW_DECISIONS,
    PERMISSIONS.OVERRIDE_DECISIONS,
    PERMISSIONS.VIEW_RISK_ASSESSMENTS,
    PERMISSIONS.CREATE_RISK_ASSESSMENTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_KNOWLEDGE_BASE,
    PERMISSIONS.UPDATE_KNOWLEDGE_BASE,
  ],
  [ROLES.CREDIT_ANALYST]: [
    PERMISSIONS.VIEW_APPLICATIONS,
    PERMISSIONS.CREATE_APPLICATIONS,
    PERMISSIONS.UPDATE_APPLICATIONS,
    PERMISSIONS.VIEW_DECISIONS,
    PERMISSIONS.MAKE_DECISIONS,
    PERMISSIONS.VIEW_RISK_ASSESSMENTS,
    PERMISSIONS.CREATE_RISK_ASSESSMENTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_KNOWLEDGE_BASE,
  ],
  [ROLES.RISK_ANALYST]: [
    PERMISSIONS.VIEW_APPLICATIONS,
    PERMISSIONS.VIEW_DECISIONS,
    PERMISSIONS.VIEW_RISK_ASSESSMENTS,
    PERMISSIONS.CREATE_RISK_ASSESSMENTS,
    PERMISSIONS.UPDATE_RISK_MODELS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_KNOWLEDGE_BASE,
  ],
  [ROLES.COMPLIANCE_OFFICER]: [
    PERMISSIONS.VIEW_APPLICATIONS,
    PERMISSIONS.VIEW_DECISIONS,
    PERMISSIONS.VIEW_RISK_ASSESSMENTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.VIEW_KNOWLEDGE_BASE,
    PERMISSIONS.UPDATE_KNOWLEDGE_BASE,
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_APPLICATIONS,
    PERMISSIONS.VIEW_DECISIONS,
    PERMISSIONS.VIEW_RISK_ASSESSMENTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_KNOWLEDGE_BASE,
  ],
};

// =============================================================================
// PROTECTED ROUTE COMPONENT
// =============================================================================

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredRole,
  fallback = <div>Access denied</div>,
}: ProtectedRouteProps) {
  const { user, loading, hasPermission, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return fallback;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return fallback;
  }

  return <>{children}</>;
}
