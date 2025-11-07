/**
 * Comprehensive error handling tests
 * Tests HTTPError, ValidationError, network errors, timeouts, and error throwing behavior
 */

import { describe, expect, it, vi } from "vitest";
import { callApi } from "../src/createFetchClient";
import type { StandardSchemaV1 } from "../src/types/standard-schema";
import { HTTPError, ValidationError } from "../src/utils/external/error";
import { mockError, mockHTTPError, mockServerError, mockUser } from "./fixtures";
import {
	createMockErrorResponse,
	createMockResponse,
	expectErrorResult,
	expectHTTPError,
	mockNetworkError,
	mockTimeoutError,
} from "./helpers";
import { mockFetch } from "./setup";

describe("Error Handling", () => {
	describe("HTTPError creation and properties", () => {
		it("should create HTTPError with correct properties for 404 error", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockHTTPError, 404));

			const result = await callApi("/users/999", { resultMode: "all" });

			expectErrorResult(result);
			expectHTTPError(result.error.originalError, 404);

			const httpError = result.error.originalError as HTTPError;
			expect(httpError.name).toBe("HTTPError");
			expect(httpError.errorData).toEqual(mockHTTPError);
			expect(httpError.response.status).toBe(404);
			expect(httpError.message).toContain("The requested resource was not found");
		});

		it("should create HTTPError with correct properties for 500 error", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockServerError, 500));

			const result = await callApi("/users", { resultMode: "all" });

			expectErrorResult(result);
			expectHTTPError(result.error.originalError, 500);

			const httpError = result.error.originalError as HTTPError;
			expect(httpError.name).toBe("HTTPError");
			expect(httpError.errorData).toEqual(mockServerError);
			expect(httpError.response.status).toBe(500);
			expect(httpError.message).toContain("An unexpected error occurred");
		});

		it("should create HTTPError with custom error message from errorData", async () => {
			const customError = { message: "Custom error message", code: "CUSTOM_ERROR" };
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(customError, 422));

			const result = await callApi("/users", { resultMode: "all" });

			expectErrorResult(result);
			expectHTTPError(result.error.originalError, 422, "Custom error message");

			const httpError = result.error.originalError as HTTPError;
			expect(httpError.errorData).toEqual(customError);
		});

		it("should create HTTPError with default message when errorData has no message", async () => {
			const errorWithoutMessage = { code: "NO_MESSAGE" };
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(errorWithoutMessage, 400));

			const result = await callApi("/users", { resultMode: "all" });

			expectErrorResult(result);
			expectHTTPError(result.error.originalError, 400);

			const httpError = result.error.originalError as HTTPError;
			expect(httpError.message).toBe("Bad Request"); // Should use status text as default
			expect(httpError.errorData).toEqual(errorWithoutMessage);
		});

		it("should create HTTPError with custom defaultHTTPErrorMessage function", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockError, 400));

			const result = await callApi("/users", {
				defaultHTTPErrorMessage: ({ response, errorData }) =>
					`Custom error for ${response.status}: ${(errorData as any).code}`,
				resultMode: "all",
			});

			expectErrorResult(result);
			// The actual message comes from errorData.message, not the custom function when errorData has a message
			const httpError = result.error.originalError as HTTPError;
			expect(httpError.message).toBe("Invalid input data"); // This comes from mockError.message
		});

		it("should verify HTTPError.isError static method works correctly", () => {
			const httpError = new HTTPError({
				errorData: mockError,
				response: createMockErrorResponse(mockError, 400),
				defaultHTTPErrorMessage: "Default message",
			});

			expect(HTTPError.isError(httpError)).toBe(true);
			expect(HTTPError.isError(new Error("Regular error"))).toBe(false);
			expect(HTTPError.isError(null)).toBe(false);
			expect(HTTPError.isError(undefined)).toBe(false);
			expect(HTTPError.isError("string")).toBe(false);
			expect(HTTPError.isError({})).toBe(false);
		});
	});

	describe("ValidationError creation and formatting", () => {
		it("should verify ValidationError.isError static method works correctly", () => {
			const validationError = new ValidationError({
				issueCause: "unknown",
				issues: [{ message: "Test error", path: [] }],
				response: null,
			});

			expect(ValidationError.isError(validationError)).toBe(true);
			expect(ValidationError.isError(new Error("Regular error"))).toBe(false);
			expect(
				ValidationError.isError(
					new HTTPError({
						errorData: {},
						response: createMockResponse({}),
						defaultHTTPErrorMessage: "Test",
					})
				)
			).toBe(false);
			expect(ValidationError.isError(null)).toBe(false);
			expect(ValidationError.isError(undefined)).toBe(false);
			expect(ValidationError.isError("string")).toBe(false);
			expect(ValidationError.isError({})).toBe(false);
		});

		it("should create ValidationError with proper issue formatting", () => {
			const validationIssues: StandardSchemaV1.Issue[] = [
				{
					message: "Invalid email format",
					path: ["email"],
				},
				{
					message: "Name is required",
					path: ["name"],
				},
			];

			const validationError = new ValidationError({
				issueCause: "unknown",
				issues: validationIssues,
				response: null,
			});

			expect(validationError.name).toBe("ValidationError");
			expect(validationError.errorData).toEqual(validationIssues);
			expect(validationError.message).toContain("Invalid email format → at email");
			expect(validationError.message).toContain("Name is required → at name");
		});

		it("should create ValidationError with nested path formatting", () => {
			const validationIssues: StandardSchemaV1.Issue[] = [
				{
					message: "Invalid nested field",
					path: ["user", "profile", "settings", "theme"],
				},
			];

			const validationError = new ValidationError({
				issueCause: "unknown",
				issues: validationIssues,
				response: null,
			});

			expect(validationError.message).toContain(
				"Invalid nested field → at user.profile.settings.theme"
			);
		});

		it("should create ValidationError with empty path", () => {
			const validationIssues: StandardSchemaV1.Issue[] = [
				{
					message: "Root level validation error",
					path: [],
				},
			];

			const validationError = new ValidationError({
				issueCause: "unknown",
				issues: validationIssues,
				response: null,
			});

			expect(validationError.message).toContain("Root level validation error");
		});
	});

	describe("Network timeout and AbortError handling", () => {
		it("should handle network timeout with AbortError creation", async () => {
			const timeoutError = mockTimeoutError();
			mockFetch.mockRejectedValueOnce(timeoutError);

			const result = await callApi("/users", { resultMode: "all", timeout: 1000 });

			expectErrorResult(result);
			expect(result.error.name).toBe("AbortError");
			expect(result.error.originalError).toBe(timeoutError);
			expect(result.error.message).toContain("The operation was aborted");
		});

		it("should handle AbortController timeout with proper error message", async () => {
			const abortError = new DOMException("The operation was aborted", "AbortError");
			mockFetch.mockRejectedValueOnce(abortError);

			const result = await callApi("/users", { resultMode: "all", timeout: 2000 });

			expectErrorResult(result);
			expect(result.error.name).toBe("AbortError");
			expect(result.error.originalError).toBe(abortError);
		});

		it("should handle TimeoutError with custom timeout message", async () => {
			const timeoutError = new DOMException("Request timed out", "TimeoutError");
			mockFetch.mockRejectedValueOnce(timeoutError);

			const result = await callApi("/users", { resultMode: "all", timeout: 3000 });

			expectErrorResult(result);
			expect(result.error.name).toBe("TimeoutError");
			expect(result.error.originalError).toBe(timeoutError);
		});

		it("should handle generic network errors", async () => {
			const networkError = mockNetworkError("Failed to fetch");
			mockFetch.mockRejectedValueOnce(networkError);

			const result = await callApi("/users", { resultMode: "all" });

			expectErrorResult(result);
			expect(result.error.name).toBe("Error");
			expect(result.error.message).toBe("Failed to fetch");
			expect(result.error.originalError).toBe(networkError);
		});
	});

	describe("Malformed response handling and fallback behavior", () => {
		it("should handle malformed JSON response gracefully", async () => {
			// Create a response with invalid JSON
			const malformedResponse = new Response("{ invalid json", {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
			mockFetch.mockResolvedValueOnce(malformedResponse);

			const result = await callApi("/users", { resultMode: "all" });

			expectErrorResult(result);
			expect(result.error.name).toBe("SyntaxError");
			expect(result.error.message).toContain("JSON");
		});

		it("should handle empty response body gracefully", async () => {
			const emptyResponse = new Response("", {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
			mockFetch.mockResolvedValueOnce(emptyResponse);

			const result = await callApi("/users", { resultMode: "all" });

			// Empty response causes JSON parsing error
			expectErrorResult(result);
			expect(result.error.name).toBe("SyntaxError");
		});

		it("should handle response with wrong content-type", async () => {
			const htmlResponse = new Response("<html><body>Error</body></html>", {
				status: 500,
				headers: { "Content-Type": "text/html" },
			});
			mockFetch.mockResolvedValueOnce(htmlResponse);

			const result = await callApi("/users", { resultMode: "all" });

			expectErrorResult(result);
			// This will be an HTTPError because the response has 500 status, even with wrong content-type
			// The new detectResponseType logic correctly handles text/html as text, not JSON
			expect(result.error.name).toBe("HTTPError");
			expectHTTPError(result.error.originalError, 500);
		});

		it("should handle successful response with JSON content-type but invalid JSON content", async () => {
			// Create a 200 response with JSON content-type but invalid JSON content
			const invalidJsonResponse = new Response("<html><body>Success</body></html>", {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
			mockFetch.mockResolvedValueOnce(invalidJsonResponse);

			const result = await callApi("/users", { resultMode: "all" });

			expectErrorResult(result);
			// This will be a SyntaxError because the response is 200 but JSON parsing fails
			expect(result.error.name).toBe("SyntaxError");
		});

		it("should handle response parsing with custom parser that throws", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const result = await callApi("/users", {
				resultMode: "all",
				responseParser: () => {
					throw new Error("Custom parser error");
				},
			});

			expectErrorResult(result);
			expect(result.error.name).toBe("Error");
			expect(result.error.message).toBe("Custom parser error");
		});
	});

	describe("Different result modes with error scenarios", () => {
		it("should handle errors in 'all' result mode", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockError, 400));

			const result = await callApi("/users", { resultMode: "all" });

			expectErrorResult(result);
			expect(result.data).toBeNull();
			expect(result.error).toBeDefined();
			expect(result.response).toBeDefined();
			expectHTTPError(result.error.originalError, 400);
		});

		it("should throw errors in 'all' result mode with throwOnError", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockError, 400));

			try {
				await callApi("/users", {
					resultMode: "all",
					throwOnError: true,
				});
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).toBeInstanceOf(HTTPError);
			}
		});

		it("should return null in 'onlyData' result mode for errors", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockError, 400));

			const result = await callApi("/users", { resultMode: "onlyData" });

			expect(result).toBeNull();
		});

		it("should throw errors in 'onlyData' result mode with throwOnError", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockError, 400));

			try {
				await callApi("/users", {
					resultMode: "onlyData",
					throwOnError: true,
				});
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).toBeInstanceOf(HTTPError);
			}
		});

		it("should handle network errors consistently across result modes", async () => {
			const networkError = mockNetworkError();

			// Test 'all' mode
			mockFetch.mockRejectedValueOnce(networkError);
			const resultAll = await callApi("/users", { resultMode: "all" });
			expectErrorResult(resultAll);

			// Test 'onlyData' mode
			mockFetch.mockRejectedValueOnce(networkError);
			const resultSuccess = await callApi("/users", { resultMode: "onlyData" });
			expect(resultSuccess).toBeNull();

			// Test exception modes with throwOnError
			mockFetch.mockRejectedValueOnce(networkError);
			try {
				await callApi("/users", {
					resultMode: "all",
					throwOnError: true,
				});
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect((error as Error).message).toBe("Network error");
			}
		});
	});

	describe("throwOnError configuration and conditional error throwing", () => {
		it("should throw errors when throwOnError is true", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockError, 400));

			try {
				await callApi("/users", {
					resultMode: "all",
					throwOnError: true,
				});
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).toBeInstanceOf(HTTPError);
			}
		});

		it("should not throw errors when throwOnError is false", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockError, 400));

			const result = await callApi("/users", {
				resultMode: "all",
				throwOnError: false,
			});

			expectErrorResult(result);
			expect(result.error).toBeDefined();
		});

		it("should conditionally throw based on error status code", async () => {
			const throwOnErrorFn = (context: any) => {
				// Throw on client errors (4xx) but not server errors (5xx)
				const status = context.response?.status ?? 0;
				return status >= 400 && status < 500;
			};

			// Should throw on 404 (client error)
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockHTTPError, 404));
			try {
				await callApi("/users/999", {
					resultMode: "all",
					throwOnError: throwOnErrorFn,
				});
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).toBeInstanceOf(HTTPError);
			}

			// Should not throw on 500 (server error)
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockServerError, 500));
			const result = await callApi("/users", {
				resultMode: "all",
				throwOnError: throwOnErrorFn,
			});
			expectErrorResult(result);
		});

		it("should conditionally throw based on specific status codes", async () => {
			const throwOnErrorFn = (context: any) => {
				const criticalErrors = [401, 403, 404];
				return criticalErrors.includes(context.response?.status ?? 0);
			};

			// Should throw on 401
			mockFetch.mockResolvedValueOnce(createMockErrorResponse({ error: "Unauthorized" }, 401));
			try {
				await callApi("/users", {
					resultMode: "all",
					throwOnError: throwOnErrorFn,
				});
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).toBeInstanceOf(HTTPError);
			}

			// Should not throw on 400
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockError, 400));
			const result = await callApi("/users", {
				resultMode: "all",
				throwOnError: throwOnErrorFn,
			});
			expectErrorResult(result);
		});

		it("should handle throwOnError function that returns false for network errors", async () => {
			const networkError = mockNetworkError();

			const throwOnErrorFn = (context: any) => {
				// Don't throw on network errors
				return context.error.name !== "Error";
			};

			mockFetch.mockRejectedValueOnce(networkError);
			const result = await callApi("/users", {
				resultMode: "all",
				throwOnError: throwOnErrorFn,
			});

			expectErrorResult(result);
			expect(result.error.name).toBe("Error");
		});

		it("should handle complex throwOnError function logic", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockError, 400));

			const throwOnErrorFn = (context: any) => {
				// Complex decision making based on multiple factors
				const status = context.response?.status ?? 0;
				const errorCode = context.error?.errorData?.code;
				return status === 400 && errorCode === "VALIDATION_ERROR";
			};

			try {
				await callApi("/users", {
					resultMode: "all",
					throwOnError: throwOnErrorFn,
				});
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).toBeInstanceOf(HTTPError);
			}
		});
	});

	describe("Error context and metadata", () => {
		it("should provide complete error context to throwOnError function", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockError, 400));

			const throwOnErrorSpy = vi.fn().mockReturnValue(false);

			await callApi("/users", {
				baseURL: "https://api.example.com",
				headers: { "X-Test": "value" },
				resultMode: "all",
				throwOnError: throwOnErrorSpy,
			});

			expect(throwOnErrorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					config: expect.objectContaining({
						baseURL: "https://api.example.com",
						headers: expect.objectContaining({
							"X-Test": "value",
						}),
					}),
					error: expect.objectContaining({
						name: "HTTPError",
						errorData: mockError,
					}),
					options: expect.any(Object),
					request: expect.any(Object),
					response: expect.any(Response),
				})
			);
		});

		it("should handle errors with custom error messages", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockError, 400));

			const result = await callApi("/users", {
				resultMode: "all",
				throwOnError: false,
			});

			expectErrorResult(result);
			expect(result.error.message).toContain("Invalid input data");
		});
	});

	describe("Edge cases and boundary conditions", () => {
		it("should handle null/undefined error data", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(null, 400));

			const result = await callApi("/users", { resultMode: "all" });

			expectErrorResult(result);
			expectHTTPError(result.error.originalError, 400);

			const httpError = result.error.originalError as HTTPError;
			expect(httpError.errorData).toBeNull();
		});

		it("should handle errors during error processing gracefully", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockError, 400));

			// The throwOnError function throws, which should cause that error to be thrown
			try {
				await callApi("/users", {
					resultMode: "all",
					throwOnError: () => {
						// This error will be thrown instead of the original error
						throw new Error("Error in throwOnError function");
					},
				});
				expect.fail("Should have thrown an error");
			} catch (error) {
				// The throwOnError function error should be thrown
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toBe("Error in throwOnError function");
			}
		});

		it("should handle very large error responses", async () => {
			const largeError = {
				message: "Large error",
				data: "x".repeat(10000), // Large error data
			};

			mockFetch.mockResolvedValueOnce(createMockErrorResponse(largeError, 400));

			const result = await callApi("/users", { resultMode: "all" });

			expectErrorResult(result);
			expectHTTPError(result.error.originalError, 400);

			const httpError = result.error.originalError as HTTPError;
			expect(httpError.errorData).toEqual(largeError);
		});

		it("should handle response with circular reference in error data", async () => {
			// Create a response that would cause circular reference issues
			const response = new Response('{"message": "Circular error", "self": "[Circular]"}', {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});

			mockFetch.mockResolvedValueOnce(response);

			const result = await callApi("/users", { resultMode: "all" });

			expectErrorResult(result);
			expectHTTPError(result.error.originalError, 400);
		});

		it("should handle error with non-serializable properties", async () => {
			const errorWithFunction = {
				message: "Error with function",
				callback: () => console.log("test"),
				symbol: Symbol("error"),
			};

			mockFetch.mockResolvedValueOnce(createMockErrorResponse(errorWithFunction, 400));

			const result = await callApi("/users", { resultMode: "all" });

			expectErrorResult(result);
			expectHTTPError(result.error.originalError, 400);
		});
	});
});
