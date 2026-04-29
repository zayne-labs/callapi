/**
 * HTTP error tests - flat structure without nested describe blocks
 * Tests HTTPError creation, properties, and HTTP status code handling
 */

import { expect, test, vi } from "vitest";
import { HTTPError } from "../../src/utils/external/error";
import { expectErrorResult, expectHTTPError } from "../test-setup/assertions";
import { callTestApi } from "../test-setup/callapi-setup";
import {
	createFetchMock,
	createMockErrorResponse,
	getHeadersFromCall,
	mockFetchError,
} from "../test-setup/fetch-mock";
import { mockError, mockHTTPError, mockServerError } from "../test-setup/fixtures";

test("HTTPError is created with correct properties for 404 error", async () => {
	using ignoredMockFetch = createFetchMock();
	mockFetchError(mockHTTPError, 404);

	const result = await callTestApi("/users/999", { resultMode: "all" });

	expectErrorResult(result);
	expectHTTPError(result.error.originalError, 404);

	const httpError = result.error.originalError;
	expect(httpError.name).toBe("HTTPError");
	expect(httpError.errorData).toEqual(mockHTTPError);
	expect(httpError.response.status).toBe(404);
	expect(httpError.message).toContain("The requested resource was not found");
});

test("HTTPError is created with correct properties for 500 error", async () => {
	using ignoredMockFetch = createFetchMock();
	mockFetchError(mockServerError, 500);

	const result = await callTestApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expectHTTPError(result.error.originalError, 500);

	const httpError = result.error.originalError;
	expect(httpError.name).toBe("HTTPError");
	expect(httpError.errorData).toEqual(mockServerError);
	expect(httpError.response.status).toBe(500);
	expect(httpError.message).toContain("An unexpected error occurred");
});

test("HTTPError uses custom error message from errorData when available", async () => {
	using ignoredMockFetch = createFetchMock();
	const customError = { message: "Custom error message", code: "CUSTOM_ERROR" };
	mockFetchError(customError, 422);

	const result = await callTestApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expectHTTPError(result.error.originalError, 422, "Custom error message");

	const httpError = result.error.originalError;
	expect(httpError.errorData).toEqual(customError);
});

test("HTTPError uses default message when errorData has no message property", async () => {
	using ignoredMockFetch = createFetchMock();
	const errorWithoutMessage = { code: "NO_MESSAGE" };
	mockFetchError(errorWithoutMessage, 400);

	const result = await callTestApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expectHTTPError(result.error.originalError, 400);

	const httpError = result.error.originalError;
	expect(httpError.message).toBe("Bad Request");
	expect(httpError.errorData).toEqual(errorWithoutMessage);
});

test("HTTPError uses custom defaultHTTPErrorMessage function when provided", async () => {
	using ignoredMockFetch = createFetchMock();
	mockFetchError(mockError, 400);

	const result = await callTestApi("/users", {
		defaultHTTPErrorMessage: ({ response, errorData }) =>
			`Custom error for ${response.status}: ${(errorData as { code: string }).code}`,
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
	expect(HTTPError.isError("string")).toBe(false);
	expect(HTTPError.isError({})).toBe(false);
});

test("callTestApi handles errors in 'all' result mode correctly", async () => {
	using ignoredMockFetch = createFetchMock();
	mockFetchError(mockError, 400);

	const result = await callTestApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.data).toBeNull();
	expect(result.error).toBeDefined();
	expect(result.response).toBeDefined();
	expectHTTPError(result.error.originalError, 400);
});

test("callTestApi throws errors in 'all' result mode when throwOnError is true", async () => {
	using ignoredMockFetch = createFetchMock();
	mockFetchError(mockError, 400);

	try {
		await callTestApi("/users", {
			resultMode: "all",
			throwOnError: true,
		});
		expect.fail("Should have thrown an error");
	} catch (error) {
		expect(error).toBeInstanceOf(HTTPError);
	}
});

test("callTestApi returns null in 'onlyData' result mode for errors", async () => {
	using ignoredMockFetch = createFetchMock();
	mockFetchError(mockError, 400);

	const result = await callTestApi("/users", { resultMode: "onlyData" });

	expect(result).toBeNull();
});

test("callTestApi throws errors in 'onlyData' result mode when throwOnError is true", async () => {
	using ignoredMockFetch = createFetchMock();
	mockFetchError(mockError, 400);

	try {
		await callTestApi("/users", {
			resultMode: "onlyData",
			throwOnError: true,
		});
		expect.fail("Should have thrown an error");
	} catch (error) {
		expect(error).toBeInstanceOf(HTTPError);
	}
});

test("callTestApi handles null error data correctly", async () => {
	using ignoredMockFetch = createFetchMock();
	mockFetchError(null, 400);

	const result = await callTestApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expectHTTPError(result.error.originalError, 400);

	const httpError = result.error.originalError;
	expect(httpError.errorData).toBeNull();
});

test("callTestApi handles very large error responses correctly", async () => {
	using ignoredMockFetch = createFetchMock();
	const largeError = {
		message: "Large error",
		data: "x".repeat(10000),
	};

	mockFetchError(largeError, 400);

	const result = await callTestApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expectHTTPError(result.error.originalError, 400);

	const httpError = result.error.originalError;
	expect(httpError.errorData).toEqual(largeError);
});

test("callTestApi handles response with circular reference in error data", async () => {
	using mockFetch = createFetchMock();
	const response = new Response('{"message": "Circular error", "self": "[Circular]"}', {
		status: 400,
		headers: { "Content-Type": "application/json" },
	});

	mockFetch.mockResolvedValue(response);

	const result = await callTestApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expectHTTPError(result.error.originalError, 400);
});

test("callTestApi handles error with non-serializable properties", async () => {
	using ignoredMockFetch = createFetchMock();
	const errorWithFunction = {
		message: "Error with function",
		callback: () => console.info("test"),
		symbol: Symbol("error"),
	};

	mockFetchError(errorWithFunction, 400);

	const result = await callTestApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expectHTTPError(result.error.originalError, 400);
});

test("callTestApi handles response with wrong content-type as HTTPError", async () => {
	using mockFetch = createFetchMock();
	const htmlResponse = new Response("<html><body>Error</body></html>", {
		status: 500,
		headers: { "Content-Type": "text/html" },
	});

	mockFetch.mockResolvedValue(htmlResponse);

	const result = await callTestApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.name).toBe("HTTPError");
	expectHTTPError(result.error.originalError, 500);
});

test("callTestApi provides complete error context to throwOnError function", async () => {
	using mockFetch = createFetchMock();
	mockFetchError(mockError, 400);

	const throwOnErrorSpy = vi.fn().mockReturnValue(false);

	await callTestApi("/users", {
		baseURL: "https://api.example.com",
		headers: { "X-Test": "value" },
		resultMode: "all",
		throwOnError: throwOnErrorSpy,
	});

	expect(throwOnErrorSpy).toHaveBeenCalledWith(
		expect.objectContaining({
			config: expect.objectContaining({
				baseURL: "https://api.example.com",
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

	const headers = getHeadersFromCall(mockFetch);
	expect(headers).toEqual(expect.objectContaining({ "X-Test": "value" }));
});

test("callTestApi handles errors with custom error messages correctly", async () => {
	using ignoredMockFetch = createFetchMock();
	mockFetchError(mockError, 400);

	const result = await callTestApi("/users", {
		resultMode: "all",
		throwOnError: false,
	});

	expectErrorResult(result);
	expect(result.error.message).toContain("Invalid input data");
});
