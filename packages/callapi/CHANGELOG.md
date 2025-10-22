# @zayne-labs/callapi

## 1.11.5

### Patch Changes

- 63ecf19: fix(callapi): improve dedupe key handling and update docs formatting
  - Fix dedupe key resolution logic to properly handle undefined values
  - Update type definitions to allow undefined return values for dedupe callbacks
  - Normalize indentation in README.md examples
  - Add .\*md to prettierignore

## 1.11.4

### Patch Changes

- 8c31997: refactor(dedupe): extract dedupe cache scope key logic to function

   Move the dedupe cache scope key resolution logic into a separate function for better maintainability and reusability. Also update the type definition to support function values.

## 1.11.3

### Patch Changes

- 70ebf9e: refactor(callapi): consolidate default options and improve type safety
  - Rename default-options.ts to defaults.ts for better clarity
  - Add new CallApiSuccessOrErrorVariant type for better type safety
  - Improve error handling with more specific error result types
  - Update imports across multiple files to use new defaults.ts
  - Refactor result type handling for better maintainability

## 1.11.2

### Patch Changes

- 8006bfc: feat(middlewares): add middleware documentation and refactor fetch middleware implementation

   refactor(callapi): rename composeAllHooks to composeHooksFromArray and composeAllMiddlewares to composeMiddlewaresFromArray

   refactor(callapi): update fetch middleware to receive request context

   docs: add comprehensive middlewares documentation with examples

   chore: update dependencies across packages
   style: standardize zod imports from namespace to named imports

## 1.11.1

### Patch Changes

- f0b9575: feat(type-helpers): add RemovePrefix utility type for key transformation

   refactor(retry): simplify retry options type using RemovePrefix
   refactor(dedupe): apply same pattern to dedupe options type

   docs: add social media post introducing CallApi features

## 1.11.0

### Minor Changes

- 3860cb7: feat(middleware): ✨ implement fetch middleware composition system
  - Add fetchMiddleware option to enhance fetch function with composable middleware pattern
  - Support middleware at base config, plugin, and per-request levels
  - Implement proper composition order: per-request → plugins → base → customFetchImpl → fetch
  - Add comprehensive tests for middleware composition, caching implementation, and integration
  - Create example caching plugin implementation using the middleware system

## 1.10.6

### Patch Changes

- ee21de9: refactor(hooks): rename onBeforeRequest to onRequestReady and clean up schema config
  - Rename onBeforeRequest hook to onRequestReady for better semantic meaning
  - Remove unused schemaConfig from GetMethodContext type
  - Reorder imports and clean up type definitions
  - Update corresponding test cases to reflect hook name change

## 1.10.5

### Patch Changes

- 8437089: feat(callapi): add onBeforeRequest hook and refactor method handling
  - Introduce new onBeforeRequest hook for early request lifecycle interception
  - Move method-related utilities to utils/common.ts for better organization
  - Update tests to cover new hook functionality
  - Rename slot.tsx to slot.ts in docs components for consistency

## 1.10.4

### Patch Changes

- 1cd3367: fix(callapi): add polyfill to AbortSignal methods to avoid crashes on edge runtime

## 1.10.3

### Patch Changes

- edf52fb: feat(validation): add issueCause to ValidationError and improve schema validation
  - Add issueCause field to ValidationError to track validation failure source
  - Refactor schema validation to use full schema context
  - Update logger plugin to support basic and verbose modes
  - Fix package.json exports configuration
  - Update tests to include new issueCause field

## 1.10.2

### Patch Changes

- c69f3d6: refactor: eliminate redundant resultMode variants, use throwOnError for type narrowing
  - Remove 'allWithException' and 'onlySuccessWithException' result modes
  - Use throwOnError: true to automatically narrow types and remove null variants
  - Update type system to conditionally return non-null types when throwOnError: true
  - Simplify API to just 'all' and 'onlySuccess' modes + throwOnError flag
  - Update tests and documentation to use new pattern
  - Fix flaky timing test in hooks.test.ts (>= instead of > for CI stability)

## 1.10.1

### Patch Changes

- 605af9d: refactor(validation): rename InferSchemaResult to InferSchemaOutputResult and add InferSchemaInputResult

   feat(validation): use inferSchemaInputResult for everything other than data and errorData, so that transformations don't affect the schema type when passing data to, for instance., the body

   Improve type naming clarity by distinguishing between input and output schema inference types. This change better reflects the purpose of each type and maintains consistency in the validation system.

## 1.10.0

### Minor Changes

