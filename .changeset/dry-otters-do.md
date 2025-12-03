---
"@zayne-labs/callapi": patch
---

refactor(callapi): improve type naming and validation handling

- rename CallApiSuccessOrErrorVariant to CallApiResultSuccessOrErrorVariant for consistency
- simplify ResultModeMap type structure and remove redundant types
- enhance schema validation with support for per-field disable flags
- streamline request options validation and header resolution
- update tests to reflect changes in type names and validation behavior
