# Requirements Document

## Introduction

This feature introduces `fetchMiddleware` as a first-class capability in CallApi through a dedicated middleware system. It allows wrapping, delaying, modifying, or short-circuiting HTTP requests. Unlike `customFetchImpl` which completely replaces the fetch implementation, middlewares wrap and enhance the existing fetch using a composable higher-order function pattern.

**Key Innovation:** `fetchMiddleware` can be used at multiple levels:

- **Base config level** - Apply middlewares to all requests from a client
- **Plugin level** - Create reusable middleware logic as plugins via the `middlewares` property
- **Per-request level** - Add one-off middlewares for specific requests

All middlewares compose together automatically using a registry-based system, giving developers full control over the request lifecycle with predictable composition order.

**Signature:**

```typescript
fetchMiddleware?: (fetchImpl: FetchFunction) => FetchFunction

// Where FetchFunction is:
type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
```

**Composition Example:**

```typescript
// 1. Base config interceptor - adds logging
const client = createFetchClient({
  baseURL: "https://api.example.com",
  fetchMiddleware: (fetchImpl) => async (input, init) => {
    console.log("Base: Before fetch", input);
    const response = await fetchImpl(input, init);
    console.log("Base: After fetch", response.status);
    return response;
  }
});

// 2. Plugin middleware - adds caching
const cachingPlugin = definePlugin({
  id: "cache",
  middlewares: {
    fetchMiddleware: (fetchImpl) => async (input, init) => {
      const cached = cache.get(input);
      if (cached) return cached;

      const response = await fetchImpl(input, init); // Calls base middleware
      cache.set(input, response.clone());
      return response;
    }
  }
});

// 3. Per-request interceptor - adds auth
const data = await client("/users", {
  plugins: [cachingPlugin],
  fetchMiddleware: (fetchImpl) => async (input, init) => {
    const token = await getToken();
    const newInit = {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${token}` }
    };
    return fetchImpl(input, newInit); // Calls plugin interceptor
  }
});

// Execution flow:
// 1. Per-request interceptor runs → adds auth token
// 2. Plugin interceptor runs → checks cache
// 3. Base interceptor runs → logs request
// 4. Native fetch runs → makes HTTP request
// 5. Base interceptor logs response
// 6. Plugin interceptor caches response
// 7. Per-request interceptor returns final response
```

**Composition Flow Diagram:**

```
┌─────────────────────────────────────────────────────────────┐
│ callApi("/users", { fetchMiddleware: addAuth })            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │ Per-Request Interceptor       │
         │ (adds auth token)             │
         │ calls fetchImpl() ────────┼──┐
         └───────────────────────────────┘  │
                                            │
                         ┌──────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │ Plugin Interceptor            │
         │ (checks cache)                │
         │ calls fetchImpl() ────────┼──┐
         └───────────────────────────────┘  │
                                            │
                         ┌──────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │ Base Config Interceptor       │
         │ (logs request)                │
         │ calls fetchImpl() ────────┼──┐
         └───────────────────────────────┘  │
                                            │
                         ┌──────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │ customFetchImpl (if provided) │
         │ OR                            │
         │ Native fetch()                │
         └───────────────────────────────┘
                         │
                         ▼
                  HTTP Request
                         │
                         ▼
                  HTTP Response
                         │
         ┌───────────────┴───────────────┐
         │ Response flows back up        │
         │ through each interceptor      │
         │ (in reverse order)            │
         └───────────────────────────────┘
