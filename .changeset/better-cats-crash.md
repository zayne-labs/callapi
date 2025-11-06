---
"@zayne-labs/callapi": patch
---

refactor(types): 🔄 Use InferSchemaInput instead of InferSchemaOutput for input types like query and params to avoid the issue of lying to ts

feat(validation): Export `InferSchemaResult` type from validation module.
