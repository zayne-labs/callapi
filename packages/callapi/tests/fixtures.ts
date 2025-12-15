/**
 * Test fixtures with common mock data
 */

import type { HooksOrHooksArray } from "../src";
import type { CallApiPlugin } from "../src/plugins";
import type { BaseCallApiConfig, CallApiConfig } from "../src/types/common";

// Mock user data
export const mockUser = {
	active: true,
	createdAt: "2024-01-01T00:00:00Z",
	email: "john@example.com",
	id: 1,
	name: "John Doe",
} as const;

export const mockUsers = [
	mockUser,
	{
		active: false,
		createdAt: "2024-01-02T00:00:00Z",
		email: "jane@example.com",
		id: 2,
		name: "Jane Smith",
	},
	{
		active: true,
		createdAt: "2024-01-03T00:00:00Z",
		email: "bob@example.com",
		id: 3,
		name: "Bob Johnson",
	},
] as const;

// Mock error responses
export const mockError = {
	code: "VALIDATION_ERROR",
	details: {
		field: "email",
		issue: "Invalid email format",
	},
	message: "Invalid input data",
} as const;

export const mockHTTPError = {
	error: "Not Found",
	message: "The requested resource was not found",
	statusCode: 404,
} as const;

export const mockServerError = {
	error: "Internal Server Error",
	message: "An unexpected error occurred",
	statusCode: 500,
	timestamp: "2024-01-01T00:00:00Z",
} as const;

// Mock request/response data
export const mockCreateUserRequest = {
	email: "newuser@example.com",
	name: "New User",
} as const;

export const mockUpdateUserRequest = {
	active: false,
	name: "Updated User",
} as const;

// Mock authentication data
export const mockAuthToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token";
export const mockBasicAuth = {
	password: "testpass123",
	username: "testuser",
} as const;

export const mockCustomAuth = {
	prefix: "Custom",
	value: "custom-auth-value",
} as const;

// Mock configuration objects
export const mockBaseConfig = {
	baseURL: "https://api.example.com",
	headers: {
		Accept: "application/json",
		"Content-Type": "application/json",
	},
	timeout: 5000,
} satisfies BaseCallApiConfig;

export const mockConfigWithAuth = {
	...mockBaseConfig,
	auth: {
		value: mockAuthToken,
		type: "Bearer",
	},
} satisfies BaseCallApiConfig;

export const mockConfigWithRetry = {
	...mockBaseConfig,
	retry: {
		attempts: 3,
		delay: 1000,
		maxDelay: 5000,
		strategy: "exponential",
	},
} satisfies BaseCallApiConfig;

// Mock plugin for testing
export const mockPlugin: CallApiPlugin = {
	hooks: {
		onRequest: (context) => {
			context.request.headers["X-Test-Plugin"] = "true";
		},
		onResponse: (context) => {
			// Add a custom meta to track plugin execution instead of mutating context
			context.options.meta && (context.options.meta.pluginExecuted = true);
		},
	},
	id: "test-plugin",
	name: "Test Plugin",
} as const;

// Mock plugin with setup function
export const mockPluginWithSetup: CallApiPlugin = {
	hooks: {
		onRequest: (context) => {
			context.request.headers["X-Setup-Plugin"] = "true";
		},
	},
	id: "test-plugin-with-setup",
	name: "Test Plugin With Setup",
	setup: (context) => {
		// Return modified options to test setup functionality
		return {
			options: {
				...context.options,
				meta: { ...context.options.meta, pluginSetup: true },
			},
		};
	},
} as const;

// Mock validation schemas (using simple object structure)
export const mockUserSchema = {
	properties: {
		active: { type: "boolean" },
		email: { format: "email", type: "string" },
		id: { type: "number" },
		name: { minLength: 1, type: "string" },
	},
	required: ["id", "name", "email"],
	type: "object",
} as const;

export const mockCreateUserSchema = {
	properties: {
		email: { format: "email", type: "string" },
		name: { minLength: 1, type: "string" },
	},
	required: ["name", "email"],
	type: "object",
} as const;

// Mock URL patterns
export const mockURLPatterns = {
	complexPattern: "/api/v1/users/{userId}/posts/{postId}/comments",
	methodPrefixed: "@get/users/:id",
	userById: "/users/:id",
	userByIdWithQuery: "/users/:id?include=profile",
	users: "/users",
	userWithMultipleParams: "/users/:userId/posts/:postId",
} as const;

// Mock query parameters
export const mockQueryParams = {
	complex: {
		filter: ["active", "verified"],
		include: "profile,posts",
		limit: 10,
		page: 1,
		sort: "name",
	},
	simple: { limit: 10, page: 1 },
	withSpecialChars: {
		search: "hello world",
		"special-key": "special value",
		tags: "tag1,tag2",
	},
} as const;

// Mock stream data
export const mockStreamChunks = [
	new Uint8Array([1, 2, 3, 4]),
	new Uint8Array([5, 6, 7, 8]),
	new Uint8Array([9, 10, 11, 12]),
] as const;

export const mockStreamData = "This is test stream data that will be chunked";

// Mock progress events
export const mockProgressEvent = {
	lengthComputable: true,
	loaded: 1024,
	total: 2048,
} as const;

// Mock deduplication keys
export const mockDedupeKeys = {
	custom: "custom-dedupe-key",
	simple: "GET:/users",
	withParams: "GET:/users/123",
	withQuery: "GET:/users?page=1&limit=10",
} as const;

// Mock retry scenarios
export const mockRetryScenarios = {
	networkError: new Error("Network error"),
	serverError: new Error("Server error"),
	timeoutError: (() => {
		const error = new Error("Request timeout");
		error.name = "AbortError";
		return error;
	})(),
} as const;

// Mock hook execution tracking
export const mockHookTracker = {
	onError: [],
	onRequest: [],
	onRequestStream: [],
	onResponse: [],
	onResponseStream: [],
	onRetry: [],
} satisfies HooksOrHooksArray;

// Helper to reset mock hook tracker
export function resetMockHookTracker() {
	Object.keys(mockHookTracker).forEach((key) => {
		mockHookTracker[key as keyof typeof mockHookTracker].length = 0;
	});
}
