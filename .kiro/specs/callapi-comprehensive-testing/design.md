# Design Document

## Overview

This design outlines a comprehensive testing strategy for the CALLAPI package, a sophisticated fetch wrapper with advanced features including request deduplication, retries, interceptors, validation, plugins, streaming, authentication, and URL processing. The testing approach will ensure reliability, maintainability, and correctness across all components and edge cases.

## Architecture

### Test Structure Organization

```
packages/callapi/tests/
├── setup.ts                      # Test setup and global mocks
├── helpers.ts                    # Simple test helper functions
├── fixtures.ts                   # Test data and mock responses
├── auth.test.ts                  # Authentication tests
├── client.test.ts                # Main createFetchClient and callApi tests
├── deduplication.test.ts         # Request deduplication tests
├── errors.test.ts                # Error handling and error classes
├── hooks.test.ts                 # Hook system tests
├── plugins.test.ts               # Plugin system tests
├── retry.test.ts                 # Retry logic tests
├── streaming.test.ts             # Upload/download streaming tests
├── url-handling.test.ts          # URL processing and parameters
├── validation.test.ts            # Schema validation tests
├── result-processing.test.ts     # Response processing and result modes
└── utils.test.ts                 # Utility functions tests
```

### Testing Framework Configuration

- **Primary Framework**: Vitest (already configured)
- **Mocking Strategy**: Simple fetch mocks using vi.fn() - no external dependencies
- **Assertion Library**: Vitest's built-in assertions with simple custom helpers
- **Coverage Target**: 90%+ across all source files
- **Test Organization**: One test file per major feature, clear describe blocks

## Components and Interfaces

### Core Testing Components

#### 1. Simple Mock Infrastructure

**Basic Fetch Mock**
```typescript
// Simple mock fetch function
const mockFetch = vi.fn();

// Helper to create mock responses
function createMockResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Helper to mock network errors
function mockNetworkError() {
  mockFetch.mockRejectedValue(new Error('Network error'));
}
```

#### 2. Simple Test Helpers

**Basic Assertion Helpers**
```typescript
// Simple helper functions for common assertions
function expectHTTPError(error: unknown, expectedStatus?: number) {
  expect(error).toBeInstanceOf(HTTPError);
  if (expectedStatus) {
    expect((error as HTTPError).response.status).toBe(expectedStatus);
  }
}

function expectValidationError(error: unknown) {
  expect(error).toBeInstanceOf(ValidationError);
}
```

**Simple Test Data**
```typescript
// Basic test fixtures
const mockUser = { id: 1, name: 'John', email: 'john@example.com' };
const mockError = { code: 'ERROR', message: 'Something went wrong' };

// Simple plugin for testing
const testPlugin = {
  id: 'test-plugin',
  name: 'Test Plugin',
  hooks: { onRequest: vi.fn() }
};
```

### Testing Strategies by Component

#### 1. Core Functionality Tests

**createFetchClient & callApi**
- Test client creation with various configurations
- Verify parameter passing and option merging
- Test base configuration inheritance
- Validate function composition and chaining

**HTTP Method Handling**
- Test all HTTP methods (GET, POST, PUT, DELETE, PATCH, etc.)
- Verify method extraction from URL prefixes (@get/, @post/, etc.)
- Test method override scenarios
- Validate method-specific behaviors

#### 2. Authentication System Tests

**Auth Types Testing**
- Bearer token authentication
- Basic authentication (username/password)
- Token authentication
- Custom authentication schemes
- Function-based auth value resolution
- Null auth handling (removal)

**Auth Integration**
- Header generation and formatting
- Async auth value resolution
- Auth inheritance and override
- Error handling for invalid auth

#### 3. URL Processing Tests

**Parameter Substitution**
- Object-style parameters (:param and {param} patterns)
- Array-style positional parameters
- Mixed parameter scenarios
- Edge cases (missing params, extra params)

**Query String Handling**
- Query parameter serialization
- URL encoding validation
- Query merging with existing URLs
- Special character handling

**Base URL Processing**
- Relative vs absolute URL handling
- Base URL merging logic
- URL normalization
- Method prefix processing

#### 4. Request Deduplication Tests

**Deduplication Strategies**
- "cancel" strategy behavior
- "defer" strategy behavior
- "none" strategy (no deduplication)
- Dynamic strategy selection

**Cache Management**
- Local vs global cache scopes
- Cache key generation (default and custom)
- Cache cleanup and memory management
- Concurrent request handling

#### 5. Retry Logic Tests

**Retry Strategies**
- Linear backoff timing
- Exponential backoff with max delay
- Custom delay functions
- Retry condition evaluation

**Retry Configuration**
- Method-based retry filtering
- Status code-based retry triggers
- Custom retry conditions
- Maximum attempt limits

#### 6. Hook System Tests

**Hook Execution**
- Parallel vs sequential execution modes
- Hook registration order (plugins vs main)
- Hook composition and chaining
- Error handling within hooks

