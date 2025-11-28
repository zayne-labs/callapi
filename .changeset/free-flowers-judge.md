---
"@zayne-labs/callapi": patch
---

refactor(core): ♻️ Standardize context types and generics

- refactor(types): Introduce `DefaultCallApiContext` and update default generic parameters across config types
- refactor(hooks): Update hook context types to be generic and accept `TCallApiContext`
- refactor(types): Rename `InferExtendSchemaConfigContext` to `GetExtendSchemaConfigContext`
- refactor(types): Move `InferParamsFromRoute` to `conditional-types.ts`
- refactor(core): Remove `types/index.ts` and update `src/index.ts` exports
- chore(deps): Update lockfile