- e78a454: 🐛 feat(result): improve response type detection for better content handling

   ✅ test(errors): add test for successful response with invalid JSON content
   🔧 chore(package): increase size limit from 5.8kb to 6kb

## 1.9.12

### Patch Changes

- d393723: 🐛 fix(retry): handle aborted signals and improve retry condition logic

   🧪 test(callapi): add browser testing config and improve test coverage

   ✨ feat(testing): add vitest.browser.config.ts for browser-based testing with Playwright
   🔧 chore(config): update vitest.config.ts to remove text reporter and simplify typecheck config

   ✅ test(utils): add comprehensive tests for type guards with various data types
   🔄 ci(turbo): add test-related tasks to turbo.json for better pipeline management
   🗑️ chore(cleanup): remove .kiro spec files that are no longer needed

## 1.9.11

### Patch Changes

- 4a9fcdf: fix: properly infer response types

## 1.9.10

### Patch Changes

- 40c8a4e: fix: validation bug due to wrong arguments passed

## 1.9.9

### Patch Changes

- fc435f4: refactor: update parameter patterns in conditional-types and clean up client.ts comments; remove unused test-params file

## 1.9.7

### Patch Changes

- b47396f: feat(callapi/validation): export fallBackRouteSchemaKey constant and type to enable external access to fallback route resolution ✨

## 1.9.6

### Patch Changes

- c2f7fea: feat(callapi-validation)!: add fallback route schema '.' and merge with current route (current takes precedence) ✨💥
  feat(callapi-types): exclude fallback key from inferred route keys in type computations ✨
  feat(callapi-types): export FallBackRouteSchemaKey for cross-package typing ✨
  fix(callapi-types): correct params required inference to check undefined (not null) 🐛
  refactor(callapi-types,callapi-validation)!: rename schema context baseSchema -> baseSchemaRoutes; pass resolved currentRouteSchema ♻️💥
  feat(callapi-types): improve route param extraction with PossibleParamNamePatterns and explicit processing order for ':param' then '{param}' ✨
  feat(dev-client): use object path params and query for GitHub commits; add schema entry ✨
  docs(callapi-types): clarify JSDoc for instance schema and schemaConfig behavior 📝
  chore(deps): update package.json files and pnpm-lock.yaml ⬆️

   feat:(callapi-types,callapi-validation): schema callback context renamed from baseSchema to baseSchemaRoutes; consumers must update function parameter usage 💥

## 1.9.4

### Patch Changes

- 5c6900d: fix: faulty error resolution

## 1.9.3

### Patch Changes

- 7d4765f: fix(route-method): fixed issue with route method extraction

## 1.9.2

### Patch Changes

- 991ac01: refactor(callapi/hooks): make hook registries use lazy instantiation instead of having to deep copy with structured clone🧩

   chore(deps): update workspace package.json files and sync pnpm-lock.yaml 📦🔒

## 1.9.0

### Minor Changes

- 9627f3e: refactor(plugins): rename `init` to `setup` and improve type safety

   ♻️ refactor(plugins): rename `PluginInitContext` to `PluginSetupContext` and `init` hook to `setup`
   ✨ feat(types): enhance type safety in response handling
   🔧 fix(types): improve generic type handling in response parsers
   📝 docs: update plugin documentation to reflect API changes

   feat(url): ✨ enhance URL parameter handling and dedupe logic
  - 🛠️ Improve URL parameter merging for both array and object params
  - 🔄 Support both `:param` and `{param}` URL parameter patterns
  - 🧹 Clean up and optimize dedupe cache implementation
  - 🏗️ Update page actions with better caching and error handling
  - 📝 Update related documentation and examples

## 1.8.22

### Patch Changes

- 00c0d7f: refactor: update to internal dedupe structure

## 1.8.21

### Patch Changes

- 9f3b938: feat: update jsdocs and allow dedupe key to accept a callback

## 1.8.20

### Patch Changes

- 1de63d3: fix(types): improve type inference and schema handling

   ♻️ refactor(types): simplify type parameters and improve type safety
   ✨ feat(types): better handling of URL types in schema configuration
   🐛 fix(types): fix type inference for route keys and schema validation
   🔧 chore: update dependencies and configuration files

## 1.8.18

### Patch Changes

- 6e259a6: fix(cache): optimize global cache scope check in dedupe strategy
  - Simplify the global cache scope check condition

## 1.8.17

### Patch Changes

