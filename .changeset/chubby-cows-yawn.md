---
"@zayne-labs/callapi": patch
"@zayne-labs/callapi-plugins": patch
---

feat(validation): add issueCause to ValidationError and improve schema validation

- Add issueCause field to ValidationError to track validation failure source
- Refactor schema validation to use full schema context
- Update logger plugin to support basic and verbose modes
- Fix package.json exports configuration
- Update tests to include new issueCause field
