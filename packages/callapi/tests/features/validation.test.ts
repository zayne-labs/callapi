/**
 * Validation functionality tests - consolidated from validation-basic and validation-advanced
 * Tests request/response validation, schemas, and advanced validation logic
 */

import { expect, test, vi } from "vitest";
import { createFetchClient } from "../../src";
import { expectErrorResult, expectValidationError } from "../test-setup/assertions";
import { createFetchMock, mockFetchSuccess } from "../test-setup/fetch-mock";
import { mockUser } from "../test-setup/fixtures";

// --- Mock Schema Helper ---
const createMockSchema = (validator: (value: unknown) => any, shouldFail = false, issues: any[] = []) => ({
	"~standard": {
		vendor: "test",
		version: 1 as const,
		validate: (value: unknown) => {
			if (shouldFail) return { issues };
			try {
				return { value: validator(value) };
			} catch (error: any) {
				return { issues: [{ message: error.message || "Validation failed" }] };
			}
		},
	},
});

const userSchema = createMockSchema((value: any) => {
	if (!value.name || !value.email) throw new Error("Missing fields");
	return value;
});

// --- Basic Validation ---

test("Basic Validation - validates request body with schema", async () => {
	using mockFetch = createFetchMock();
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"@post/users": { body: userSchema as any },
			},
		},
	});

	const validBody = { name: "John", email: "john@example.com" };
	await client("@post/users", { body: validBody });

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users",
		expect.objectContaining({ body: JSON.stringify(validBody) })
	);
});

test("Basic Validation - returns ValidationError for invalid request body", async () => {
	using _ignoredMockFetch = createFetchMock();
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"@post/users": { body: userSchema as any },
			},
		},
	});

	const result = await client("@post/users", {
		body: { name: "John" } as any,
		resultMode: "all",
	});

	expectErrorResult(result);
	expect(result.error.name).toBe("ValidationError");
});

test("Basic Validation - validates request headers", async () => {
	using mockFetch = createFetchMock();
	const headersSchema = createMockSchema((v) => v);
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"/users": { headers: headersSchema as any },
			},
		},
	});

	const headers = { "X-Custom": "value" };
	await client("/users", { headers });

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users",
		expect.objectContaining({
			headers: expect.objectContaining(headers),
		})
	);
});

test("Basic Validation - validates URL parameters", async () => {
	using mockFetch = createFetchMock();
	const paramsSchema = createMockSchema((v: any) => v);
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"/users/:id": { params: paramsSchema as any },
			},
		},
	});

	await client("/users/:id", { params: { id: "123" } });

	expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/users/123", expect.any(Object));
});

test("Basic Validation - validates query parameters", async () => {
	using mockFetch = createFetchMock();
	const querySchema = createMockSchema((v: any) => v);
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"/users": { query: querySchema as any },
			},
		},
	});

	await client("/users", { query: { page: "1" } });

	expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/users?page=1", expect.any(Object));
});

test("Basic Validation - validates response data", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"/users/1": { data: userSchema as any },
			},
		},
	});

	const result = await client("/users/1", { resultMode: "all" });
	expect(result.data).toEqual(mockUser);
});

test("Basic Validation - returns ValidationError for invalid response data", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess({ name: "John" });
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"/users/1": { data: userSchema as any },
			},
		},
	});

	const result = await client("/users/1", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.name).toBe("ValidationError");
});

// --- Advanced Validation ---

test("Advanced Validation - supports custom validator functions", async () => {
	using mockFetch = createFetchMock();
	const customValidator = vi.fn((data: any) => ({ ...data, validated: true }));

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"@post/users": { body: customValidator as any },
			},
		},
	});

	const body = { name: "John" };
	await client("@post/users", { method: "POST", body: body as any });

	expect(customValidator).toHaveBeenCalledWith(body);
	expect(mockFetch).toHaveBeenCalledWith(
		expect.any(String),
		expect.objectContaining({ body: JSON.stringify({ ...body, validated: true }) })
	);
});

test("Advanced Validation - supports async validator functions", async () => {
	using _ignoredMockFetch = createFetchMock();
	const asyncValidator = vi.fn(async (data: any) => {
		await new Promise((resolve) => setTimeout(resolve, 10));
		return { ...data, asyncValidated: true };
	});

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"@post/users": { body: asyncValidator as any },
			},
		},
	});

	const body = { name: "John" };
	await client("@post/users", { method: "POST", body: body as any });

	expect(asyncValidator).toHaveBeenCalledWith(body);
});

test("Advanced Validation - enforces strict mode for undefined routes", async () => {
	using _ignoredMockFetch = createFetchMock();
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			config: { strict: true },
			routes: {
				"/users": { data: () => ({}) },
			},
		},
	});

	const result = await client("/posts" as any, { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.name).toBe("ValidationError");
});

