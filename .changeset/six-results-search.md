---
"@zayne-labs/callapi": patch
---

refactor(types): improve type inference for defineBaseConfig

Update defineBaseConfig to properly infer return type when using function configuration, ensuring deep writeable properties are correctly applied to the function's return value.
