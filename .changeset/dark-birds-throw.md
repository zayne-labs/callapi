---
"@zayne-labs/callapi": patch
---

feat(callapi): add onBeforeRequest hook and refactor method handling

- Introduce new onBeforeRequest hook for early request lifecycle interception
- Move method-related utilities to utils/common.ts for better organization
- Update tests to cover new hook functionality
- Rename slot.tsx to slot.ts in docs components for consistency
