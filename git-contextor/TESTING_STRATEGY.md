# Git Contextor Testing Strategy

## Overview
This document outlines the comprehensive testing strategy for Git Contextor, designed to achieve close to 100% test coverage with robust end-to-end testing.

## Test Structure

### 1. Unit Tests (`test/unit/`)
- **Purpose**: Test individual components in isolation
- **Coverage**: Core classes, utility functions, CLI commands
- **Key Features**:
  - Mock external dependencies (Qdrant, file system, etc.)
  - Test error conditions and edge cases
  - Fast execution (< 1 second per test)

### 2. Integration Tests (`test/integration/`)
- **Purpose**: Test component interactions and API endpoints
- **Coverage**: API routes, service integration, data flow
- **Key Features**:
  - Real HTTP requests to test server
  - Mock external services (Qdrant, LLM APIs)
  - Database state verification

### 3. End-to-End Tests (`test/integration/e2e.test.js`)
- **Purpose**: Test complete user workflows
- **Coverage**: CLI commands, full application lifecycle
- **Key Features**:
  - Real git repositories
  - Actual file operations
  - Complete application startup/shutdown

## Test Configuration

### Jest Configuration (`jest.config.json`)
```json
{
  "testEnvironment": "node",
  "testTimeout": 30000,
  "collectCoverage": true,
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

### Test Scripts (`package.json`)
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest test/unit",
    "test:integration": "jest test/integration",
    "test:e2e": "jest test/integration/e2e.test.js",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

## Test Implementation Status

### ✅ Completed Tests
- **FileWatcher**: File system monitoring and event handling
- **Git Utils**: Git repository operations and file listing
- **VectorStore**: Vector database operations (partial)
- **ConfigManager**: Configuration management (partial)
- **API Integration**: HTTP endpoint testing (partial)

### ⚠️ Partially Implemented
- **VectorStore**: Missing some method implementations
- **ConfigManager**: Missing validation logic
- **ContextOptimizer**: Missing core functionality
- **Indexer**: Tree-sitter dependency issues
- **CLI Commands**: Execution timeout issues

### ❌ Missing Tests
- **SharingService**: Share creation and management
- **ServiceManager**: Service lifecycle management
- **MemoryVectorStore**: In-memory vector operations
- **Utility Functions**: Chunking, embeddings, vision processing
- **UI Components**: Frontend JavaScript testing

## Current Issues and Solutions

### 1. Tree-sitter Dependency Issues
**Problem**: Tree-sitter native bindings not loading in Jest environment
**Solution**: 
- Mock tree-sitter in test environment
- Use simplified chunking strategies for tests
- Consider using `--no-cache` flag for Jest

### 2. CLI Test Timeouts
**Problem**: CLI commands taking too long to execute
**Solution**:
- Increase Jest timeout to 30 seconds
- Use background processes for long-running operations
- Mock external API calls

### 3. Missing API Method Implementations
**Problem**: Some classes missing expected methods
**Solution**:
- Review actual class implementations
- Update test expectations to match reality
- Add missing method implementations

## Test Coverage Goals

### Target Coverage by Component:

| Component | Target Coverage | Current Status |
|-----------|----------------|----------------|
| Core Classes | 90%+ | ~40% |
| Utility Functions | 85%+ | ~15% |
| API Routes | 95%+ | ~30% |
| CLI Commands | 80%+ | ~20% |
| Configuration | 90%+ | ~60% |

### Priority Order:
1. **Core Business Logic** (VectorStore, Indexer, ContextOptimizer)
2. **API Endpoints** (All routes with authentication)
3. **CLI Commands** (All command-line operations)
4. **Utility Functions** (Chunking, embeddings, git operations)
5. **Error Handling** (All error scenarios)

## Best Practices

### 1. Test Structure
```javascript
describe('ComponentName', () => {
  let component;
  let mockDependencies;

  beforeEach(() => {
    // Setup fresh mocks for each test
    mockDependencies = createMockDependencies();
    component = new ComponentName(mockDependencies);
  });

  describe('methodName', () => {
    it('should handle normal case', () => {
      // Test implementation
    });

    it('should handle edge cases', () => {
      // Test edge cases
    });

    it('should handle error conditions', () => {
      // Test error scenarios
    });
  });
});
```

### 2. Mock Strategy
- **External Services**: Always mock (Qdrant, LLM APIs, file system)
- **Internal Dependencies**: Mock at component boundaries
- **Data Persistence**: Use in-memory alternatives for tests
- **Time-dependent Operations**: Mock timers and dates

### 3. Test Data Management
- **Fixtures**: Store test data in `test/fixtures/`
- **Factories**: Create test data programmatically
- **Cleanup**: Always clean up temporary files/directories
- **Isolation**: Each test should be independent

## Running Tests

### Development
```bash
# Run all tests with watch mode
npm run test:watch

# Run specific test suite
npm run test:unit

# Run with coverage
npm run test:coverage
```

### CI/CD
```bash
# Run all tests in CI mode
npm run test:ci

# Run only integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

## Troubleshooting

### Common Issues:
1. **Test Timeouts**: Increase Jest timeout or optimize slow operations
2. **Mock Failures**: Ensure mocks are reset between tests
3. **File System Issues**: Use proper cleanup in `afterEach`
4. **Dependency Issues**: Check for missing or conflicting packages

### Debug Commands:
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- test/unit/specific.test.js

# Run tests with debugging
node --inspect-brk node_modules/.bin/jest test/unit/specific.test.js
```

## Next Steps

1. **Fix Tree-sitter Issues**: Implement proper mocking strategy
2. **Complete Missing Tests**: Add tests for all untested components
3. **Improve Coverage**: Target 90%+ overall test coverage
4. **Optimize Performance**: Reduce test execution time
5. **Add E2E Scenarios**: Cover all major user workflows

## Metrics

Current test metrics:
- **Total Test Files**: 8
- **Passing Tests**: 13
- **Failing Tests**: 44
- **Coverage**: ~5.6%
- **Target Coverage**: 90%+

With proper implementation, we should achieve:
- **200+ Unit Tests**
- **50+ Integration Tests**
- **20+ E2E Test Scenarios**
- **90%+ Code Coverage**
- **< 2 minute total test execution time**
