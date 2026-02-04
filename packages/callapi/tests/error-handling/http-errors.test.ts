/**
 * HTTP error tests - flat structure without nested describe blocks
 * Tests HTTPError creation, properties, and HTTP status code handling
 */

import { expect, test, vi } from "vitest";
import { callApi } from "../../src/createFetchClient";
import { HTTPError } from "../../src/utils/external/error";
import { expectErrorResult, expectHTTPError } from "../test-setup/assertions";
import {
	createFetchMock,
	createMockErrorResponse,
	createMockResponse,
	mockFetchError,
	mockFetchSuccess,
} from "../test-setup/fetch-mock";
import { mockError, mockHTTPError, mockServerError, mockUser } from "../test-setup/fixtures";

test("HTTPError is created with correct properties for 404 error", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchError(mockHTTPError, 404);

	const result = await callApi("/users/999", { resultMode: "all" });

	expectErrorResult(result);
	expectHTTPError(result.error.originalError, 404);

	const httpError = result.error.originalError as HTTPError;
	expect(httpError.name).toBe("HTTPError");
	expect(httpError.errorData).toEqual(mockHTTPError);
	expect(httpError.response.status).toBe(404);
	expect(httpError.message).toContain("The requested resource was not found");
});

test("HTTPError is created with correct properties for 500 error", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchError(mockServerError, 500);

	const result = await callApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expectHTTPError(result.error.originalError, 500);

	const httpError = result.error.originalError as HTTPError;
	expect(httpError.name).toBe("HTTPError");
	expect(httpError.errorData).toEqual(mockServerError);
	expect(httpError.response.status).toBe(500);
	expect(httpError.message).toContain("An unexpected error occurred");
});

test("HTTPError uses custom error message from errorData when available", async () => {
	using _ignoredMockFetch = createFetchMock();
	const customError = { message: "Custom error message", code: "CUSTOM_ERROR" };
	mockFetchError(customError, 422);

	const result = await callApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expectHTTPError(result.error.originalError, 422, "Custom error message");

	const httpError = result.error.originalError as HTTPError;
	expect(httpError.errorData).toEqual(customError);
});

test("HTTPError uses default message when errorData has no message property", async () => {
	using _ignoredMockFetch = createFetchMock();
	const errorWithoutMessage = { code: "NO_MESSAGE" };
	mockFetchError(errorWithoutMessage, 400);

	const result = await callApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expectHTTPError(result.error.originalError, 400);

	const httpError = result.error.originalError as HTTPError;
	expect(httpError.message).toBe("Bad Request");
	expect(httpError.errorData).toEqual(errorWithoutMessage);
});

test("HTTPError uses custom defaultHTTPErrorMessage function when provided", async () => {
	using mockFetch = createFetchMock();
	mockFetchError(mockError, 400);

	const result = await callApi("/users", {
		defaultHTTPErrorMessage: ({ response, errorData }) =>
			`Custom error for ${response.status}: ${(errorData as any).code}`,
		resultMode: "all",
	});

	expectErrorResult(result);
	const httpError = result.error.originalError as HTTPError;
	expect(httpError.message).toBe("Invalid input data");
});

test("HTTPError.isError static method correctly identifies HTTPError instances", () => {
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

test("callApi handles errors in 'all' result mode correctly", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchError(mockError, 400);

	const result = await callApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.data).toBeNull();
	expect(result.error).toBeDefined();
	expect(result.response).toBeDefined();
	expectHTTPError(result.error.originalError, 400);
});

test("callApi throws errors in 'all' result mode when throwOnError is true", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchError(mockError, 400);

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

test("callApi returns null in 'onlyData' result mode for errors", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchError(mockError, 400);

	const result = await callApi("/users", { resultMode: "onlyData" });

	expect(result).toBeNull();
});

test("callApi throws errors in 'onlyData' result mode when throwOnError is true", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchError(mockError, 400);

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

test("callApi handles null error data correctly", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchError(null, 400);

	const result = await callApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expectHTTPError(result.error.originalError, 400);

	const httpError = result.error.originalError as HTTPError;
	expect(httpError.errorData).toBeNull();
});

test("callApi handles very large error responses correctly", async () => {
	using _ignoredMockFetch = createFetchMock();
	const largeError = {
		message: "Large error",
		data: "x".repeat(10000),
	};

	mockFetchError(largeError, 400);

	const result = await callApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expectHTTPError(result.error.originalError, 400);

	const httpError = result.error.originalError as HTTPError;
	expect(httpError.errorData).toEqual(largeError);
});

test("callApi handles response with circular reference in error data", async () => {
	using mockFetch = createFetchMock();
	const response = new Response('{"message": "Circular error", "self": "[Circular]"}', {
		status: 400,
		headers: { "Content-Type": "application/json" },
	});

	mockFetch.mockResolvedValue(response);

	const result = await callApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expectHTTPError(result.error.originalError, 400);
});

test("callApi handles error with non-serializable properties", async () => {
	using _ignoredMockFetch = createFetchMock();
	const errorWithFunction = {
		message: "Error with function",
		callback: () => console.log("test"),
		symbol: Symbol("error"),
	};

	mockFetchError(errorWithFunction, 400);

	const result = await callApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expectHTTPError(result.error.originalError, 400);
});

test("callApi handles response with wrong content-type as HTTPError", async () => {
	using mockFetch = createFetchMock();
	const htmlResponse = new Response("<html><body>Error</body></html>", {
		status: 500,
		headers: { "Content-Type": "text/html" },
	});

	mockFetch.mockResolvedValue(htmlResponse);

	const result = await callApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.name).toBe("HTTPError");
	expectHTTPError(result.error.originalError, 500);
});

test("callApi provides complete error context to throwOnError function", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchError(mockError, 400);

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

test("callApi handles errors with custom error messages correctly", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchError(mockError, 400);

	const result = await callApi("/users", {
		resultMode: "all",
		throwOnError: false,
	});

	expectErrorResult(result);
	expect(result.error.message).toContain("Invalid input data");
});
