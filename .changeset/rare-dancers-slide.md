---
"@zayne-labs/callapi": patch
---

refactor: eliminate redundant resultMode variants, use throwOnError for type narrowing

- Remove 'allWithException' and 'onlySuccessWithException' result modes
- Use throwOnError: true to automatically narrow types and remove null variants
- Update type system to conditionally return non-null types when throwOnError: true
- Simplify API to just 'all' and 'onlySuccess' modes + throwOnError flag
- Update tests and documentation to use new pattern
- Fix flaky timing test in hooks.test.ts (>= instead of > for CI stability)
