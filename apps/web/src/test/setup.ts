// =============================================================================
// WEB TEST SETUP - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from './mocks/server';

// =============================================================================
// TESTING LIBRARY CONFIGURATION
// =============================================================================

configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
});

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    isFallback: false,
    isLocaleDomain: true,
    isReady: true,
    isPreview: false,
  }),
}));

// Mock Next.js navigation (App Router)
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// =============================================================================
// GLOBAL MOCKS
// =============================================================================

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

// =============================================================================
// MSW SERVER SETUP
// =============================================================================

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
  });
});

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => {
  server.resetHandlers();
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear localStorage and sessionStorage
  localStorageMock.clear();
  sessionStorageMock.clear();
});

// Clean up after the tests are finished
afterAll(() => {
  server.close();
});

// =============================================================================
// CUSTOM MATCHERS
// =============================================================================

expect.extend({
  toBeInTheDocument: (received) => {
    const pass = received && document.body.contains(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to be in the document`
          : `Expected element to be in the document`,
    };
  },
});

// =============================================================================
// TEST UTILITIES
// =============================================================================

export const testUtils = {
  // Mock user data
  mockUser: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    roles: ['CREDIT_ANALYST'],
    permissions: ['APPLICATION_READ', 'APPLICATION_CREATE'],
  },

  // Mock authentication token
  mockToken: 'mock-jwt-token',

  // Mock API responses
  mockApiResponse: (data: any, success: boolean = true) => ({
    success,
    data: success ? data : undefined,
    error: success ? undefined : data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: 'test-request-id',
    },
  }),

  // Mock credit application
  mockCreditApplication: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    applicationNumber: 'APP-20241201-001',
    status: 'SUBMITTED',
    requestedAmount: 50000,
    currency: 'USD',
    purpose: 'BUSINESS',
    termMonths: 36,
    applicantData: {
      personal: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0123',
      },
      financial: {
        annualIncome: 120000,
        creditScore: 750,
      },
    },
    createdAt: '2024-12-01T10:00:00Z',
    updatedAt: '2024-12-01T10:00:00Z',
  },

  // Mock risk assessment
  mockRiskAssessment: {
    id: '550e8400-e29b-41d4-a716-446655440002',
    applicationId: '550e8400-e29b-41d4-a716-446655440001',
    overallRiskScore: 72.5,
    riskGrade: 'A',
    probabilityOfDefault: 0.025,
    riskFactors: [
      {
        category: 'CREDIT_HISTORY',
        factor: 'High credit score',
        impact: 15.0,
      },
    ],
    createdAt: '2024-12-01T10:05:00Z',
  },

  // Mock credit decision
  mockCreditDecision: {
    id: '550e8400-e29b-41d4-a716-446655440003',
    applicationId: '550e8400-e29b-41d4-a716-446655440001',
    decision: 'APPROVED',
    approvedAmount: 45000,
    interestRate: 0.0675,
    termMonths: 36,
    conditions: ['Provide quarterly financial statements'],
    reasons: ['Strong credit history', 'Stable income'],
    confidence: 0.87,
    createdAt: '2024-12-01T10:10:00Z',
  },

  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Create mock event
  createMockEvent: (type: string, properties: any = {}) => ({
    type,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: { value: '' },
    currentTarget: { value: '' },
    ...properties,
  }),

  // Create mock file
  createMockFile: (name: string, size: number, type: string) => {
    const file = new File([''], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  },

  // Setup authenticated user
  setupAuthenticatedUser: () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'auth_token') return testUtils.mockToken;
      if (key === 'user_data') return JSON.stringify(testUtils.mockUser);
      return null;
    });
  },

  // Setup unauthenticated user
  setupUnauthenticatedUser: () => {
    localStorageMock.getItem.mockReturnValue(null);
  },

  // Mock console methods
  mockConsole: () => {
    const originalConsole = global.console;
    global.console = {
      ...originalConsole,
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };
    return originalConsole;
  },

  // Restore console
  restoreConsole: (originalConsole: Console) => {
    global.console = originalConsole;
  },
};

// Make test utilities available globally
(global as any).testUtils = { ...global.testUtils, ...testUtils };

// =============================================================================
// GLOBAL ERROR HANDLING
// =============================================================================

// Suppress console errors in tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// =============================================================================
// JEST CONFIGURATION
// =============================================================================

// Increase timeout for async tests
jest.setTimeout(10000);

// Mock timers
jest.useFakeTimers({
  advanceTimers: true,
});

// Clean up after each test
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.useFakeTimers({
    advanceTimers: true,
  });
});
