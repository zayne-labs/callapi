# Implementation Plan

- [x] 1. Add Method Prefixes section to URL helpers documentation
  - Insert new "Method Prefixes" section after the "Base URL" section in the url-helpers.mdx file
  - Include comprehensive explanation of the `@method/` syntax feature
  - Add basic usage examples for all supported HTTP methods (GET, POST, PUT, DELETE, PATCH)
  - _Requirements: 1.1, 1.2, 4.1_

- [ ] 2. Create comparison examples showing method prefix vs traditional syntax
  - Add side-by-side code examples comparing `@get/users` syntax with traditional `{ method: "GET" }` approach
  - Include clear annotations showing how URLs are resolved and processed
  - Demonstrate the equivalent functionality to help developers understand the feature
  - _Requirements: 1.3, 4.2_

- [ ] 3. Add integration examples combining method prefixes with other URL features
  - Create examples showing method prefixes combined with dynamic parameters (`:userId`)
  - Add examples demonstrating method prefixes with query parameters
  - Show how method prefixes work with base URLs in createFetchClient
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Document method precedence rules and edge cases
  - Add explanation of what happens when both method prefix and explicit method option are provided
  - Document the behavior with schema configuration `requireMethodProvision` setting
  - Explain fallback behavior for invalid or unsupported method prefixes
  - _Requirements: 3.1, 3.2, 3.3, 4.3_

- [ ] 5. Add comprehensive list of supported method prefixes
  - Create clear list of all supported method prefixes with examples
  - Document case-sensitivity requirements for method prefixes
  - Explain what happens with unsupported method prefixes
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 6. Integrate method prefix documentation with existing content structure
  - Ensure proper heading hierarchy and navigation flow
  - Add appropriate callout boxes or info sections where needed
  - Verify TypeScript code examples compile correctly with twoslash comments
  - _Requirements: 1.1, 2.1, 2.2, 2.3_