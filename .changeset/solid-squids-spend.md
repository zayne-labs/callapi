---
"@zayne-labs/callapi": patch
---

fix(url): handle url normalization differently for protocol URLs

Modify normalizeURL to preserve protocol URLs by not adding a leading slash when the URL contains "http". Add tests to verify proper handling of both protocol and non-protocol URLs.