```

**Use Cases:**

- Return cached responses without hitting the network
- Mock responses for testing
- Transform requests/responses at the network layer
- Implement offline-first strategies
- Add request/response logging at the fetch level
- Implement custom retry logic
- Add request queuing or throttling
- Modify requests before they're sent
- Add authentication tokens dynamically
- Implement request/response encryption

## Requirements

### Requirement 1: Fetch Middleware as First-Class Feature

**User Story:** As a developer, I want to provide fetch middlewares at any configuration level (base config, plugins, or per-request), so that I can wrap the fetch function and control when and how network requests are made.

#### Acceptance Criteria

1. WHEN `fetchMiddleware` is defined in base config THEN it SHALL be applied to all requests from that client
2. WHEN `fetchMiddleware` is defined in a plugin's `middlewares` property THEN the plugin system SHALL recognize and register this middleware
3. WHEN `fetchMiddleware` is defined in per-request config THEN it SHALL be applied only to that specific request
4. WHEN a `fetchMiddleware` is invoked THEN it SHALL receive the current fetch function as its only parameter
5. WHEN a `fetchMiddleware` is invoked THEN it SHALL return a new function with the same signature as fetch
6. WHEN the returned function is called THEN it SHALL receive the request input (URL/Request) as the first parameter
7. WHEN the returned function is called THEN it SHALL receive the RequestInit options (including all merged options) as the second parameter
8. WHEN a middleware returns a Response without calling the original fetch THEN the system SHALL use that response and skip the network call
9. WHEN a middleware calls the original fetch function THEN the request SHALL proceed to the next middleware or the actual fetch implementation
10. WHEN a middleware modifies the input or init before calling original fetch THEN those modifications SHALL be passed to the next layer

### Requirement 2: Options Access in Fetch Middleware

**User Story:** As a developer, I want to access all configuration options within the fetch middleware, so that I can make decisions based on the full request context.

#### Acceptance Criteria

1. WHEN a plugin defines extra options via `defineExtraOptions` THEN those options SHALL be available in the RequestInit parameter of the returned fetch function
2. WHEN a user provides plugin-specific options in a request THEN those options SHALL be merged and accessible in the RequestInit parameter
3. WHEN plugin options are accessed in the RequestInit parameter THEN they SHALL be properly typed based on the schema defined in `defineExtraOptions`
4. WHEN plugin options are not provided by the user THEN default values from the schema SHALL be available in the RequestInit parameter
5. WHEN the RequestInit parameter is accessed THEN it SHALL include all merged CallApi options (baseURL, timeout, fullURL, etc.) along with any plugin-specific options
6. WHEN an interceptor needs to access options THEN they SHALL be available as properties on the `init` parameter passed to the returned fetch function
7. WHEN an interceptor is defined at base config level THEN it SHALL have access to all base config options
8. WHEN an interceptor is defined at per-request level THEN it SHALL have access to all merged options (base + request)

### Requirement 3: Fetch Middleware Composition Order

**User Story:** As a developer using middlewares at multiple levels, I want a predictable composition order, so that I can ensure middlewares interact correctly.

#### Acceptance Criteria

1. WHEN middlewares are defined at multiple levels THEN they SHALL be added to registry in this order: plugins → base config → per-request, and the last added SHALL wrap the rest, resulting in execution order: per-request → base → plugins (reverse registration order) → customFetchImpl → native fetch
2. WHEN multiple plugins provide `fetchMiddleware` THEN they SHALL execute in reverse registration order (last registered plugin executes first)
3. WHEN a middleware's returned fetch function calls the original fetch THEN it SHALL invoke the next middleware in the chain
4. WHEN the last middleware calls the original fetch THEN it SHALL invoke `customFetchImpl` (if provided) or native fetch
5. WHEN a middleware does not call the original fetch THEN the chain SHALL stop and subsequent middlewares SHALL not be invoked
6. WHEN plugins are registered in order [A, B, C] THEN the execution order SHALL be: C → B → A (reverse registration order)
7. WHEN base config provides both `fetchMiddleware` and `customFetchImpl` THEN the middleware SHALL wrap the customFetchImpl
8. WHEN per-request config provides `fetchMiddleware` THEN it SHALL be the outermost wrapper (executes first)
9. WHEN the composition order is [pluginA, pluginB, base, per-request, customFetchImpl] THEN calling pluginA's fetchImpl SHALL invoke pluginB, which invokes base, which invokes per-request, which invokes customFetchImpl

### Requirement 4: Type Safety for Options

**User Story:** As a developer, I want TypeScript to infer all options throughout the request lifecycle, so that I get proper autocomplete and type checking.

#### Acceptance Criteria

1. WHEN a plugin defines `defineExtraOptions` with a Zod schema THEN TypeScript SHALL infer the option types
2. WHEN a user configures a request with plugin options THEN TypeScript SHALL provide autocomplete for those options
3. WHEN options are accessed in the `fetchMiddleware` returned function THEN TypeScript SHALL provide proper type information
4. WHEN options are accessed in hooks THEN TypeScript SHALL provide proper type information
5. WHEN multiple plugins are used THEN TypeScript SHALL merge their option types correctly
6. WHEN the `init` parameter is accessed in the returned fetch function THEN TypeScript SHALL show all available options (CallApi options + plugin options)
7. WHEN `fetchMiddleware` is defined at base config level THEN TypeScript SHALL infer the correct types for the init parameter
8. WHEN `fetchMiddleware` is defined at per-request level THEN TypeScript SHALL infer the correct types for the init parameter

### Requirement 5: Backward Compatibility

**User Story:** As an existing CallApi user, I want the new fetch interceptor feature to work without breaking my existing code, so that I can upgrade safely.

#### Acceptance Criteria

1. WHEN no `fetchMiddleware` is provided at any level THEN the system SHALL behave exactly as before
2. WHEN the base config provides `customFetchImpl` THEN it SHALL still work as it does currently
3. WHEN both `fetchMiddleware` and `customFetchImpl` are provided THEN interceptors SHALL wrap the customFetchImpl
4. WHEN existing plugins without `fetchMiddleware` are used THEN they SHALL continue to work unchanged
5. WHEN the feature is added THEN all existing tests SHALL pass without modification
6. WHEN `customFetchImpl` is used at the request level THEN it SHALL work alongside interceptors
7. WHEN only `customFetchImpl` is used (no interceptors) THEN behavior SHALL be identical to current implementation

### Requirement 6: Error Handling in Fetch Middleware

**User Story:** As a developer, I want errors in fetch middlewares to be handled gracefully, so that I get clear error messages.

#### Acceptance Criteria

1. WHEN a middleware's returned fetch function throws an error THEN the error SHALL propagate through the normal error handling flow
2. WHEN a middleware's returned fetch function throws an error THEN the `onError` and `onRequestError` hooks SHALL be invoked
3. WHEN a middleware's returned fetch function returns an invalid Response THEN a clear error message SHALL be provided
4. WHEN a plugin's `fetchMiddleware` fails THEN the error SHALL include the plugin name for debugging
5. WHEN multiple middlewares are in the chain and one fails THEN the error SHALL indicate which middleware/plugin failed
6. WHEN a middleware calls the original fetch with invalid parameters THEN a clear error message SHALL be provided
7. WHEN a base config `fetchMiddleware` fails THEN the error SHALL indicate it came from base config
8. WHEN a per-request `fetchMiddleware` fails THEN the error SHALL indicate it came from request config

### Requirement 7: Documentation and Examples

**User Story:** As a developer, I want clear documentation and examples of fetch middlewares, so that I can use them effectively at any configuration level.

#### Acceptance Criteria

1. WHEN the feature is released THEN documentation SHALL include a guide on implementing `fetchMiddleware` at all levels (base config, plugins via `middlewares` property, per-request)
2. WHEN the feature is released THEN at least three example plugins SHALL be provided (caching, mocking, offline)
3. WHEN the feature is released THEN examples SHALL show standalone usage (without plugins)
4. WHEN the feature is released THEN TypeScript types SHALL have JSDoc comments explaining the API
5. WHEN the feature is released THEN documentation SHALL clearly explain the difference between `customFetchImpl` and `fetchMiddleware`
6. WHEN the feature is released THEN best practices SHALL be documented for middleware composition
7. WHEN the feature is released THEN examples SHALL show how to properly call the original fetch and when to short-circuit
8. WHEN the feature is released THEN examples SHALL demonstrate the higher-order function pattern clearly
9. WHEN the feature is released THEN documentation SHALL explain the composition order with diagrams showing the registry-based system
10. WHEN the feature is released THEN examples SHALL show common patterns (caching, retry, logging, auth)
11. WHEN the feature is released THEN documentation SHALL explain both static and dynamic middleware definitions in plugins
