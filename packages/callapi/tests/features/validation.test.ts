/**
 * Validation functionality tests - consolidated from validation-basic and validation-advanced
 * Tests request/response validation, schemas, and advanced validation logic
 */

import { expect, test, vi } from "vitest";
import { createFetchClient } from "../../src";
import type { StandardSchemaV1 } from "../../src/types/standard-schema";
import { expectErrorResult, expectValidationError } from "../test-setup/assertions";
import { createFetchMock, getHeadersFromCall, mockFetchSuccess } from "../test-setup/fetch-mock";
import { mockUser } from "../test-setup/fixtures";

const createMockSchema = (
	validator: (value: unknown) => unknown,
	shouldFail = false,
	// eslint-disable-next-line ts-eslint/no-explicit-any -- Ignore
	issues: any[] = []
) =>
	({
		"~standard": {
			vendor: "test",
			version: 1 as const,
			validate: (value) => {
				if (shouldFail) {
					return { issues };
				}

				try {
					return { value: validator(value) as never };
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : "Validation failed";
					return { issues: [{ message: errorMessage }] };
				}
			},
		},
	}) satisfies StandardSchemaV1;

const userSchema = createMockSchema((value: unknown) => {
	const data = value as Record<string, unknown>;

	if (!data.name || !data.email) {
		throw new Error("Missing fields");
	}

	return value;
});

// --- Basic Validation ---

test("Basic Validation - validates request body with schema", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess({});
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"@post/users": { body: userSchema },
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
	using ignoredMockFetch = createFetchMock();
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"@post/users": { body: userSchema },
			},
		},
	});

	const result = await client("@post/users", {
		body: { name: "John" },
		resultMode: "all",
	});

	expectErrorResult(result);
	expect(result.error.name).toBe("ValidationError");
});

test("Basic Validation - validates request headers", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess({});
	const headersSchema = createMockSchema((v) => v);
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"/users": { headers: headersSchema },
			},
		},
	});

	const headers = { "X-Custom": "value" };
	await client("/users", { headers });

	const requestHeaders = getHeadersFromCall(mockFetch);
	expect(requestHeaders).toEqual(expect.objectContaining({ "X-Custom": "value" }));
});

test("Basic Validation - validates URL parameters", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess({});
	const paramsSchema = createMockSchema((v: unknown) => v);
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"/users/:id": { params: paramsSchema },
			},
		},
	});

	await client("/users/:id", { params: { id: "123" } });

	expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/users/123", expect.any(Object));
});

test("Basic Validation - validates query parameters", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess({});
	const querySchema = createMockSchema((v: unknown) => v);
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"/users": { query: querySchema },
			},
		},
	});

	await client("/users", { query: { page: "1" } });

	expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/users?page=1", expect.any(Object));
});

test("Basic Validation - validates response data", async () => {
	using ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"/users/1": { data: userSchema },
			},
		},
	});

	const result = await client("/users/1", { resultMode: "all" });
	expect(result.data).toEqual(mockUser);
});

test("Basic Validation - returns ValidationError for invalid response data", async () => {
	using ignoredMockFetch = createFetchMock();
	mockFetchSuccess({ name: "John" });
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"/users/1": { data: userSchema },
			},
		},
	});

	const result = await client("/users/1", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.name).toBe("ValidationError");
});

test("Advanced Validation - supports custom validator functions", async () => {
	using mockFetch = createFetchMock();
	const customValidator = vi.fn((data: unknown) => ({ ...(data as object), validated: true }));

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"@post/users": { body: customValidator },
			},
		},
	});

	const body = { name: "John" };

	// @ts-expect-error -- ts(2345)
	await client("@post/users", { method: "POST", body });

	expect(customValidator).toHaveBeenCalledWith(body);
	expect(mockFetch).toHaveBeenCalledWith(
		expect.any(String),
		expect.objectContaining({ body: JSON.stringify({ ...body, validated: true }) })
	);
});

