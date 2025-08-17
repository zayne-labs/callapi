/**
 * Validation schema tests
 * Tests request/response validation, error handling, and schema resolution
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { email, z } from "zod";
import { createFetchClient } from "../src/createFetchClient";
import { defineSchema } from "../src/defineHelpers";
import { ValidationError } from "../src/error";
import { mockBaseConfig, mockUser } from "./fixtures";
import { createMockErrorResponse, createMockResponse, expectSuccessResult } from "./helpers";
import { mockFetch } from "./setup";

describe("Validation", () => {
	beforeEach(() => {
		mockFetch.mockClear();
	});

	describe("Request Validation", () => {
		it("should validate request body against schema", async () => {
			const schema = defineSchema({
				"/users": {
					body: z.object({
						email: z.email("Invalid email"),
						name: z.string().min(1, "Name is required"),
						password: z.string().min(8, "Password must be at least 8 characters"),
					}),
				},
			});

			const client = createFetchClient({
				...mockBaseConfig,
				schema,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser, 201));

			// Valid request
			const validUser = {
				email: "test@example.com",
				name: "Test User",
				password: "secure123",
			};

			const result = await client("/users", {
				body: validUser,
				method: "POST",
			});

			expectSuccessResult(result);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("should validate request query parameters", async () => {
			const schema = defineSchema({
				"/users": {
					query: z.object({
						limit: z.string().regex(/^\d+$/).transform(Number).default(10),
						page: z.string().regex(/^\d+$/).transform(Number),
						sort: z.enum(["asc", "desc"]).optional(),
					}),
				},
			});

			const client = createFetchClient({
				...mockBaseConfig,
				schema,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse([mockUser]));

			const result = await client("/users?page=1&limit=5&sort=desc");

			expectSuccessResult(result);
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("page=1&limit=5&sort=desc"),
				expect.any(Object)
			);
		});

		it("should validate request headers", async () => {
			const schema = defineSchema({
				"/secure": {
					headers: z.object({
						authorization: z.string().startsWith("Bearer "),
					}),
				},
			});

			const client = createFetchClient({
				...mockBaseConfig,
				schema,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

			const result = await client("/secure", {
				headers: {
					authorization: "Bearer token123",
				},
			});

			expectSuccessResult(result);
		});
	});

	describe("Response Validation", () => {
		it("should validate successful response data", async () => {
			const schema = defineSchema({
				"/users/:id": {
					data: z.object({
						createdAt: z.iso.datetime(),
						email: z.email(),
						id: z.number(),
						name: z.string(),
					}),
				},
			});

			const client = createFetchClient({
				...mockBaseConfig,
				schema,
			});

			const mockUserData = {
				createdAt: new Date().toISOString(),
				email: "test@example.com",
				id: 1,
				name: "Test User",
			};

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUserData));

			const result = await client("/users/1");

			expectSuccessResult(result);
			expect(result.data).toMatchObject(mockUserData);
		});

		it("should validate error response data", async () => {
			const schema = defineSchema({
				"/users/:id": {
					errorData: z.object({
						code: z.string(),
						details: z.record(z.string(), z.unknown()).optional(),
						message: z.string(),
					}),
				},
			});

			const client = createFetchClient({
				...mockBaseConfig,
				schema,
			});

			const errorResponse = {
				code: "USER_NOT_FOUND",
				details: { userId: 999 },
				message: "User not found",
			};

			mockFetch.mockResolvedValueOnce(createMockErrorResponse(errorResponse, 404));

			await expect(client("/users/999")).rejects.toThrow(Error);
		});
	});

	describe("Schema Resolution", () => {
		it("should handle route parameters", async () => {
			const schema = defineSchema({
				"/users/:id": {
					params: z.object({
						id: z.string(),
					}),
				},
			});

			const client = createFetchClient({
				...mockBaseConfig,
				schema,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

			await client("/users/123");

			expect(mockFetch).toHaveBeenCalled();
		});

		it("should handle route configuration", async () => {
			const schema = defineSchema({
				"/users": {
					body: z.object({
						name: z.string(),
					}),
				},
			});

			const client = createFetchClient({
				...mockBaseConfig,
				schema,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

			await client("/users", {
				body: { name: "Test" },
				method: "POST",
			});

			expect(mockFetch).toHaveBeenCalled();
		});
	});

	describe("Error Handling", () => {
		it("should throw ValidationError for invalid request data", async () => {
			const schema = defineSchema({
				"/users": {
					body: z.object({
						email: z.email("Invalid email"),
						password: z.string().min(8, "Password too short"),
					}),
				},
			});

			const client = createFetchClient({
				...mockBaseConfig,
				schema,
			});

			// Invalid request - missing required fields
			await expect(
				client("/users", {
					body: { email: "invalid-email", password: "short" },
					method: "POST",
				})
			).rejects.toThrow(ValidationError);
		});

		it("should include validation details in error", async () => {
			const schema = defineSchema({
				"/users": {
					body: z.object({
						age: z.number().min(18, "Must be 18 or older"),
						email: z.email("Invalid email"),
					}),
				},
			});

			const client = createFetchClient({
				...mockBaseConfig,
				schema,
			});

			try {
				await client("/users", {
					body: { age: 16, email: "invalid-email" },
					method: "POST",
				});
				expect.fail("Should have thrown ValidationError");
			} catch (error) {
				expect(error).toBeInstanceOf(ValidationError);
				const validationError = error as ValidationError;
				expect(validationError.message).toContain("Invalid email");
				expect(validationError.message).toContain("Must be 18 or older");
			}
		});
	});

	describe("Runtime Configuration", () => {
		it("should handle valid requests with proper schema", async () => {
			const schema = defineSchema({
				"/users": {
					body: z.object({
						email: z.email("Invalid email format"),
						name: z.string().min(1, "Name is required"),
						password: z.string().min(8, "Password must be at least 8 characters"),
					}),
				},
			});

			const client = createFetchClient({
				...mockBaseConfig,
				schema,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

			// This would fail validation if strict validation was enabled
			const result = await client("/users", {
				body: { email: "test@example.com", name: "Test", password: "password123" },
				method: "POST",
			});

			expectSuccessResult(result);
		});

		it("should handle function-based schemas", async () => {
			const schema = defineSchema({
				"/users/:id": {
					data: (data) => z.object({ id: z.string(), name: z.string() }).parse(data),
				},
			});

			const client = createFetchClient({
				...mockBaseConfig,
				schema,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse({ id: "123", name: "Test User" }));

			const result = await client("/users/123");
			expectSuccessResult(result);
			expect(result.data).toEqual({ id: "123", name: "Test User" });
		});
	});

	describe("Error Handling", () => {
		it("should throw ValidationError for invalid request data", async () => {
			const schema = defineSchema({
				"/users": {
					body: z.object({
						email: z.email("Invalid email"),
						password: z.string().min(8, "Password too short"),
					}),
				},
			});

			const client = createFetchClient({
				...mockBaseConfig,
				schema,
			});

			// Invalid request - missing required fields
			await expect(
				client("/users", {
					body: { email: "invalid-email", password: "short" },
					method: "POST",
				})
			).rejects.toThrow(ValidationError);
		});

		it("should include validation details in error", async () => {
			const schema = defineSchema({
				"/users": {
					body: z.object({
						email: z.email("Invalid email format"),
						name: z.string().min(1, "Name is required"),
						password: z.string().min(8, "Password must be at least 8 characters"),
					}),
				},
			});

			const client = createFetchClient({
				...mockBaseConfig,
				schema,
			});

			const invalidUser = {
				email: "invalid-email",
				name: "Test User",
				password: "short",
			};

			try {
				await client("/users", {
					body: invalidUser,
					method: "POST",
				});
				expect.fail("Should have thrown ValidationError");
			} catch (error) {
				expect(error).toBeInstanceOf(ValidationError);
				const validationError = error as ValidationError;
				expect(validationError.message).toContain("Invalid email format");
				expect(validationError.message).toContain("Password must be at least 8 characters");
			}
		});
	});

	describe("Response Validation", () => {
		beforeEach(() => {
			mockFetch.mockClear();
		});

		it("should validate successful response against schema", async () => {
			const schema = defineSchema({
				"/users/:id": {
					data: z.object({
						active: z.boolean(),
						createdAt: z.string(),
						email: z.email(),
						id: z.number(),
						name: z.string(),
					}),
				},
			});

			const client = createFetchClient({
				...mockBaseConfig,
				schema,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const result = await client("/users/1");
			expectSuccessResult(result);
			expect(result.data).toMatchObject(mockUser);
		});

		it("should handle schema extension", async () => {
			// Create a schema with an extended set of fields
			const extendedSchema = defineSchema({
				"/users": {
					body: z.object({
						email: z.email(),
						extraField: z.string().optional(),
						name: z.string().min(1),
						password: z.string().min(8),
					}),
				},
			});

			const client = createFetchClient({
				...mockBaseConfig,
				schema: extendedSchema,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

			// Test with all required fields including the optional extraField
			const userData = {
				email: "test@example.com",
				extraField: "additional data",
				name: "Test User",
				password: "password123",
			};

			const result = await client("/users", {
				body: userData,
				method: "POST",
			});

			expectSuccessResult(result);
		});
	});

	describe("Error Handling", () => {
		it("should call onError hook when validation fails", async () => {
			const onError = vi.fn();
			const schema = defineSchema({
				"/users": {
					body: z.object({
						email: z.email("Invalid email format"),
						name: z.string().min(1, "Name is required"),
						password: z.string().min(8, "Password must be at least 8 characters"),
					}),
				},
			});

			const client = createFetchClient({
				...mockBaseConfig,
				onError,
				schema,
			});

			// Invalid user data (missing required fields)
			const invalidUser = {
				name: "Test User",
				// Missing email and password
			};

			try {
				await client("/users", {
					// @ts-expect-error -- Error is expected
					body: invalidUser,
					method: "POST",
				});
				expect.fail("Should have thrown ValidationError");
			} catch (error) {
				expect(error).toBeInstanceOf(ValidationError);
				const validationError = error as ValidationError;
				expect(validationError.message).toContain("Invalid email format");
				expect(validationError.message).toContain("Password must be at least 8 characters");
				expect(onError).toHaveBeenCalledWith(
					expect.objectContaining({
						message: expect.stringContaining("Validation"),
					})
				);
			}
		});
	});
});

describe("Strict Mode", () => {
	it("should reject undefined routes when strict mode is enabled", async () => {
		// Create a schema with strict mode enabled
		const schema = defineSchema(
			{
				"/defined-route": {
					data: z.object({ success: z.boolean() }),
				},
			},
			{ strict: true }
		);

		const client = createFetchClient({
			...mockBaseConfig,
			schema,
		});

		// Test that undefined route throws with the expected error message
		const promise = client("/undefined-route" as "/defined-route");
		await expect(promise).rejects.toThrow("Strict Mode - No schema found for route '/undefined-route'");

		// Test that defined route works as expected
		mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));
		const result = await client("/defined-route");
		expectSuccessResult(result as never);
		expect(result.data).toEqual({ success: true });
	});

	it("should allow all routes when strict mode is disabled", async () => {
		const client = createFetchClient({
			...mockBaseConfig,
			schema: defineSchema({
				"/defined-route": {
					data: z.object({ success: z.boolean() }),
				},
			}),
		});

		// Both defined and undefined routes should work
		mockFetch.mockResolvedValue(createMockResponse({ custom: "data" }));

		const result1 = await client("/defined-route");
		const result2 = await client("/any-other-route");

		expectSuccessResult(result1 as never);
		expectSuccessResult(result2);
	});
});
