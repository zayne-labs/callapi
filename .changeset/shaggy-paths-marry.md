---
"@zayne-labs/callapi": patch
---

🐛 fix(callapi): cap manual refetches to prevent infinite loops (e.g. a token refresh that keeps returning 401)
✨ feat(callapi): add `refetchAttempts` option (default `1`) and `refetch({ maxAttempts })` per-call override, which takes priority when set
🔥 refactor(callapi)!: remove the `respectRetryAfter` option; retries now always use `retryDelay` / `retryStrategy`
📝 docs: fix refetch, dedupe key, retry defaults, debugMode and extraFetchOptions docs; fix stale JSDoc examples and broken API reference links