- ee7659d: feat(dedupe): ✨ add scoped deduplication cache with namespacing
  - feat(dedupe): add `dedupeCacheScopeKey` option for namespacing global dedupe caches
  - refactor(dedupe): improve type safety with `GlobalRequestInfoCache` type
  - fix(error): update error message reference to use `defaultHTTPErrorMessage`
  - refactor(types): add type safety with `satisfies CallApiConfig` to default options
  - chore: update error message constant name for consistency

## 1.8.15

### Patch Changes

- 03f69ce: feat(core): Add prefix support and initURL format, in anticipation for v1.9.0
  fix(dedupe): clarify duplicate-request abort wording for better DX 🐞
  chore(ci): tweak stale workflow file naming & add legacy variant 🔧
  chore(repo): update exports and minor style tweaks across modules ✨

## 1.8.12

### Patch Changes

- 360b0b7: fix: ensure schema takes precedence over path in terms of params when making it required

## 1.8.10

### Patch Changes

- 4864919: fix: pix bug in array hook merging logic

## 1.8.3

### Patch Changes

- 9d8f72d: refactor(auth): 🔄 Simplify auth header return types

   fix(auth): 🐛 Improve bearer token handling logic
   feat(dedupe): ✨ Add dedupeCacheScope option with 'local' default

## 1.8.2

### Patch Changes

- 3a150ba: feat: add isJavascriptError guard

## 1.8.0

### Minor Changes

- 7da7707: - Implementation of standard schema validation, both in runtime and at the type level
  - Ability to override any of the schemas and configs at the instance level
  - Handle errors specifically for validation failures
  - Setting up the stage for open api spec generation and usage

## 1.7.18

### Patch Changes

- eb629cf: feat(error): ✨ Add HTTPError.isError static method for better type checking
  refactor(utils): 🔄 Rename waitUntil to waitFor for better clarity
  refactor(types): 🏷️ Improve type annotations and error generics
  feat(types): 🔄 Add conditional ThrowOnErrorOption and refine ResultModeOption

## 1.7.15

### Patch Changes

- 434dec2: ✨ result: Introduce allWithoutResponse variants using omitKeys utility
  📦 core: Add new result mode types to handle response-excluded scenarios

## 1.7.14

### Patch Changes

- ce8ba66: 🐛 fix(types): improve type safety in guards and type helpers
  📄 docs(comparisons): update documentation with latest framework comparisons
  🔄 refactor(validation): streamline schema validation with zod v3.24.4
  📦 chore(pnpm): update lockfile with latest package versions

## 1.7.10

### Patch Changes

- dc9ae65: feat(error-handling): ✨ replace error.ts with result.ts introducing Result type
  fix(auth): 🚑 make header resolution async in mergeAndResolveHeaders
  chore(deps): 🔧 update type guards to reference new result module
  refactor(types): ♻️ consolidate conditional types and common type utils
  fix(headers): 🚑 handle async auth header generation
  types(guards): 🏷️ update PossibleHTTPError imports to use result.ts

## 1.7.6

### Patch Changes

- 83160f4: fix(hooks): re-add support for merge base and instance hooks if the base is an array
  refactor(core): Move constants to dedicated directory
  refactor(types): Improve type definitions and conditional types
  chore(cleanup): Remove deprecated constants file
- e81116a: refactor(retry)!: revamp retry system with improved type safety and flexibility 🔄 ⚡️

   feat(retry): add function support for retry delay configuration 🎛️
   feat(retry): make attempts required in InnerRetryOptions 🔒
   feat(retry): add UnmaskType utility for better type inference 🎯
   refactor(retry): rename ~retryCount to ~retryAttemptCount for clarity 📝
   refactor(retry): move retry constants to retry.ts for better organization 🏗️
   refactor(retry): improve retry strategy handling with switch statement 🔀
   refactor(retry): enhance status code and method checking with Set 🚀
   chore(deps): update @zayne-labs/toolkit-type-helpers to 0.9.33 📦

## 1.7.4

### Patch Changes

- f211571: feat(hooks): add config and baseConfig to context.
  feat(options): rename option to "skipAutoMerge"
  refactor(docs): 📚 Update documentation for hooks and options
  feat(core): ✨ Move all hook related features to a new hooks.ts module
  refactor(core): ♻️ Remove polyfills.ts and logo assets
  chore(deps): ⬆️ Upgrade @types/node and other dependencies

## 1.7.1

### Patch Changes

- 52a1573: feat(core): 🚀 Add option for skipping default options merge

   feat(types): 🏷️ Update common types and conditional type utilities
   chore(deps): 📦 Update package dependencies across monorepo

