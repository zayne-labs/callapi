---
"@zayne-labs/callapi": patch
---

feat(callapi): add fetchApi result mode and improve result handling

- Implement new 'fetchApi' result mode that returns raw Response object
- Skip data parsing and validation when resultMode is 'fetchApi'
- Update type definitions and rename ThrowOnErrorUnion to ThrowOnErrorBoolean
- Add comprehensive tests for all result modes
- Improve documentation for result mode options
