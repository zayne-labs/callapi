---
"@zayne-labs/callapi": patch
---

feat(utils): add FormData conversion utility and improve query string handling

- Add `toFormData` utility for converting objects to FormData
- Enhance support for different data types in FormData conversion
- Move `toQueryString` to a separate helpers file for better organization
- Add type-preserving mode for FormData conversion
- Improve documentation for new utility functions
- Update Vitest to version 4.0.1 in package dependencies
- Add `isBlob` type guard to utils
- Refactor and clean up utility functions
