---
"@zayne-labs/callapi": patch
---

refactor(dedupe): extract dedupe cache scope key logic to function

Move the dedupe cache scope key resolution logic into a separate function for better maintainability and reusability. Also update the type definition to support function values.
