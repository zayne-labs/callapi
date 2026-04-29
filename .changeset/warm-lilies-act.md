---
"@zayne-labs/callapi": patch
---

feat(callapi): perf updates

- Move common type definitions from types/common.ts to new types/options-types.ts for better organization
- Rename initializePlugins to initializePluginsAndHooks to better reflect its functionality
- Add debugMode option to extraOptionDefaults with default value of true
- Update all import statements across the codebase to reference new options-types module
- Optimize AbortController initialization to be null when dedupeStrategy is "none"
- Refactor dedupe strategy logic to simplify shouldDisableDedupe check
- Add debugMode parameter to getFullAndNormalizedURL function call
- Update type annotations for newFetchController to allow null values
- Add performance test suite for benchmarking core operations
- Enhance test setup with dedicated callapi-setup configuration
- Update vitest configuration for improved test execution
- Consolidate type imports and reorganize import order for consistency
