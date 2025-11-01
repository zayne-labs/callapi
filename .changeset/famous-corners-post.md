---
"@zayne-labs/callapi": patch
---

refactor(validation): improve type inference and dedupe logic

- Refactor type inference to handle input/output variants separately
- Optimize dedupe strategy with proper task queue scheduling
- Move fallBackRouteSchemaKey to constants
- Update build config to include constants exports
