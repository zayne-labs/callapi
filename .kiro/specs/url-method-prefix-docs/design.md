# Design Document

## Overview

This design outlines the addition of comprehensive documentation for CallApi's method prefix feature to the existing URL helpers documentation. The method prefix feature allows developers to specify HTTP methods directly in URLs using the `@method/` syntax (e.g., `@get/users`, `@post/users`). This feature is currently implemented in the codebase but lacks documentation, making it difficult for developers to discover and use effectively.

## Architecture

### Documentation Structure

The method prefix documentation will be integrated into the existing `apps/docs/content/docs/url-helpers.mdx` file as a new section. The documentation will follow the established pattern of the existing sections with:

1. **Clear section heading** - "Method Prefixes"
2. **Explanatory text** - Brief introduction to the feature
3. **Code examples** - Practical demonstrations with TypeScript
4. **Comparison examples** - Showing equivalent traditional syntax
5. **Integration examples** - Combining with other URL features

### Content Organization

The new section will be positioned after the "Base URL" section and before "Dynamic Parameters" to maintain logical flow:

```
1. Base URL (existing)
2. Method Prefixes (new)
3. Dynamic Parameters (existing)
4. Query Parameters (existing)
5. Types (existing)
```

This positioning makes sense because method prefixes are a fundamental URL feature that affects the entire request, similar to base URLs.

## Components and Interfaces

### Documentation Components

#### 1. Method Prefix Introduction
- Brief explanation of the `@method/` syntax
- List of supported HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Explanation of how method prefixes are processed internally

#### 2. Basic Usage Examples
- Simple examples for each supported method
- Side-by-side comparison with traditional method specification
- Clear annotations showing the resolved URLs and methods

#### 3. Integration Examples
- Method prefixes combined with dynamic parameters
- Method prefixes combined with query parameters
- Method prefixes with base URLs

#### 4. Precedence and Edge Cases
- Behavior when both method prefix and explicit method are specified
- Schema configuration effects (`requireMethodProvision`)
- Invalid/unsupported method prefix handling

### Code Example Structure

Each code example will follow the established pattern:
```typescript
// Method prefix syntax
const result = await callApi("@get/users");

// Equivalent traditional syntax
const result = await callApi("/users", { method: "GET" });
```

## Data Models

### Method Prefix Patterns

The documentation will reference the following method prefix patterns supported by the `extractMethodFromURL` function:

- `@get/` → GET method
- `@post/` → POST method
- `@put/` → PUT method
- `@delete/` → DELETE method
- `@patch/` → PATCH method

### URL Processing Flow

The documentation will explain the URL processing sequence:
1. Method extraction from `@method/` prefix
2. URL normalization (removing method prefix)
3. Parameter substitution
4. Query string appending
5. Base URL prepending

## Error Handling

### Invalid Method Prefixes

The documentation will cover error scenarios:

1. **Unsupported methods**: `@head/users` → Falls back to default method
2. **Malformed prefixes**: `@/users` → No method extraction
3. **Case sensitivity**: `@GET/users` vs `@get/users` → Only lowercase supported

### Precedence Rules

Clear explanation of method resolution priority:
1. Schema config `requireMethodProvision: true` → Explicit method required
2. Explicit method option → Takes precedence over URL prefix
3. URL method prefix → Extracted and used
4. Default method → Fallback when no method specified

## Testing Strategy

### Documentation Validation

1. **Code Example Testing**: All TypeScript examples must compile and run correctly
2. **Link Validation**: Internal links to other documentation sections must work
3. **Type Reference Validation**: Auto-generated type tables must display correctly

### Content Review Criteria

1. **Accuracy**: Examples match actual implementation behavior
2. **Completeness**: All supported methods and edge cases covered
3. **Clarity**: Examples are easy to understand and follow
4. **Consistency**: Follows existing documentation patterns and style

### Integration Testing

1. **Navigation Flow**: New section integrates smoothly with existing content
2. **Cross-References**: Links to related sections (like request options) work correctly
3. **Search Functionality**: New content is discoverable through site search

## Implementation Approach

### Content Addition Strategy

1. **Minimal Disruption**: Add new section without modifying existing content structure
2. **Progressive Enhancement**: Build upon existing examples where appropriate
3. **Consistent Styling**: Use established code block formats and annotations

### Example Integration Points

The method prefix examples will reference and build upon existing documentation:
- Combine with dynamic parameters from the "Dynamic Parameters" section
- Integrate with query parameters from the "Query Parameters" section
- Reference base URL behavior from the "Base URL" section

### Technical Considerations

1. **TypeScript Integration**: All examples use proper TypeScript syntax with twoslash comments
2. **Annotation System**: Use existing `@annotate` comments for URL resolution explanations
3. **Code Block Formatting**: Follow established `title="api.ts"` naming convention