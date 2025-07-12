// Global test setup
process.env.NODE_ENV = 'test';

// Mock logger to avoid console spam during tests
jest.mock('../src/cli/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  success: jest.fn()
}));

// Mock tree-sitter to avoid native binding issues
jest.mock('tree-sitter', () => {
  return jest.fn().mockImplementation(() => ({
    setLanguage: jest.fn(),
    parse: jest.fn().mockReturnValue({
      rootNode: {
        descendantsOfType: jest.fn().mockReturnValue([]),
        toString: jest.fn().mockReturnValue('mock node')
      }
    })
  }));
});

jest.mock('tree-sitter-javascript', () => jest.fn());
jest.mock('tree-sitter-python', () => jest.fn());

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global beforeEach to clear all mocks
beforeEach(() => {
  jest.clearAllMocks();
});

// Setup test environment variables
process.env.GITCONTEXTOR_TEST_MODE = 'true';
process.env.GITCONTEXTOR_API_KEY = 'test-api-key';
process.env.GITCONTEXTOR_PORT = '3001';
process.env.GITCONTEXTOR_QDRANT_PORT = '6334';
