---
"@zayne-labs/callapi": patch
---

feat(callapi-validation)!: add fallback route schema '.' and merge with current route (current takes precedence) ✨💥
feat(callapi-types): exclude fallback key from inferred route keys in type computations ✨
feat(callapi-types): export FallBackRouteSchemaKey for cross-package typing ✨
fix(callapi-types): correct params required inference to check undefined (not null) 🐛
refactor(callapi-types,callapi-validation)!: rename schema context baseSchema -> baseSchemaRoutes; pass resolved currentRouteSchema ♻️💥
feat(callapi-types): improve route param extraction with PossibleParamNamePatterns and explicit processing order for ':param' then '{param}' ✨
feat(dev-client): use object path params and query for GitHub commits; add schema entry ✨
docs(callapi-types): clarify JSDoc for instance schema and schemaConfig behavior 📝
chore(deps): update package.json files and pnpm-lock.yaml ⬆️

feat:(callapi-types,callapi-validation): schema callback context renamed from baseSchema to baseSchemaRoutes; consumers must update function parameter usage 💥
