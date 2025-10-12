# Implementation Plan

- [x] 1. Add FetchMiddleware type and update SharedExtraOptions
  - In `packages/callapi/src/types/common.ts`, add `FetchMiddleware` type using existing `FetchImpl`
  - Define as: `type FetchMiddleware = (originalFetch: FetchImpl) => FetchImpl`
  - Add `fetchMiddleware?: FetchMiddleware` to `SharedExtraOptions` if not already present
  - Update `PluginInitResult` type in `packages/callapi/src/plugins.ts`
  - Add `fetchMiddleware?: FetchMiddleware` as a top-level property in `PluginInitResult`
  - This allows plugins to return middleware directly like `return { fetchMiddleware: ... }`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [x] 2. Update plugin initialization to compose middleware incrementally
  - Modify `initializePlugins` in `packages/callapi/src/plugins.ts`
  - Create `resolvedFetchMiddleware` variable (starts as undefined)
  - In `executePluginSetupFn`, check for `initResult.fetchMiddleware` (top-level property)
  - Compose plugin middleware with existing one: `prev ? (baseFetch) => initResult.fetchMiddleware!(prev(baseFetch)) : initResult.fetchMiddleware`
  - After all plugins, compose `baseConfig.fetchMiddleware` if present
  - Then compose `config.fetchMiddleware` (per-request) if present
  - This ensures correct order: per-request → plugins → base → customFetchImpl → fetch
  - Add final composed middleware to `resolvedOptions.fetchMiddleware`
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 4. Write unit tests for middleware composition
  - Create `packages/callapi/tests/fetch-middleware.test.ts`
  - Test composition order (per-request → plugins → base → customFetchImpl → fetch)
  - Test short-circuiting (returning without calling originalFetch)
  - Test plugin interceptors with closure state
  - Test error handling during composition
  - Test backward compatibility (no interceptors, only customFetchImpl)
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
