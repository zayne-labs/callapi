---
"@zayne-labs/callapi": patch
---

feat(callapi): support extraFetchOptions for flexible fetch config merging

- Add extraFetchOptions to ModifiedRequestInit type for plugin and request-level fetch overrides
- Update plugin initialization to merge extraFetchOptions from plugin setup
- Modify createFetchClient to properly merge extraFetchOptions from base and instance configs
- Add tests for extraFetchOptions merging behavior with plugins and skipAutoMergeFor
- Update fetchSpecificKeys constant to include extraFetchOptions
- Refactor docs layout to use fumadocs-core Link and improve version display
- Upgrade dependencies across monorepo including Next.js, ESLint, and TypeScript configs
- Fix OG image generation to use import.meta.url for font loading
- Improve chat context utilities with better file sorting and monorepo root detection
