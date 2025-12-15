---
"@zayne-labs/callapi": patch
---

refactor(callapi): improve auth typing and inference ♻️

refactor(callapi): rename `Auth` to `AuthOption` and refine auth types (Bearer, Token, Basic, Custom) ♻️
feat(callapi): add `InferAuthOption` to support schema-based auth typing ✨
fix(callapi): update usages of `Auth` to `AuthOption` in hooks and common types 🔧
docs: update authorization documentation to reflect new types 📚
test: update auth tests to match new type definitions ✅
chore: update dependencies and lockfile 📦
