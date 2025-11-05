---
"@zayne-labs/callapi": patch
---

refactor(result): improve type definition for withoutResponse mode

Use Omit<TComputedResult, "response"> instead of union type to better represent the structure when response is excluded
