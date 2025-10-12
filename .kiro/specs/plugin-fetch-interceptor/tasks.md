# Implementation Plan

- [x] 1. Create dedicated middleware system
  - Create `packages/callapi/src/middlewares.ts` file
  - Define `FetchImpl` type: `(input: string | Request | URL, init?: RequestInit) => Promise<Response>`
  - Define `Middlewares` interface with `fetchMiddleware` property
  - Implement `getMiddlewareRegistriesAndKeys` function for registry management
  - Implement `composeAllMiddlewares` function for automatic composition
  - Add JSDoc documentation explaining the middleware system
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [x] 2. Add plugin middleware support
  - Update `CallApiPlugin` interface in `packages/callapi/src/plugins.ts`
  - Add `middlewares` property that accepts `Middlewares` or function returning `Middlewares`
  - Define `PluginMiddlewares` type alias
  - Allow plugins to define middlewares statically or dynamically via function
  - Ensure middleware functions can access plugin context and options
  - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 3. Implement unified hook and middleware management
  - Create `setupHooksAndMiddlewares` function in `packages/callapi/src/plugins.ts`
  - Implement `addMainMiddlewares` to register base and per-request middlewares
  - Implement `addPluginMiddlewares` to register plugin middlewares
  - Implement `getResolvedMiddlewares` to compose all registered middlewares
  - Use registry pattern similar to hooks for consistency
  - Ensure proper composition order: plugins → base config → per-request
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 4. Update plugin initialization flow
  - Modify `initializePlugins` in `packages/callapi/src/plugins.ts`
  - Call plugin.middlewares (if function) or use static middlewares
  - Add plugin middlewares to registry via `addPluginMiddlewares`
  - Call `addMainMiddlewares` after all plugins are processed
  - Call `getResolvedMiddlewares` to get composed middleware
  - Return `resolvedMiddlewares` from `initializePlugins`
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Integrate middlewares with createFetchClient
  - Update `createFetchClient` in `packages/callapi/src/createFetchClient.ts`
  - Destructure `resolvedMiddlewares` from `initializePlugins` return value
  - Merge `resolvedMiddlewares` into options object
  - Pass `options.fetchMiddleware` to `getFetchImpl`
  - Ensure `getFetchImpl` properly wraps customFetchImpl with middleware
  - Pass resolved `fetchApi` to `handleRequestDeferStrategy`
  - _Requirements: 1.1, 1.9, 3.1, 3.7, 5.1, 5.2, 5.3_

- [x] 6. Simplify hook execution
  - Rename `executeHooksInTryBlock` to `executeHooks` in `packages/callapi/src/hooks.ts`
  - Update all call sites in `createFetchClient.ts` to use `executeHooks`
  - Keep `executeHooksInCatchBlock` for error handling scenarios
  - Ensure consistent hook execution throughout the codebase
  - _Requirements: 5.1, 5.5_

- [x] 7. Write unit tests for middleware composition
  - Create `packages/callapi/tests/fetch-middleware.test.ts`
  - Test composition order (plugins → base → per-request → customFetchImpl → fetch)
  - Test short-circuiting (returning without calling fetchImpl)
  - Test plugin middlewares with closure state
  - Test static vs dynamic middleware definitions
  - Test error handling during composition
  - Test backward compatibility (no middlewares, only customFetchImpl)
  - Test multiple plugins with middlewares working together
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [ ] 6. Update documentation
  - Add fetchMiddleware section to plugins documentation
  - Add usage examples for all three levels (base, per-request, plugins)
  - Add composition flow diagram
  - Document how interceptors compose automatically
  - Document difference between fetchMiddleware and customFetchImpl
  - Show that plugins return fetchMiddleware as top-level property
  - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.9, 7.10_

- [x] 7. Run integration tests
  - Test caching plugin with real requests
  - Test multiple plugins with interceptors working together
  - Test per-request interceptors overriding plugin behavior
  - Test with existing features (retry, dedupe, hooks)
  - Verify all existing tests still pass
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
