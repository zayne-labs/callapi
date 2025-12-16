---
"@zayne-labs/callapi": patch
---

feat(url): add slash when joining baseURL with relative paths 🔗
fix(url): validate full URL with URL.canParse and log helpful hint 🧯
feat(utils): infer Content-Type from body; respect explicit header 🧠
feat(utils): support x-www-form-urlencoded via toQueryString when header set 🧾
refactor(guards): rename isSerializable → isSerializableObject ♻️
refactor(client): pass resolved headers to getBody for correct serialization 🔧
feat(types): merge prefix/baseURL with route keys including @METHOD/… 🧩
refactor(validation): rename disableValidationOutputApplication → disableRuntimeValidationTransform ✨
test(url|utils|validation): update expectations and cases to new behavior ✅
chore(deps): bump vitest and zod; refresh lockfile ⬆️
chore(pkg): apply minor package.json updates across workspace 🧹
break(validation): rename schema config flag; user code must update 🚨
