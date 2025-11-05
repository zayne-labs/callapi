---
"@zayne-labs/callapi": patch
---

fix(callapi): add response-less variant types for API results

Introduce new type variants (SuccessVariantWithoutResponse and ErrorVariantWithoutResponse) to properly type API results when response field is omitted. This provides better type safety than simple Omit operation.