test("Advanced Validation - supports dynamic schema resolution", async () => {
	using _ignoredMockFetch = createFetchMock();
	const dynamicSchemaResolver = vi.fn(({ currentRouteSchema }) => ({
		...currentRouteSchema,
		body: (body: any) => ({ ...body, dynamic: true }),
	}));

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"/users": { headers: () => ({}) },
			},
		},
	});

	const body = { name: "John" };
	await client("/users", {
		method: "POST",
		body: body as any,
		schema: dynamicSchemaResolver as any,
	});

	expect(dynamicSchemaResolver).toHaveBeenCalled();
});

test("Advanced Validation - formats validation errors with detailed issues and paths", async () => {
	using _ignoredMockFetch = createFetchMock();
	const detailedSchema = createMockSchema(
		() => {
			throw new Error("Fail");
		},
		true,
		[
			{ message: "Name required", path: ["name"] },
			{ message: "Age invalid", path: ["profile", "age"] },
		]
	);

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		throwOnError: true,
		schema: {
			routes: {
				"@post/users": { body: detailedSchema as any },
			},
		},
	});

	try {
		await client("@post/users", { method: "POST", body: {} as any });
		expect.fail("Should have thrown");
	} catch (error: any) {
		expectValidationError(error);
		expect(error.message).toContain("Name required");
		expect(error.message).toContain("at name");
		expect(error.message).toContain("Age invalid");
		expect(error.message).toContain("at profile.age");
	}
});

test("Advanced Validation - disables runtime validation transform when configured", async () => {
	using mockFetch = createFetchMock();
	const transformingValidator = vi.fn((body: any) => ({ ...body, transformed: true }));

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			config: { disableRuntimeValidationTransform: true },
			routes: {
				"@post/users": { body: transformingValidator as any },
			},
		},
	});

	const body = { name: "John" };
	await client("@post/users", { method: "POST", body: body as any });

	expect(transformingValidator).toHaveBeenCalledWith(body);
	expect(mockFetch).toHaveBeenCalledWith(
		expect.any(String),
		expect.objectContaining({ body: JSON.stringify(body) })
	);
});

test("Advanced Validation - handles complex path structures in validation errors", async () => {
	using _ignoredMockFetch = createFetchMock();
	const complexPathSchema = createMockSchema(
		() => {
			throw new Error("Fail");
		},
		true,
		[
			{ message: "Array error", path: ["items", 0, "name"] },
			{ message: "Object error", path: [{ key: "user" }, { key: "profile" }, "email"] },
		]
	);

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		throwOnError: true,
		schema: {
			routes: {
				"@post/users": { body: complexPathSchema as any },
			},
		},
	});

	try {
		await client("@post/users", { method: "POST", body: {} as any });
		expect.fail("Should have thrown");
	} catch (error: any) {
		expectValidationError(error);
		expect(error.message).toContain("at items.0.name");
		expect(error.message).toContain("at user.profile.email");
	}
});

test("Advanced Validation - merges fallback and specific route schemas", async () => {
	using _ignoredMockFetch = createFetchMock();
	const fallbackValidator = vi.fn((v: any) => ({ ...v, fallback: true }));
	const specificValidator = vi.fn((v: any) => ({ ...v, specific: true }));

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"@default": { body: fallbackValidator as any },
				"@post/users": { body: specificValidator as any },
			},
		},
	});

	await client("@post/users", { method: "POST", body: { name: "John" } as any });
	expect(specificValidator).toHaveBeenCalled();
	expect(fallbackValidator).not.toHaveBeenCalled();

	await client("/posts", { method: "POST", body: { title: "Hello" } as any });
	expect(fallbackValidator).toHaveBeenCalled();
});

test("Advanced Validation - resolves correctly with prefix and method-scoped keys", async () => {
	using mockFetch = createFetchMock();
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			config: {
				prefix: "/api",
				baseURL: "https://api.com",
				strict: true,
			},
			routes: {
				"@get/users": { data: userSchema as any },
			},
		},
	});

	await client("@get/api/users");

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.com/users",
		expect.objectContaining({ method: "GET" })
	);
});

test("Advanced Validation - prioritizes prefix over baseURL match", async () => {
	using mockFetch = createFetchMock();
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			config: {
				prefix: "external",
				baseURL: "https://external-api.com",
			},
			routes: {
				"/users": { data: userSchema as any },
			},
		},
	});

	await client("external/users");

	expect(mockFetch).toHaveBeenCalledWith("https://external-api.com/users", expect.any(Object));
});
