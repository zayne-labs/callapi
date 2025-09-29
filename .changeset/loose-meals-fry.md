---
"@zayne-labs/callapi": patch
---

refactor(hooks): rename onBeforeRequest to onRequestReady and clean up schema config

- Rename onBeforeRequest hook to onRequestReady for better semantic meaning
- Remove unused schemaConfig from GetMethodContext type
- Reorder imports and clean up type definitions
- Update corresponding test cases to reflect hook name change
