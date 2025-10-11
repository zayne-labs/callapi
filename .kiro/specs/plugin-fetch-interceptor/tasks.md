# Implementation Plan

- [ ] 1. Add FetchInterceptor type and update SharedExtraOptions
  - In `packages/callapi/src/types/common.ts`, add `FetchInterceptor` type using existing `FetchImpl`
  - Define as: `type FetchInterceptor = (originalFetch: FetchImpl) => FetchImpl`
  - Add `fetchInterceptor?: FetchInterceptor` to `SharedExtraOptions` if not already present
  - Update `PluginInitResult` type in `packages/callapi/src/plugins.ts`
  - Add `fetchInterceptor?: FetchInterceptor` as a top-level property in `PluginInitResult`
  - This allows plugins to return interceptors directly like `return { fetchInterceptor: ... }`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [ ] 2. Update plugin initialization to compose interceptors incrementally
  - Modify `initializePlugins` in `packages/callapi/src/plugins.ts`
  - Create `resolvedFetchInterceptor` variable (starts as undefined)
  - In `executePluginSetupFn`, check for `initResult.fetchInterceptor` (top-level property)
  - Compose plugin interceptor with existing one: `prev ? (baseFetch) => initResult.fetchInterceptor!(prev(baseFetch)) : initResult.fetchInterceptor`
  - After all plugins, compose `baseConfig.fetchInterceptor` if present
  - Then compose `config.fetchInterceptor` (per-request) if present
  - This ensures correct order: per-request → plugins → base → customFetchImpl → fetch
  - Add final composed interceptor to `resolvedOptions.fetchInterceptor`
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [ ] 3. Export types from main index
  - Export `FetchImpl` and `FetchInterceptor` types from main package index
  - Ensure proper type inference for plugin options in interceptors
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [ ]* 4. Write unit tests for interceptor composition
  - Create `packages/callapi/tests/fetch-interceptor.test.ts`
  - Test composition order (per-request → plugins → base → customFetchImpl → fetch)
  - Test short-circuiting (returning without calling originalFetch)
  - Test plugin interceptors with closure state
  - Test error handling during composition
  - Test backward compatibility (no interceptors, only customFetchImpl)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [ ] 5. Create example caching plugin
  - Create example in `packages/callapi-plugins/src/caching-plugin.ts`
  - Implement cache-first and no-cache policies
  - Add cache lifetime configuration
  - Demonstrate closure over cache Map
  - Return fetchInterceptor as top-level property from setup
  - Add to plugin exports
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.1, 7.2, 7.9, 7.10_

- [ ] 6. Update documentation
  - Add fetchInterceptor section to plugins documentation
  - Add usage examples for all three levels (base, per-request, plugins)
  - Add composition flow diagram
  - Document how interceptors compose automatically
  - Add best practices section
  - Document difference between fetchInterceptor and customFetchImpl
  - Show that plugins return fetchInterceptor as top-level property
  - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.9, 7.10_

- [ ]* 7. Run integration tests
  - Test caching plugin with real requests
  - Test multiple plugins with interceptors working together
  - Test per-request interceptors overriding plugin behavior
  - Test with existing features (retry, dedupe, hooks)
  - Verify all existing tests still pass
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
