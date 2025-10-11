# Implementation Plan

- [ ] 1. Update plugin initialization to compose interceptors
  - Modify `executePluginSetupFn` in `packages/callapi/src/plugins.ts`
  - When a plugin returns `fetchInterceptor` in options, check if there's already one in `resolvedOptions`
  - If both exist, compose them: `(baseFetch) => newInterceptor(previousInterceptor(baseFetch))`
  - This automatically chains interceptors as plugins are processed
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [ ] 2. Update getFetchImpl to handle interceptors
  - Modify `getFetchImpl` in `packages/callapi/src/utils/common.ts`
  - Add optional `fetchInterceptor` parameter
  - Apply interceptor to the fetch implementation if provided
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 3. Update dedupe to pass interceptor to getFetchImpl
  - Update `handleRequestDeferStrategy` in `packages/callapi/src/dedupe.ts`
  - Pass `localOptions.fetchInterceptor` as second parameter to `getFetchImpl`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 4. Add TypeScript types and exports
  - Export `FetchFunction` and `FetchInterceptor` types from main index
  - Ensure proper type inference for plugin options in interceptors
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [ ] 5. Write unit tests for interceptor composition
  - Create `packages/callapi/tests/fetch-interceptor.test.ts`
  - Test composition order (per-request → plugins → base → customFetchImpl → fetch)
  - Test short-circuiting (returning without calling originalFetch)
  - Test plugin interceptors with closure state
  - Test error handling during composition
  - Test backward compatibility (no interceptors, only customFetchImpl)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [ ] 6. Create example caching plugin
  - Create example in `packages/callapi-plugins/src/caching-plugin.ts`
  - Implement cache-first and no-cache policies
  - Add cache lifetime configuration
  - Demonstrate closure over cache Map
  - Add to plugin exports
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.1, 7.2, 7.9, 7.10_

- [ ] 7. Update documentation
  - Add fetchInterceptor section to plugins documentation
  - Add usage examples for all three levels (base, per-request, plugins)
  - Add composition flow diagram
  - Document how interceptors compose automatically
  - Add best practices section
  - Document difference between fetchInterceptor and customFetchImpl
  - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.9, 7.10_

- [ ] 8. Run integration tests
  - Test caching plugin with real requests
  - Test multiple plugins with interceptors working together
  - Test per-request interceptors overriding plugin behavior
  - Test with existing features (retry, dedupe, hooks)
  - Verify all existing tests still pass
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
