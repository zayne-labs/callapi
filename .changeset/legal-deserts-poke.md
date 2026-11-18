---
"@zayne-labs/callapi": patch
---

refactor: adjust body type and optimize toSearchParams

- Allow nullable body values by removing NonNullable from BodyType
- Return existing URLSearchParams instead of creating a new instance
- Format auth.ts code for improved readability with line breaks
