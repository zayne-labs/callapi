# Implementation Plan

- [ ] 1. Add fetchInterceptor to PluginInitResult type
  - Update `PluginInitResult` type in `packages/callapi/src/plugins.ts`
  - Add `fetchInterceptor?: FetchInterceptor` as a top-level property
  - This allows plugins to return interceptors directly like `return { fetchInterceptor: ... }`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [ ] 2. Add pipe utility function
  - Add `pipe` function to `packages/callapi/src/utils/common.ts`
  - Simple reduce-based implementation that pipes a value through functions
  - Generic type signature for flexibility
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [ ] 3. Update plugin initialization to collect and compose interceptors
  - Modify `initializePlugins` in `packages/callapi/src/plugins.ts`
  - Create `interceptorRegistry` Set (same pattern as `hookRegistries`)
  - Add `addBaseInterceptor` function to collect base config interceptor
  - Add `addInstanceInterceptor` function to collect per-request interceptor
  - Collect plugin interceptors from `initResult.fetchInterceptor` (top-level property)
  - Compose all interceptors using `pipe` utility
  - Store in `resolvedFetchInterceptor` variable and add to `resolvedOptions`
  - Respect `hookRegistrationOrder` for interceptor registration order
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [ ] 4. Update getFetchImpl to handle interceptors
  - Modify `getFetchImpl` in `packages/callapi/src/utils/common.ts`
  - Add optional `fetchInterceptor` parameter
  - Apply interceptor to the fetch implementation if provided
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 5. Update dedupe to pass interceptor to getFetchImpl
  - Update `handleRequestDeferStrategy` in `packages/callapi/src/dedupe.ts`
  - Pass `localOptions.fetchInterceptor` as second parameter to `getFetchImpl`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 6. Add TypeScript types and exports
  - Export `FetchFunction` and `FetchInterceptor` types from main index
  - Add JSDoc comments to `pipe` function
  - Ensure proper type inference for plugin options in interceptors
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [ ] 7. Write unit tests for interceptor composition
  - Create `packages/callapi/tests/fetch-interceptor.test.ts`
  - Test composition order (per-request → plugins → base → customFetchImpl → fetch)
  - Test short-circuiting (returning without calling originalFetch)
  - Test plugin interceptors with closure state
  - Test error handling during composition
  - Test backward compatibility (no interceptors, only customFetchImpl)
  - Test hookRegistrationOrder affects interceptor order
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [ ] 8. Create example caching plugin
  - Create example in `packages/callapi-plugins/src/caching-plugin.ts`
  - Implement cache-first and no-cache policies
  - Add cache lifetime configuration
  - Demonstrate closure over cache Map
  - Return fetchInterceptor as top-level property from setup
  - Add to plugin exports
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.1, 7.2, 7.9, 7.10_

- [ ] 9. Update documentation
  - Add fetchInterceptor section to plugins documentation
  - Add usage examples for all three levels (base, per-request, plugins)
  - Add composition flow diagram
  - Document how interceptors compose automatically
  - Add best practices section
  - Document difference between fetchInterceptor and customFetchImpl
  - Show that plugins return fetchInterceptor as top-level property
  - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.9, 7.10_

- [ ] 10. Run integration tests
  - Test caching plugin with real requests
  - Test multiple plugins with interceptors working together
  - Test per-request interceptors overriding plugin behavior
  - Test with existing features (retry, dedupe, hooks)
  - Verify all existing tests still pass
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
