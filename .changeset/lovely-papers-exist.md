---
"@zayne-labs/callapi": patch
---

- Add null chunk support to StreamProgressEvent for completion tick signaling
- Implement accurate progress calculation with epsilon handling to prevent premature 100% reporting
- Replace calculateTotalBytesFromBody with estimateBodySize for better body size estimation across multiple types (FormData, Blob, ArrayBuffer, URLSearchParams, strings)
- Refactor stream tracking logic into createTrackedStream for improved code organization
- Update type helpers with DistributivePick utility for better type flexibility
- Add isString guard utility for type checking
- Improve streaming test coverage for progress events and edge cases
- Update guards test suite with new utility functions
- Increase size-limit from 6.8 kb to 7 kb to accommodate new streaming enhancements
- Add callapi.code-workspace for multi-project development setup
- Update dev client with streaming method specification and commented test cases
