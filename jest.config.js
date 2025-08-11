// =============================================================================
// JEST CONFIGURATION - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Projects configuration for monorepo
  projects: [
    // API tests
    {
      displayName: 'API',
      testMatch: ['<rootDir>/apps/api/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/apps/api/src/test/setup.ts'],
      moduleNameMapping: pathsToModuleNameMapper(compilerOptions.paths, {
        prefix: '<rootDir>/',
      }),
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: '<rootDir>/apps/api/tsconfig.json',
        }],
      },
      collectCoverageFrom: [
        'apps/api/src/**/*.{ts,js}',
        '!apps/api/src/**/*.d.ts',
        '!apps/api/src/test/**',
        '!apps/api/src/**/*.test.{ts,js}',
        '!apps/api/src/**/*.spec.{ts,js}',
      ],
      coverageDirectory: '<rootDir>/coverage/api',
      coverageReporters: ['text', 'lcov', 'html'],
      coverageThreshold: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },

    // Web tests
    {
      displayName: 'Web',
      testMatch: ['<rootDir>/apps/web/**/*.test.{js,ts,jsx,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/apps/web/src/test/setup.ts'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/apps/web/src/$1',
        ...pathsToModuleNameMapper(compilerOptions.paths, {
          prefix: '<rootDir>/',
        }),
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: '<rootDir>/apps/web/tsconfig.json',
        }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      collectCoverageFrom: [
        'apps/web/src/**/*.{ts,tsx,js,jsx}',
        '!apps/web/src/**/*.d.ts',
        '!apps/web/src/test/**',
        '!apps/web/src/**/*.test.{ts,tsx,js,jsx}',
        '!apps/web/src/**/*.spec.{ts,tsx,js,jsx}',
        '!apps/web/src/**/*.stories.{ts,tsx,js,jsx}',
      ],
      coverageDirectory: '<rootDir>/coverage/web',
      coverageReporters: ['text', 'lcov', 'html'],
      coverageThreshold: {
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60,
        },
      },
    },

    // Packages tests
    {
      displayName: 'Packages',
      testMatch: ['<rootDir>/packages/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      moduleNameMapping: pathsToModuleNameMapper(compilerOptions.paths, {
        prefix: '<rootDir>/',
      }),
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: '<rootDir>/tsconfig.json',
        }],
      },
      collectCoverageFrom: [
        'packages/*/src/**/*.{ts,js}',
        '!packages/*/src/**/*.d.ts',
        '!packages/*/src/**/*.test.{ts,js}',
        '!packages/*/src/**/*.spec.{ts,js}',
      ],
      coverageDirectory: '<rootDir>/coverage/packages',
      coverageReporters: ['text', 'lcov', 'html'],
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  ],

  // Global configuration
  preset: 'ts-jest',
  
  // Module resolution
  moduleNameMapping: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },

  // File extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Test patterns
  testMatch: [
    '**/__tests__/**/*.(ts|js)',
    '**/*.(test|spec).(ts|js)',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/',
  ],

  // Module path ignore patterns
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/',
  ],

  // Clear mocks between tests
  clearMocks: true,

  // Collect coverage from
  collectCoverageFrom: [
    'apps/**/*.{ts,tsx,js,jsx}',
    'packages/**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/*.test.{ts,tsx,js,jsx}',
    '!**/*.spec.{ts,tsx,js,jsx}',
    '!**/*.stories.{ts,tsx,js,jsx}',
  ],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
  ],

  // Global coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Test timeout
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Error on deprecated features
  errorOnDeprecated: true,

  // Notify mode
  notify: false,

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],

  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      isolatedModules: true,
    },
  },

  // Max workers
  maxWorkers: '50%',

  // Cache directory
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/coverage/html-report',
        filename: 'report.html',
        expand: true,
      },
    ],
  ],

  // Snapshot serializers
  snapshotSerializers: [],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@testing-library))',
  ],

  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Resolver
  resolver: undefined,

  // Roots
  roots: ['<rootDir>/apps', '<rootDir>/packages'],

  // Test results processor
  testResultsProcessor: undefined,

  // Unmocked module path patterns
  unmockedModulePathPatterns: undefined,

  // Watch path ignore patterns
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/',
  ],
};
