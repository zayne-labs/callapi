/**
 * Network error tests - flat structure without nested describe blocks
 * Tests network errors, timeouts, AbortError, and malformed response handling
 */

import { expect, test } from "vitest";
import { expectErrorResult } from "../test-setup/assertions";
import { callTestApi } from "../test-setup/callapi-setup";
import { mockNetworkError, mockTimeoutError } from "../test-setup/common";
import { createFetchMock, mockFetchSuccess } from "../test-setup/fetch-mock";
import { mockUser } from "../test-setup/fixtures";

test("callTestApi handles network timeout with AbortError creation", async () => {
	using mockFetch = createFetchMock();

	const timeoutError = mockTimeoutError();
	mockFetch.mockRejectedValue(timeoutError);

	const result = await callTestApi("/users", { resultMode: "all", timeout: 1000 });

	expectErrorResult(result);
	expect(result.error.name).toBe("AbortError");
	expect(result.error.originalError).toBe(timeoutError);
	expect(result.error.message).toContain("The operation was aborted");
});

test("callTestApi handles AbortController timeout with proper error message", async () => {
	using mockFetch = createFetchMock();

	const abortError = new DOMException("The operation was aborted", "AbortError");
	mockFetch.mockRejectedValue(abortError);

	const result = await callTestApi("/users", { resultMode: "all", timeout: 2000 });

	expectErrorResult(result);
	expect(result.error.name).toBe("AbortError");
	expect(result.error.originalError).toBe(abortError);
});

test("callTestApi handles TimeoutError with custom timeout message", async () => {
	using mockFetch = createFetchMock();

	const timeoutError = new DOMException("Request timed out", "TimeoutError");
	mockFetch.mockRejectedValue(timeoutError);

	const result = await callTestApi("/users", { resultMode: "all", timeout: 3000 });

	expectErrorResult(result);
	expect(result.error.name).toBe("TimeoutError");
	expect(result.error.originalError).toBe(timeoutError);
});

test("callTestApi handles generic network errors correctly", async () => {
	using mockFetch = createFetchMock();

	const networkError = mockNetworkError("Failed to fetch");
	mockFetch.mockRejectedValue(networkError);

	const result = await callTestApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.name).toBe("Error");
	expect(result.error.message).toBe("Failed to fetch");
	expect(result.error.originalError).toBe(networkError);
});

test("callTestApi handles network errors consistently across result modes", async () => {
	using mockFetch = createFetchMock();

	const networkError = mockNetworkError();

	// Test 'all' mode
	mockFetch.mockRejectedValue(networkError);
	const resultAll = await callTestApi("/users", { resultMode: "all" });
	expectErrorResult(resultAll);

	// Test 'onlyData' mode
	mockFetch.mockRejectedValue(networkError);
	const resultSuccess = await callTestApi("/users", { resultMode: "onlyData" });
	expect(resultSuccess).toBeNull();

	// Test exception modes with throwOnError
	mockFetch.mockRejectedValue(networkError);
	try {
		await callTestApi("/users", {
			resultMode: "all",
			throwOnError: true,
		});
		expect.fail("Should have thrown an error");
	} catch (error) {
		expect((error as Error).message).toBe("Network error");
	}
});

test("callTestApi handles malformed JSON response gracefully", async () => {
	using mockFetch = createFetchMock();

	const malformedResponse = new Response("{ invalid json", {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
	mockFetch.mockResolvedValue(malformedResponse);

	const result = await callTestApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.name).toBe("SyntaxError");
	expect(result.error.message).toContain("JSON");
});

test("callTestApi handles empty response body gracefully", async () => {
	using mockFetch = createFetchMock();

	const emptyResponse = new Response("", {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
	mockFetch.mockResolvedValue(emptyResponse);

	const result = await callTestApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.name).toBe("SyntaxError");
});

test("callTestApi handles successful response with JSON content-type but invalid JSON content", async () => {
	using mockFetch = createFetchMock();

	const invalidJsonResponse = new Response("<html><body>Success</body></html>", {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
	mockFetch.mockResolvedValue(invalidJsonResponse);

	const result = await callTestApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.name).toBe("SyntaxError");
});

test("callTestApi handles response parsing with custom parser that throws", async () => {
	using ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	const result = await callTestApi("/users", {
		resultMode: "all",
		responseParser: () => {
			throw new Error("Custom parser error");
		},
	});

	expectErrorResult(result);
	expect(result.error.name).toBe("Error");
	expect(result.error.message).toBe("Custom parser error");
});

test("callTestApi handles errors during error processing gracefully", async () => {
	using mockFetch = createFetchMock();

	const mockError = { message: "Test error", code: "TEST_ERROR" };
	mockFetch.mockResolvedValue(
		Response.json(mockError, {
			status: 400,
		})
	);

	try {
		await callTestApi("/users", {
			resultMode: "all",
			throwOnError: () => {
				throw new Error("Error in throwOnError function");
			},
		});
		expect.fail("Should have thrown an error");
	} catch (error) {
		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toBe("Error in throwOnError function");
	}
});

test("callTestApi handles connection refused errors", async () => {
	using mockFetch = createFetchMock();

	const connectionError = new Error("ECONNREFUSED");
	mockFetch.mockRejectedValue(connectionError);

	const result = await callTestApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.message).toBe("ECONNREFUSED");
});

test("callTestApi handles DNS resolution errors", async () => {
	using mockFetch = createFetchMock();

	const dnsError = new Error("getaddrinfo ENOTFOUND");
	mockFetch.mockRejectedValue(dnsError);

	const result = await callTestApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.message).toBe("getaddrinfo ENOTFOUND");
});

test("callTestApi handles SSL/TLS certificate errors", async () => {
	using mockFetch = createFetchMock();

	const sslError = new Error("UNABLE_TO_VERIFY_LEAF_SIGNATURE");
	mockFetch.mockRejectedValue(sslError);

	const result = await callTestApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.message).toBe("UNABLE_TO_VERIFY_LEAF_SIGNATURE");
});