test("Advanced Validation - supports async validator functions", async () => {
	using ignoredMockFetch = createFetchMock();
	const asyncValidator = vi.fn(async (data: unknown) => {
		await new Promise((resolve) => setTimeout(resolve, 10));
		return { ...(data as object), asyncValidated: true };
	});

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"@post/users": { body: asyncValidator },
			},
		},
	});

	const body = { name: "John" };
	// @ts-expect-error -- ts(2345)

	await client("@post/users", { method: "POST", body });

	expect(asyncValidator).toHaveBeenCalledWith(body);
});

test("Advanced Validation - enforces strict mode for undefined routes", async () => {
	using ignoredMockFetch = createFetchMock();
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			config: { strict: true },
			routes: {
				"/users": { data: () => ({}) },
			},
		},
	});

	// @ts-expect-error -- ts(2345)
	const result = await client("/posts", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.name).toBe("ValidationError");
});

test("Advanced Validation - supports dynamic schema resolution", async () => {
	using ignoredMockFetch = createFetchMock();
	const dynamicSchemaResolver = vi.fn(({ currentRouteSchema }) => ({
		...currentRouteSchema,
		body: (body: unknown) => ({ ...(body as object), dynamic: true }),
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
		body,
		schema: dynamicSchemaResolver,
	});

	expect(dynamicSchemaResolver).toHaveBeenCalled();
});

test("Advanced Validation - formats validation errors with detailed issues and paths", async () => {
	using ignoredMockFetch = createFetchMock();
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
				"@post/users": { body: detailedSchema },
			},
		},
	});

	try {
		await client("@post/users", { method: "POST", body: {} });
		expect.fail("Should have thrown");
	} catch (error) {
		expectValidationError(error);
		const validationError = error as { message: string };
		expect(validationError.message).toContain("Name required");
		expect(validationError.message).toContain("at name");
		expect(validationError.message).toContain("Age invalid");
		expect(validationError.message).toContain("at profile.age");
	}
});

test("Advanced Validation - disables runtime validation transform when configured", async () => {
	using mockFetch = createFetchMock();
	const transformingValidator = vi.fn((body: unknown) => ({ ...(body as object), transformed: true }));

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			config: { disableRuntimeValidationTransform: true },
			routes: {
				"@post/users": { body: transformingValidator },
			},
		},
	});

	const body = { name: "John" };
	// @ts-expect-error -- ts(2345)
	await client("@post/users", { method: "POST", body });

	expect(transformingValidator).toHaveBeenCalledWith(body);
	expect(mockFetch).toHaveBeenCalledWith(
		expect.any(String),
		expect.objectContaining({ body: JSON.stringify(body) })
	);
});

test("Advanced Validation - handles complex path structures in validation errors", async () => {
	using ignoredMockFetch = createFetchMock();
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
				"@post/users": { body: complexPathSchema },
			},
		},
	});

	try {
		await client("@post/users", { method: "POST", body: {} });
		expect.fail("Should have thrown");
	} catch (error) {
		expectValidationError(error);
		const validationError = error as { message: string };
		expect(validationError.message).toContain("at items.0.name");
		expect(validationError.message).toContain("at user.profile.email");
	}
});

test("Advanced Validation - merges fallback and specific route schemas", async () => {
	using ignoredMockFetch = createFetchMock();
	const fallbackValidator = vi.fn((v: unknown) => ({ ...(v as object), fallback: true }));
	const specificValidator = vi.fn((v: unknown) => ({ ...(v as object), specific: true }));

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		schema: {
			routes: {
				"@default": { body: fallbackValidator },
				"@post/users": { body: specificValidator },
			},
		},
	});

	// @ts-expect-error -- ts(2345)
	await client("@post/users", { method: "POST", body: { name: "John" } });
	expect(specificValidator).toHaveBeenCalled();
	expect(fallbackValidator).not.toHaveBeenCalled();

	// @ts-expect-error -- ts(2345)
	await client("/posts", { method: "POST", body: { title: "Hello" } });
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
				"@get/users": { data: userSchema },
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
				"/users": { data: userSchema },
			},
		},
	});

	await client("external/users");

	expect(mockFetch).toHaveBeenCalledWith("https://external-api.com/users", expect.any(Object));
});