**Hook Types**
- Request lifecycle hooks (onRequest, onResponse, etc.)
- Error handling hooks (onError, onRequestError, etc.)
- Streaming hooks (onRequestStream, onResponseStream)
- Retry hooks (onRetry)

#### 7. Plugin System Tests

**Plugin Lifecycle**
- Plugin initialization and setup
- Hook registration and execution
- Option merging and inheritance
- Plugin composition

**Plugin Features**
- Custom option definition
- Schema contribution
- Setup function execution
- Plugin-specific error handling

#### 8. Validation System Tests

**Schema Validation**
- Request validation (body, headers, params, query)
- Response validation (data, errorData)
- Custom validator functions
- Async validation support

**Schema Configuration**
- Strict mode enforcement
- Schema merging and inheritance
- Runtime vs compile-time validation
- Validation error formatting

#### 9. Streaming Tests

**Upload Streaming**
- Progress event generation
- Chunk processing
- Size calculation (with/without Content-Length)
- Stream error handling

**Download Streaming**
- Response streaming
- Progress tracking
- Stream interruption handling
- Memory management

#### 10. Error Handling Tests

**Error Types**
- HTTPError creation and properties
- ValidationError formatting
- Network error handling
- Timeout error scenarios

**Error Processing**
- Result mode behavior with errors
- throwOnError configuration
- Error context creation
- Error hook execution

## Data Models

### Test Data Structures

```typescript
// Mock Response Data
interface MockUser {
  id: number;
  name: string;
  email: string;
  active: boolean;
}

interface MockError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Test Configuration
interface TestConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  mockDelay: number;
}

// Request Tracking
interface RequestRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  timestamp: number;
}

// Plugin Test Data
interface MockPluginConfig {
  id: string;
  name: string;
  setupCalled: boolean;
  hooksCalled: string[];
  options?: Record<string, unknown>;
}
```

### Validation Schemas for Testing

```typescript
// Using Zod for test schemas
const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  active: z.boolean()
});

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional()
});

const requestSchema = z.object({
  body: z.object({
    name: z.string(),
    email: z.string()
  }),
  headers: z.object({
    'Content-Type': z.literal('application/json'),
    'Authorization': z.string().startsWith('Bearer ')
  })
});
```

## Error Handling

### Error Testing Strategy

**Error Scenario Coverage**
1. Network errors (connection failures, DNS issues)
2. HTTP errors (4xx, 5xx status codes)
3. Timeout errors (request and response timeouts)
4. Validation errors (schema validation failures)
5. Plugin errors (setup and hook execution failures)
6. Streaming errors (upload/download interruptions)

**Error Assertion Patterns**
```typescript
// HTTP Error Testing
expect(error).toBeHTTPError(404);
expect(error.errorData).toEqual(expectedErrorData);
expect(error.response.status).toBe(404);

// Validation Error Testing
expect(error).toBeValidationError();
expect(error.errorData).toContainValidationIssue('email', 'Invalid email format');

// Network Error Testing
expect(error.name).toBe('TypeError');
expect(error.message).toContain('Failed to fetch');
```

### Error Recovery Testing

**Retry Scenarios**
- Successful retry after transient failure
- Exhausted retry attempts
- Retry with different strategies
- Conditional retry based on error type

**Fallback Behaviors**
- Default error messages
- Graceful degradation
- Error boundary testing
- Resource cleanup verification

## Testing Strategy

### Test Categories

#### 1. Feature Tests (80% of test coverage)

**Core Functionality**
- Basic request/response handling
- HTTP methods and URL processing
- Authentication and headers
- Error handling and retry logic

**Advanced Features**
- Request deduplication
- Streaming and progress tracking
- Plugin system and hooks
- Schema validation

#### 2. Integration Tests (15% of test coverage)

**Feature Combinations**
- Plugins with hooks
- Validation with error handling
- Retry with deduplication
- Streaming with authentication

#### 3. Edge Cases (5% of test coverage)

**Boundary Conditions**
- Empty responses
- Large payloads
- Network timeouts
- Invalid configurations

### Test Execution Strategy

**Simple Test Organization**
- Each test file focuses on one major feature
- Clear describe blocks for different scenarios
- beforeEach/afterEach for setup and cleanup
- Descriptive test names that explain what's being tested

**Test Data Management**
- Simple mock data objects
- Reset mocks between tests
- Clear test scenarios with obvious inputs/outputs
- Minimal test setup complexity

### Coverage Requirements

**Code Coverage Targets**
- Overall coverage: 90%+
- Branch coverage: 85%+
- Function coverage: 95%+
- Line coverage: 90%+

**Critical Path Coverage**
- All error handling paths
- All configuration combinations
- All hook execution paths
- All validation scenarios

### Continuous Integration

**Automated Testing**
- Run on every commit
- Multiple Node.js versions
- Different environment configurations
- Performance regression detection

**Quality Gates**
- Coverage thresholds
- Test execution time limits
- Memory usage constraints
- No failing tests policy