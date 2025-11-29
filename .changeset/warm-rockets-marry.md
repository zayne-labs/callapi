---
"@zayne-labs/callapi": patch
---

refactor(callapi): further improve type simplification in a few core areas

- Add GetMergedCallApiContext type for better context merging
- Simplify Hooks interface by removing redundant generic params
- Update Middlewares interface to support context types
- Remove type-preserving overload from toFormData utility
- Reorganize imports in test files