## 1.7.0

### Minor Changes

- f95b8ac: 🔄 refactor(core): comprehensive HTTP client overhaul with streaming support

   docs: update docs to include new hooks

   feat(stream): add streaming request capabilities and utilities
   feat(plugins): enhance plugin system with improved interceptor pattern
   refactor(utils): reorganize type guards and utility functions
   chore(deps): update package dependencies and lockfile

## 1.6.24

### Patch Changes

- a93d849: fix(callapi): 🐛 refactor error handling logic in createFetchClient
  refactor(callapi): ♻️ clean up nested error handling code

## 1.6.16

### Patch Changes

- e5f13e3: feat: cleaned things up a bit

## 1.6.9

### Patch Changes

- 6093711: feat: abstract validation and add new resultMode for allWithoutResponse

   This commit introduces data validation for both success and error responses using schemas and validators. It also refactors error handling to provide more context and flexibility.
  - Implemented `handleValidation` function to validate response data against schemas and validators.
  - Modified `createFetchClient` and `createFetchClientWithOptions` to include validation of success and error data.
  - Updated `resolveErrorResult` to provide more detailed error information.
  - Refactored dedupe strategy to improve readability and maintainability.
  - Added `omitKeys` and `pickKeys` utility functions for object manipulation.
  - Updated types and contexts to reflect the changes in error handling and validation.
  - Increased size limit in `package.json` to accommodate the new features.

## 1.6.7

### Patch Changes

- 2ed893e: fix(callapi): fix serializer bug that prevented the body object from being stringified internally

## 1.6.0

### Minor Changes

- d378e41: feat: add generic argument support and inference for response type

## 1.5.1

### Patch Changes

- 301715a: refactor(types)!: ♻️ 🏗️ make schema errors intuitive and easy to disable by including undefined

## 1.5.0

### Minor Changes

- 7c29408: feat: add support for validating every request detail via schemas

## 1.4.4

### Patch Changes

- 233b2b7: 🔧 fix(types): initialize plugin type generic with never to remove type errors

## 1.4.0

### Minor Changes

- 00440df: feat(core)!: ✨ add schema validation with standard-schema support
  chore(deps):⬆️ upgrade pnpm to 10.2.1
  docs(error-handling): 📝 improve error handling docs
  style(docs): 🎨 update docs UI and improve navigation
  fix(docs): 🔗 update broken links in README files

## 1.3.5

### Patch Changes

- bf6002b: chore(deps): ⬇️ downgrade fumadocs packages due to failed tailwind migration
  feat(exports): ✨ expose retry constants from utils
  chore(eslint): 🔧 enable tailwindcss config validation

## 1.3.3

### Patch Changes

- 621f15f: fix: improve types

## 1.3.1

### Patch Changes

- ed6412d: fix: fix type issues with interceptor
  feat: allow plugin hooks to also be arrays

## 1.3.0

### Minor Changes

- cbedc52: 🔄 refactor(retry): rename retryCodes to retryStatusCodes for clarity ✨ feat(retry): add POST to default retry methods
  📝 docs(hooks): reorganize hooks documentation for better readability 🗑️ refactor(docs): merge retries.mdx into timeout-and-retries.mdx

## 1.2.1

### Patch Changes

- 28b68df: 🔧 fix(fetch): remove fullURL option from request options to extra-options

## 1.2.0

### Minor Changes

- 0f333f7: feat(core): ✨ Add retry functionality and enhance core components

   feat(docs): 📚 Update documentation structure and title

   chore(types): 🏗️ Refactor type definitions and utilities

## 1.1.0

### Minor Changes

- 4ff75bc: feat!: rename requestKey to dedupeKey

## 1.0.0

### Major Changes

- 445c87b: release(packages): 🚀 official bump of @zayne-labs/callapi and @zayne-labs/callapi-legacy to v1.0.0

## 1.0.0-rc-20240920162427

### Major Changes

- [BREAKING]: removal of the `cancelRedundantRequest` option, replaced with the more robust `dedupeStrategy`
- Add params feature
  Add dedupe feature
  Upgrade caching heuristics
  Deprecate cancelRedundantRequests option
  Stabilize current API

## 0.8.0

### Minor Changes

- a620848: reformated onError interceptor's error object to be consistent with the one from callapi

### Patch Changes

- 210abd2: added types for headers

## 0.7.9

### Patch Changes

- 0061a16: added types for headers

## 0.7.8

### Patch Changes

- 343989e: fix typo in error message for abort

## 0.7.7

### Patch Changes

