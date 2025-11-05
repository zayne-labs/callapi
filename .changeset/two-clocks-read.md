---
"@zayne-labs/callapi": patch
---

refactor(validation)!: change fallback route schema key to @default

The fallback route schema key has been updated from '.' to '@default' for better clarity and consistency. The type definition has been moved to constants/validation.ts and imported where needed to improve code organization.
