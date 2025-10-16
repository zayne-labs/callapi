---
"@zayne-labs/callapi": patch
---

refactor(callapi): consolidate default options and improve type safety

- Rename default-options.ts to defaults.ts for better clarity
- Add new CallApiSuccessOrErrorVariant type for better type safety
- Improve error handling with more specific error result types
- Update imports across multiple files to use new defaults.ts
- Refactor result type handling for better maintainability