- 75d00c5: allow null as a valid auth value

## 0.7.6

### Patch Changes

- c6e6b12: used isObject over isString for auth option
- c6e6b12: simplified a few types

## 0.7.5

### Patch Changes

- 0111f54: revert null check
- 4eb6978: fix params error message

## 0.7.4

### Patch Changes

- 45ac33b: handled null cases for empty objects in query params

## 0.7.3

### Patch Changes

- 52493b1: retrying failed deployment
- 8cdd379: fix ci
- c78dea9: update with provenance

## 0.7.3

### Patch Changes

- bfb97aa: update with provenance
- 3de7baf: add provenance tag to publish command

## 0.7.2

### Patch Changes

- eb3fecf: a few bug fixes

## 0.7.1

### Patch Changes

- 61bb5a9: update bundling and exports

## 0.7.0

### Minor Changes

- 2df4132: feat: made requestKey to be a combination of options and url
  ![BREAKING] - removed cancel property from callApi

### Patch Changes

- 5ec6d9b: improve types

## 0.6.0

### Minor Changes

- 37a6d8e: added a new interceptor that runs both onResponse and onRequestErrors

## 0.5.4

### Patch Changes

- eebc2a8: create isQueryString Utility, update docs

## 0.5.3

### Patch Changes

- 0d83e43: removed manual headers handling for only formData

## 0.5.2

### Patch Changes

- 5aaa7b5: fix success response returning errorInfo instead error

## 0.5.1

### Patch Changes

- cad5d81: fixed a bug in fetch creator

## 0.5.0

### Minor Changes

- 6ec8f12: Add cloneResponse Option to callApi

## 0.4.7

### Patch Changes

- 38d444d: update docs

## 0.4.6

### Patch Changes

- 5ae2242: upgrade engines field to node 18.17.x

## 0.4.5

### Patch Changes

- 566fb56: added reason option to cancel method

## 0.4.4

### Patch Changes

- 7d732a1: Improvements to AbortError messages

## 0.4.3

### Patch Changes

- 19ac795: lil change to merge util

## 0.4.2

### Patch Changes

- 4240557: Add Documentation website

## 0.4.1

### Patch Changes

- c98edc8: Add Documentation website

## 0.4.0

### Minor Changes

- dc92197: changed errorName to just name

## 0.3.4

### Patch Changes

- b21eb8b: refactored httpError class to better support response object.assign

## 0.3.3

### Patch Changes

- d36c285: removed abort.any type cast
- ffffc02: fixed the respone spread issue

## 0.3.2

### Patch Changes

- f2762ec: improve types for auth

## 0.3.1

### Patch Changes

- 7a27edd: provided a response clone to the getResponseData function, to prevent bodyused errors when user tries to call res.whatever() in interceptor

## 0.3.0

### Minor Changes

- aaa3951: Improved error handling experience, as well as the docs

## 0.2.7

### Patch Changes

- 9190d6a: add separate configs for esm and cjs, with diff folders

## 0.2.6

### Patch Changes

- 2d418c5: remove src dir from dist

## 0.2.5

### Patch Changes

- 2c8dbd6: add support for token version of auth header, also updated docs

## 0.2.4

### Patch Changes

- 5e35ac4: expanded conditional types in pkg.json to resolve to proper types

## 0.2.3

### Patch Changes

- 3907e38: update types in pkg.json

## 0.2.2

### Patch Changes

- b448415: fix: update entry points

## 0.2.1

### Patch Changes

- da4d300: chore: update build dir structure

## 0.2.0

### Minor Changes

- 66c4dad: feat: added option for adding custom validator function

### Patch Changes

- 66c4dad: refactor: exposed createFetchClient function for users who prefer it

## 0.1.1

### Patch Changes

- f2e0417: fix: fix build by adding missing entry

## 0.1.0

### Minor Changes

- 9128630: feat: added a new feature for auth tokens
- 9128630: Updated a few types and parts of the api to be more user friendly

### Patch Changes

- 9128630: docs: added proper docs to readme

## 0.0.6

### Patch Changes

- 2f2c22c: add main entry point via pkg.json

## 0.0.5

### Patch Changes

- 7e3fd59: fix: update package.json to better resolve necessary files and update typescript version

## 0.0.4

### Patch Changes

- a9f7824: changed package.json files property to hold src files instead of dist

## 0.0.3

### Patch Changes

- dfbadb2: fix: removed clone calls from reponse to prevent crashing

## 0.0.2

### Patch Changes

- 6922422: feat: added more paths to entry
