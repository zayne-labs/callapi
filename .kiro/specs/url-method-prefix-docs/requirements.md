# Requirements Document

## Introduction

This feature involves documenting an existing but undocumented capability in CallApi that allows HTTP methods to be specified directly in the URL using a `@method/` prefix syntax. Currently, users can write URLs like `@get/users` or `@post/users` to specify the HTTP method, but this feature is not mentioned in the URL helpers documentation. The goal is to add comprehensive documentation for this feature to improve developer experience and discoverability.

## Requirements

### Requirement 1

**User Story:** As a CallApi developer, I want to understand how to specify HTTP methods directly in URLs using the `@method/` prefix syntax, so that I can use this convenient shorthand in my API calls.

#### Acceptance Criteria

1. WHEN a developer reads the URL helpers documentation THEN the system SHALL provide clear examples of the `@method/` prefix syntax
2. WHEN a developer uses the `@get/`, `@post/`, `@put/`, `@delete/`, or `@patch/` prefixes THEN the system SHALL explain how these are processed internally
3. WHEN a developer sees the method prefix examples THEN the system SHALL show the equivalent traditional method specification for comparison

### Requirement 2

**User Story:** As a CallApi developer, I want to see practical examples of method prefixes combined with other URL features, so that I can understand how they work together with params, query strings, and base URLs.

#### Acceptance Criteria

1. WHEN a developer reads the documentation THEN the system SHALL provide examples combining method prefixes with dynamic parameters
2. WHEN a developer reads the documentation THEN the system SHALL provide examples combining method prefixes with query parameters
3. WHEN a developer reads the documentation THEN the system SHALL show how method prefixes work with base URLs

### Requirement 3

**User Story:** As a CallApi developer, I want to understand the precedence rules for method specification, so that I know what happens when I specify methods in multiple ways.

#### Acceptance Criteria

1. WHEN a developer specifies both a method prefix and an explicit method option THEN the system SHALL document which takes precedence
2. WHEN a developer uses schema configuration with `requireMethodProvision` THEN the system SHALL explain how this affects method prefix behavior
3. WHEN a developer uses invalid or unsupported method prefixes THEN the system SHALL document the fallback behavior

### Requirement 4

**User Story:** As a CallApi developer, I want to see the complete list of supported method prefixes, so that I know all available options for this feature.

#### Acceptance Criteria

1. WHEN a developer reads the documentation THEN the system SHALL list all supported HTTP method prefixes (`@get/`, `@post/`, `@put/`, `@delete/`, `@patch/`)
2. WHEN a developer encounters unsupported method prefixes THEN the system SHALL document what happens in these cases
3. WHEN a developer uses method prefixes THEN the system SHALL explain that the method extraction is case-sensitive