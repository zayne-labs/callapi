---
"@zayne-labs/callapi": patch
---

feat(url): ✨ improve URL handling with method extraction and validation enhancements

🚀 Enhanced URL processing with improved method extraction from URLs
🔧 Refactored validation system for better schema handling and route key resolution
🧪 Added comprehensive utility function tests and URL integration tests
⚡️ Improved error handling and URL normalization logic
📦 Updated package dependencies and workflow configurations
🎨 Enhanced type definitions with better conditional types and helpers

feat(validation): 🎯 enhance schema resolution and route key handling

- Improved `getResolvedSchema` function with better context passing
- Enhanced `getCurrentRouteSchemaKeyAndMainInitURL` with prefix/baseURL handling
- Added `removeLeadingSlash` utility for consistent path processing
- Refactored method extraction to use proper route key methods validation

test(utils): 🧪 add comprehensive utility function tests

- Added extensive tests for type guards, common utilities, and configuration splitting
- Implemented URL integration tests for fetch client functionality
- Enhanced test coverage for body processing, header handling, and error scenarios

fix(url): 🔧 improve URL normalization and method extraction

- Fixed `extractMethodFromURL` to properly validate route key methods
- Enhanced `normalizeURL` with configurable options for relative URL handling
- Improved error messages for invalid URL scenarios
- Added `atSymbol` constant for consistent method prefix handling
