/**
 * Validation system tests
 * Tests request/response validation, custom validators, async validation,
 * strict mode, schema merging, and error formatting
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFetchClient } from "../src";
import { ValidationError } from "../src/error";
import type { StandardSchemaV1 } from "../src/types/standard-schema";
import { createMockResponse, expectErrorResult, expectValidationError } from "./helpers";
import { mockFetch } from "./setup";

// Mock schemas using Standard Schema interface
const createMockSchema = <TInput, TOutput = TInput>(
	validator: (value: unknown) => TOutput,
	shouldFail = false,
	issues: StandardSchemaV1.Issue[] = []
): StandardSchemaV1<TInput, TOutput> => ({
	"~standard": {
		vendor: "test",
		version: 1,
		validate: (value: unknown) => {
			if (shouldFail) {
				return { issues };
			}
			try {
				const result = validator(value);
				return { value: result };
			} catch (error) {
				return {
					issues: [{ message: error instanceof Error ? error.message : "Validation failed" }],
				};
			}
		},
	},
});

// Simple user schema for testing
const userSchema = createMockSchema<{ name: string; email: string }>((value) => {
	if (!value || typeof value !== "object") {
		throw new Error("Must be an object");
	}
	const obj = value as Record<string, unknown>;
	if (!obj.name || typeof obj.name !== "string") {
		throw new Error("Name is required and must be a string");
	}
	if (!obj.email || typeof obj.email !== "string" || !obj.email.includes("@")) {
		throw new Error("Email is required and must be valid");
	}
	return { name: obj.name, email: obj.email };
});

// Schema that always fails
const failingSchema = createMockSchema(
	() => {
		throw new Error("Always fails");
	},
	true,
	[{ message: "Validation failed", path: ["field"] }]
);

// Schema for headers validation
const headersSchema = createMockSchema<Record<string, string>>((value) => {
	if (!value || typeof value !== "object") {
		return {};
	}
	const headers = value as Record<string, unknown>;
	const result: Record<string, string> = {};
	for (const [key, val] of Object.entries(headers)) {
		if (typeof val === "string") {
			result[key] = val;
		}
	}
	return result;
});

// Schema for query parameters
const querySchema = createMockSchema<Record<string, string | number>>((value) => {
	if (!value || typeof value !== "object") {
		return {};
	}
	const query = value as Record<string, unknown>;
	const result: Record<string, string | number> = {};
	for (const [key, val] of Object.entries(query)) {
		if (typeof val === "string" || typeof val === "number") {
			result[key] = val;
		}
	}
	return result;
});

describe("Validation System", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockResolvedValue(createMockResponse({ success: true }));
	});

	describe("Request Validation", () => {
		describe("Body Validation", () => {
			it("should validate request body with schema", async () => {
				const client = createFetchClient({
					baseURL: "https://api.example.com",
					schema: {
						routes: {
							"/users": {
								body: userSchema,
							},
						},
					},
				});

				const validBody = { name: "John", email: "john@example.com" };
				await client("/users", { method: "POST", body: validBody });

				expect(mockFetch).toHaveBeenCalledWith(
					"https://api.example.com/users",
					expect.objectContaining({
						method: "POST",
						body: JSON.stringify(validBody),
					})
				);
			});

			it("should return ValidationError for invalid request body", async () => {
				const client = createFetchClient({
					baseURL: "https://api.example.com",
					schema: {
						routes: {
							"/users": {
								body: userSchema,
							},
						},
					},
				});

				const invalidBody = { name: "John" } as any; // Missing email

				const result = await client("/users", {
					method: "POST",
					body: invalidBody,
					resultMode: "all",
				});

				expectErrorResult(result);
				expect(result.error.name).toBe("ValidationError");
				expect(result.error.message).toContain("Email is required and must be valid");
			});

			it("should throw ValidationError for invalid request body when throwOnError is true", async () => {
				const client = createFetchClient({
					baseURL: "https://api.example.com",
					throwOnError: true,
					schema: {
						routes: {
							"/users": {
								body: userSchema,
							},
						},
					},
				});

				const invalidBody = { name: "John" } as any; // Missing email

				await expect(client("/users", { method: "POST", body: invalidBody })).rejects.toThrow(
					ValidationError
				);
			});

			it("should handle body validation with custom validator function", async () => {
				const customValidator = vi.fn((body: unknown) => {
					if (!body || typeof body !== "object") {
						throw new Error("Body must be an object");
					}
					return body;
				});

				const client = createFetchClient({
					baseURL: "https://api.example.com",
					schema: {
						routes: {
							"/users": {
								body: customValidator,
							},
						},
					},
				});

				const validBody = { name: "John", email: "john@example.com" };
				await client("/users", { method: "POST", body: validBody });

				expect(customValidator).toHaveBeenCalledWith(validBody);
				expect(mockFetch).toHaveBeenCalled();
			});
		});

		describe("Headers Validation", () => {
			it("should validate request headers", async () => {
				const client = createFetchClient({
					baseURL: "https://api.example.com",
					schema: {
						routes: {
							"/users": {
								headers: headersSchema,
							},
						},
					},
				});

				const headers = { "Content-Type": "application/json", "X-Custom": "value" };
				await client("/users", { headers });

				expect(mockFetch).toHaveBeenCalledWith(
					"https://api.example.com/users",
					expect.objectContaining({
						headers: expect.objectContaining(headers),
					})
				);
			});

			it("should return ValidationError for invalid headers", async () => {
				const invalidHeadersSchema = createMockSchema(
					() => {
						throw new Error("Invalid headers");
					},
					true,
					[{ message: "Invalid headers" }]
				);

				const client = createFetchClient({
					baseURL: "https://api.example.com",
					schema: {
						routes: {
							"/users": {
								headers: invalidHeadersSchema as any,
							},
						},
					},
				});

				const result = await client("/users", { headers: { invalid: "header" }, resultMode: "all" });

				expectErrorResult(result);
				expect(result.error.name).toBe("ValidationError");
				expect(result.error.message).toContain("Invalid headers");
			});
		});

		describe("Parameters Validation", () => {
			it("should validate URL parameters", async () => {
				const paramsSchema = createMockSchema<{ id: string }>((value) => {
					if (!value || typeof value !== "object") {
						throw new Error("Params must be an object");
					}
					const params = value as Record<string, unknown>;
					if (!params.id || typeof params.id !== "string") {
						throw new Error("ID is required");
					}
					return { id: params.id };
				});

				const client = createFetchClient({
					baseURL: "https://api.example.com",
					schema: {
						routes: {
							"/users/:id": {
								params: paramsSchema,
							},
						},
					},
				});

				await client("/users/:id", { params: { id: "123" } });

				expect(mockFetch).toHaveBeenCalledWith(
					"https://api.example.com/users/123",
					expect.any(Object)
				);
			});

			it("should return ValidationError for invalid parameters", async () => {
				const paramsSchema = createMockSchema(
					() => {
						throw new Error("Invalid params");
					},
					true,
					[{ message: "Invalid params", path: ["id"] }]
				);

				const client = createFetchClient({
					baseURL: "https://api.example.com",
					schema: {
						routes: {
							"/users/:id": {
								params: paramsSchema as any,
							},
						},
					},
				});

				const result = await client("/users/:id", { params: { id: null } as any, resultMode: "all" });

				expectErrorResult(result);
				expect(result.error.name).toBe("ValidationError");
				expect(result.error.message).toContain("Invalid params");
			});
		});

		describe("Query Validation", () => {
			it("should validate query parameters", async () => {
				const client = createFetchClient({
					baseURL: "https://api.example.com",
					schema: {
						routes: {
							"/users": {
								query: querySchema,
							},
						},
					},
				});

				const query = { page: 1, limit: 10, search: "john" };
				await client("/users", { query });

				expect(mockFetch).toHaveBeenCalledWith(
					"https://api.example.com/users?page=1&limit=10&search=john",
					expect.any(Object)
				);
			});

			it("should return ValidationError for invalid query parameters", async () => {
				const invalidQuerySchema = createMockSchema(
					() => {
						throw new Error("Invalid query");
					},
					true,
					[{ message: "Invalid query parameters" }]
				);

				const client = createFetchClient({
					baseURL: "https://api.example.com",
					schema: {
						routes: {
							"/users": {
								query: invalidQuerySchema as any,
							},
						},
					},
				});

				const result = await client("/users", { query: { invalid: true }, resultMode: "all" });

				expectErrorResult(result);
				expect(result.error.name).toBe("ValidationError");
				expect(result.error.message).toContain("Invalid query parameters");
			});
		});
	});

	describe("Response Validation", () => {
		describe("Data Validation", () => {
			it("should validate response data", async () => {
				const responseData = { id: 1, name: "John", email: "john@example.com" };
				mockFetch.mockResolvedValue(createMockResponse(responseData));

				const client = createFetchClient({
					baseURL: "https://api.example.com",
					schema: {
						routes: {
							"/users/1": {
								data: userSchema,
							},
						},
					},
				});

				const result = await client("/users/1", { resultMode: "all" });
				expect(result.data).toEqual({ name: "John", email: "john@example.com" });
			});

			it("should return ValidationError for invalid response data", async () => {
				const invalidResponseData = { id: 1, name: "John" }; // Missing email
				mockFetch.mockResolvedValue(createMockResponse(invalidResponseData));

				const client = createFetchClient({
					baseURL: "https://api.example.com",
					schema: {
						routes: {
							"/users/1": {
								data: userSchema,
							},
						},
					},
				});

				const result = await client("/users/1", { resultMode: "all" });

				expectErrorResult(result);
				expect(result.error.name).toBe("ValidationError");
				expect(result.error.message).toContain("Email is required and must be valid");
			});
		});

		describe("Error Data Validation", () => {
			it("should validate error response data", async () => {
				const errorData = { code: "NOT_FOUND", message: "User not found" };
				mockFetch.mockResolvedValue(createMockResponse(errorData, 404));

				const errorSchema = createMockSchema<{ code: string; message: string }>((value) => {
					if (!value || typeof value !== "object") {
						throw new Error("Error data must be an object");
					}
					const obj = value as Record<string, unknown>;
					if (!obj.code || !obj.message) {
						throw new Error("Code and message are required");
					}
					return { code: obj.code as string, message: obj.message as string };
				});

				const client = createFetchClient({
					baseURL: "https://api.example.com",
					schema: {
						routes: {
							"/users/999": {
								errorData: errorSchema,
							},
						},
					},
					throwOnError: false,
				});

				const result = await client("/users/999", { resultMode: "all" });
				expect(result.error?.errorData).toEqual(errorData);
			});

			it("should return ValidationError for invalid error data", async () => {
				const invalidErrorData = { code: "ERROR" }; // Missing message
				mockFetch.mockResolvedValue(createMockResponse(invalidErrorData, 400));

				const errorSchema = createMockSchema(
					() => {
						throw new Error("Invalid error data");
					},
					true,
					[{ message: "Invalid error data structure" }]
				);

				const client = createFetchClient({
					baseURL: "https://api.example.com",
					schema: {
						routes: {
							"/users": {
								errorData: errorSchema,
							},
						},
					},
					throwOnError: false,
				});

				const result = await client("/users", { resultMode: "all" } as any);

				expectErrorResult(result);
				expect((result as any).error.name).toBe("ValidationError");
				expect((result as any).error.message).toContain("Invalid error data structure");
			});
		});
	});

	describe("Custom Validator Functions", () => {
		it("should support custom validator functions", async () => {
			const customValidator = vi.fn((data: unknown) => {
				if (!data || typeof data !== "object") {
					throw new Error("Data must be an object");
				}
				const obj = data as Record<string, unknown>;
				return { ...obj, validated: true };
			});

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					routes: {
						"/users": {
							body: customValidator,
						},
					},
				},
			});

			const body = { name: "John", email: "john@example.com" };
			await client("/users", { method: "POST", body: body as any });

			expect(customValidator).toHaveBeenCalledWith(body);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users",
				expect.objectContaining({
					body: JSON.stringify({ ...body, validated: true }),
				})
			);
		});

		it("should return ValidationError for custom validator function errors", async () => {
			const customValidator = vi.fn((data: unknown): any => {
				throw new Error("Custom validation failed");
			});

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					routes: {
						"/users": {
							body: customValidator,
						},
					},
				},
			});

			const result = await client("/users", {
				method: "POST",
				body: { name: "John" } as any,
				resultMode: "all",
			});

			expectErrorResult(result);
			expect(result.error.name).toBe("ValidationError");
			expect(result.error.message).toContain("Custom validation failed");
			expect(customValidator).toHaveBeenCalled();
		});

		it("should support custom validator functions for response data", async () => {
			const responseData = { id: 1, name: "John" };
			mockFetch.mockResolvedValue(createMockResponse(responseData));

			const customValidator = vi.fn((data: unknown) => {
				return { ...(data as object), processed: true };
			});

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					routes: {
						"/users/1": {
							data: customValidator,
						},
					},
				},
			});

			const result = await client("/users/1", { resultMode: "all" });
			expect(customValidator).toHaveBeenCalledWith(responseData);
			expect(result.data).toEqual({ ...responseData, processed: true });
		});
	});

	describe("Async Validation Support", () => {
		it("should support async validator functions", async () => {
			const asyncValidator = vi.fn(async (data: unknown) => {
				// Simulate async validation (e.g., database lookup)
				await new Promise((resolve) => setTimeout(resolve, 10));

				if (!data || typeof data !== "object") {
					throw new Error("Data must be an object");
				}
				return { ...data, asyncValidated: true };
			});

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					routes: {
						"/users": {
							body: asyncValidator,
						},
					},
				},
			});

			const body = { name: "John", email: "john@example.com" };
			await client("/users", { method: "POST", body: body as any });

			expect(asyncValidator).toHaveBeenCalledWith(body);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users",
				expect.objectContaining({
					body: JSON.stringify({ ...body, asyncValidated: true }),
				})
			);
		});

		it("should return ValidationError for async validator function errors", async () => {
			const asyncValidator = vi.fn(async (data: unknown): Promise<any> => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				throw new Error("Async validation failed");
			});

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					routes: {
						"/users": {
							body: asyncValidator,
						},
					},
				},
			});

			const result = await client("/users", {
				method: "POST",
				body: { name: "John" } as any,
				resultMode: "all",
			});

			expectErrorResult(result);
			expect(result.error.name).toBe("ValidationError");
			expect(result.error.message).toContain("Async validation failed");
			expect(asyncValidator).toHaveBeenCalled();
		});

		it("should support async standard schema validation", async () => {
			const asyncSchema: StandardSchemaV1<{ name: string }> = {
				"~standard": {
					vendor: "test",
					version: 1,
					validate: async (value: unknown) => {
						// Simulate async validation
						await new Promise((resolve) => setTimeout(resolve, 10));

						if (!value || typeof value !== "object") {
							return { issues: [{ message: "Must be an object" }] };
						}
						const obj = value as Record<string, unknown>;
						if (!obj.name) {
							return { issues: [{ message: "Name is required" }] };
						}
						return { value: { name: obj.name as string } };
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					routes: {
						"/users": {
							body: asyncSchema,
						},
					},
				},
			});

			const body = { name: "John" };
			await client("/users", { method: "POST", body });

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users",
				expect.objectContaining({
					body: JSON.stringify(body),
				})
			);
		});
	});

	describe("Strict Mode Enforcement", () => {
		it("should allow requests to undefined routes when strict mode is disabled", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					config: { strict: false },
					routes: {
						"/users": { body: userSchema },
					},
				},
			});

			// Request to undefined route should work
			await client("/posts");
			expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/posts", expect.any(Object));
		});

		it("should return ValidationError for undefined routes when strict mode is enabled", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					config: { strict: true },
					routes: {
						"/users": { body: userSchema },
					},
				},
			});

			// Request to undefined route should fail
			const result = await client("/posts" as any, { resultMode: "all" });

			expectErrorResult(result);
			expect(result.error.name).toBe("ValidationError");
			expect(result.error.message).toContain("Strict Mode");
			expect(result.error.message).toContain("/posts");
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should allow requests to defined routes when strict mode is enabled", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					config: { strict: true },
					routes: {
						"/users": { body: userSchema },
					},
				},
			});

			// Request to defined route should work
			await client("/users", { method: "POST", body: { name: "John", email: "john@example.com" } });
			expect(mockFetch).toHaveBeenCalled();
		});

		it("should validate strict mode error message format", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				throwOnError: true,
				schema: {
					config: { strict: true },
					routes: {
						"/users": { body: userSchema },
					},
				},
			});

			try {
				await client("/posts" as any);
				expect.fail("Should have thrown ValidationError");
			} catch (error) {
				expectValidationError(error);
				expect(error.message).toContain("Strict Mode");
				expect(error.message).toContain("/posts");
			}
		});
	});

	describe("Schema Merging and Inheritance", () => {
		it("should merge fallback route schema with specific route schema", async () => {
			const fallbackBodyValidator = vi.fn((body: unknown) => ({ ...(body as object), fallback: true }));
			const specificBodyValidator = vi.fn((body: unknown) => ({ ...(body as object), specific: true }));

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					routes: {
						".": {
							// Fallback route
							body: fallbackBodyValidator,
							headers: headersSchema,
						},
						"/users": {
							body: specificBodyValidator, // Should override fallback
						},
					},
				},
			});

			const body = { name: "John", email: "john@example.com" };
			const headers = { "Content-Type": "application/json" };

			await client("/users", { method: "POST", body: body as any, headers });

			// Specific validator should be called, not fallback
			expect(specificBodyValidator).toHaveBeenCalledWith(body);
			expect(fallbackBodyValidator).not.toHaveBeenCalled();

			// Headers from fallback should still be validated
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users",
				expect.objectContaining({
					body: JSON.stringify({ ...body, specific: true }),
					headers: expect.objectContaining(headers),
				})
			);
		});

		it("should use fallback schema when specific route schema is not defined", async () => {
			const fallbackValidator = vi.fn((body: unknown) => ({ ...(body as object), fallback: true }));

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					routes: {
						".": {
							// Fallback route
							body: fallbackValidator,
						},
					},
				},
			});

			const body = { name: "John", email: "john@example.com" };
			await client("/posts", { method: "POST", body: body as any });

			expect(fallbackValidator).toHaveBeenCalledWith(body);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/posts",
				expect.objectContaining({
					body: JSON.stringify({ ...body, fallback: true }),
				})
			);
		});

		it("should support dynamic schema resolution", async () => {
			const dynamicSchemaResolver = vi.fn(({ currentRouteSchema }) => ({
				...currentRouteSchema,
				body: (body: unknown) => ({ ...(body as object), dynamic: true }),
			}));

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					routes: {
						"/users": { headers: headersSchema },
					},
				},
			});

			const body = { name: "John", email: "john@example.com" };
			await client("/users", {
				method: "POST",
				body,
				schema: dynamicSchemaResolver,
			});

			expect(dynamicSchemaResolver).toHaveBeenCalledWith({
				baseSchemaRoutes: { "/users": { headers: headersSchema } },
				currentRouteSchema: { headers: headersSchema },
			});

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users",
				expect.objectContaining({
					body: JSON.stringify({ ...body, dynamic: true }),
				})
			);
		});
	});

	describe("Validation Error Formatting", () => {
		it("should format validation errors with detailed issues", async () => {
			const schemaWithDetailedErrors = createMockSchema<any>(
				() => {
					throw new Error("Validation failed");
				},
				true,
				[
					{ message: "Name is required", path: ["name"] },
					{ message: "Email must be valid", path: ["email"] },
					{ message: "Age must be a number", path: ["profile", "age"] },
				]
			);

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				throwOnError: true,
				schema: {
					routes: {
						"/users": {
							body: schemaWithDetailedErrors,
						},
					},
				},
			});

			try {
				await client("/users", { method: "POST", body: { invalid: "data" } });
				expect.fail("Should have thrown ValidationError");
			} catch (error) {
				expectValidationError(error);

				// Check that error message contains all issues
				expect(error.message).toContain("Name is required");
				expect(error.message).toContain("Email must be valid");
				expect(error.message).toContain("Age must be a number");

				// Check that paths are formatted correctly
				expect(error.message).toContain("at name");
				expect(error.message).toContain("at email");
				expect(error.message).toContain("at profile.age");

				// Check error data structure
				expect(error.errorData).toHaveLength(3);
				expect(error.errorData[0]).toEqual({
					message: "Name is required",
					path: ["name"],
				});
				expect(error.errorData[2]).toEqual({
					message: "Age must be a number",
					path: ["profile", "age"],
				});
			}
		});

		it("should handle validation errors without paths", async () => {
			const schemaWithoutPaths = createMockSchema<any>(
				() => {
					throw new Error("Validation failed");
				},
				true,
				[{ message: "General validation error" }, { message: "Another error without path" }]
			);

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				throwOnError: true,
				schema: {
					routes: {
						"/users": {
							body: schemaWithoutPaths,
						},
					},
				},
			});

			try {
				await client("/users", { method: "POST", body: { invalid: "data" } });
				expect.fail("Should have thrown ValidationError");
			} catch (error) {
				expectValidationError(error);

				expect(error.message).toContain("General validation error");
				expect(error.message).toContain("Another error without path");
				expect(error.message).not.toContain(" → at ");
			}
		});

		it("should handle complex path structures in validation errors", async () => {
			const schemaWithComplexPaths = createMockSchema<any>(
				() => {
					throw new Error("Validation failed");
				},
				true,
				[
					{ message: "Array item error", path: ["items", 0, "name"] },
					{ message: "Nested object error", path: [{ key: "user" }, { key: "profile" }, "email"] },
				]
			);

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				throwOnError: true,
				schema: {
					routes: {
						"/users": {
							body: schemaWithComplexPaths,
						},
					},
				},
			});

			try {
				await client("/users", { method: "POST", body: { invalid: "data" } });
				expect.fail("Should have thrown ValidationError");
			} catch (error) {
				expectValidationError(error);

				expect(error.message).toContain("at items.0.name");
				expect(error.message).toContain("at user.profile.email");
			}
		});
	});

	describe("Schema Configuration Options", () => {
		it("should disable runtime validation when configured", async () => {
			const validator = vi.fn(() => ({ validated: true }));

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					config: { disableRuntimeValidation: true },
					routes: {
						"/users": {
							body: validator,
						},
					},
				},
			});

			const body = { name: "John", email: "john@example.com" };
			await client("/users", { method: "POST", body: body as any });

			// Validator should not be called when runtime validation is disabled
			expect(validator).not.toHaveBeenCalled();
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users",
				expect.objectContaining({
					body: JSON.stringify(body), // Original body, not validated
				})
			);
		});

		it("should disable validation output application when configured", async () => {
			const transformingValidator = vi.fn((body: unknown) => ({
				...(body as object),
				transformed: true,
			}));

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					config: { disableValidationOutputApplication: true },
					routes: {
						"/users": {
							body: transformingValidator,
						},
					},
				},
			});

			const body = { name: "John", email: "john@example.com" };
			await client("/users", { method: "POST", body: body as any });

			// Validator should be called for validation
			expect(transformingValidator).toHaveBeenCalledWith(body);

			// But original body should be used, not transformed
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users",
				expect.objectContaining({
					body: JSON.stringify(body), // Original body, not transformed
				})
			);
		});

		it("should handle schema config prefix and baseURL", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					config: {
						prefix: "/api/v1",
						baseURL: "https://api.example.com/api/v1",
					},
					routes: {
						"/users": {
							body: userSchema,
						},
					},
				},
			});

			const body = { name: "John", email: "john@example.com" };
			await client("/api/v1/users", { method: "POST", body });

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/api/v1/users",
				expect.any(Object)
			);
		});
	});

	describe("Integration with Other Features", () => {
		it("should work with result modes", async () => {
			const responseData = { id: 1, name: "John", email: "john@example.com" };
			mockFetch.mockResolvedValue(createMockResponse(responseData));

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					routes: {
						"/users/1": {
							data: userSchema,
						},
					},
				},
			});

			const result = await client("/users/1", { resultMode: "all" });

			expect(result.data).toEqual({ name: "John", email: "john@example.com" });
			expect(result.error).toBeNull();
			expect(result.response).toBeDefined();
		});

		it("should work with error handling", async () => {
			const errorData = { code: "VALIDATION_ERROR", message: "Invalid data" };
			mockFetch.mockResolvedValue(createMockResponse(errorData, 400));

			const errorSchema = createMockSchema<{ code: string; message: string }>((value) => {
				const obj = value as Record<string, unknown>;
				return { code: obj.code as string, message: obj.message as string };
			});

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				schema: {
					routes: {
						"/users": {
							errorData: errorSchema,
						},
					},
				},
				throwOnError: false,
			});

			const result = await client("/users", { resultMode: "all" });

			expect(result.error?.errorData).toEqual(errorData);
			expect(result.data).toBeNull();
		});
	});
});
