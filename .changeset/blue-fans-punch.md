---
"@zayne-labs/callapi": patch
---

refactor(types): 🔧 Improve type definitions and helper functions

\- refactor(types): Rename `MatchExactObjectType` with `Satisfies`

\- refactor(utils): Enhance `defineBaseConfig` with function overload support

\- chore(config): Update tsdown config from `Options` to `UserConfig`

\- refactor(index): Minor updates to main export file

feat(types): add BaseSchemaRouteKeyPrefixes type and refactor route types

Add new type for schema route key prefixes to improve type organization and reuse.

Refactor BaseCallApiSchemaRoutes to use the new type for better maintainability.
