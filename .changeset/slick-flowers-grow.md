---
"@zayne-labs/callapi": patch
---

refactor(callapi): rename CallApiEnv to CallApiContext and related types

Rename CallApiEnv to CallApiContext to better reflect its purpose as a context provider rather than environment configuration. Update all related types and functions to use the new naming convention, including createFetchClientWithEnv becoming createFetchClientWithContext. This change improves code clarity and maintainability.
