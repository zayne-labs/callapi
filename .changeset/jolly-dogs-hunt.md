---
"@zayne-labs/callapi": minor
---

feat(middleware): ✨ implement fetch middleware composition system

- Add fetchMiddleware option to enhance fetch function with composable middleware pattern
- Support middleware at base config, plugin, and per-request levels
- Implement proper composition order: per-request → plugins → base → customFetchImpl → fetch
- Add comprehensive tests for middleware composition, caching implementation, and integration
- Create example caching plugin implementation using the middleware system
