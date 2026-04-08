---
"@zayne-labs/callapi": patch
---

perf: reduce bundle size and improve polyfill handling

- Lower size-limit from 7kb to 6.8kb by removing dynamic imports for polyfills
- Replace async polyfill imports with direct function calls for AbortSignal.timeout/any
- Refactor deterministicHashFn for better readability by moving comment closer to usage
