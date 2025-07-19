---
"@zayne-labs/callapi": patch
---

feat(dedupe): ✨ add scoped deduplication cache with namespacing

- feat(dedupe): add `dedupeCacheScopeKey` option for namespacing global dedupe caches
- refactor(dedupe): improve type safety with `GlobalRequestInfoCache` type
- fix(error): update error message reference to use `defaultHTTPErrorMessage`
- refactor(types): add type safety with `satisfies CallApiConfig` to default options
- chore: update error message constant name for consistency
