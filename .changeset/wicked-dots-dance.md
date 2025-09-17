---
"@zayne-labs/callapi": patch
---

refactor(validation): rename InferSchemaResult to InferSchemaOutputResult and add InferSchemaInputResult

feat(validation): use inferSchemaInputResult for everything other than data and errorData, so that transformations don't affect the schema type when passing data to, for instance., the body

Improve type naming clarity by distinguishing between input and output schema inference types. This change better reflects the purpose of each type and maintains consistency in the validation system.
