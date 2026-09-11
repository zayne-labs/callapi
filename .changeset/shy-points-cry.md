---
"@zayne-labs/callapi": minor
---

⏱️ feat(callapi): add Retry-After header support with respectRetryAfter option
🗺️ feat(callapi): add defineFallbackRouteSchema helper export
🔐 fix(callapi): treat null as missing auth value alongside undefined
🔗 fix(callapi): preserve URL fragment when merging query parameters
📦 fix(callapi): parse media type from Content-Type ignoring parameters
🗑️ fix(callapi): auto-clean empty global scope dedupe caches
🎨 refactor(callapi): sort defaults config and remove lint bypass comments
🙈 feat(logger-plugin): add redact option for sensitive verbose error data
📝 fix(logger-plugin): enable onResponse flag for success and error responses
✨ refactor(logger-plugin): standardize log message format and structure
📄 docs(retry): document Retry-After header configuration
📄 docs(logger): document redact option and onResponse enabled flag
🤖 ci(workflow): bump pnpm to v12.3.4 and add Playwright browser tests
✅ test(callapi): add coverage for auth, dedupe, retry, URL, and common utils
✅ test(logger-plugin): add tests for redaction and updated log formats
🧰 chore(callapi): rename TSUP to TSDOWN in build:test concurrently label
