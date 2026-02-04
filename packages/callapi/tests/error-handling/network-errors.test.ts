/**
 * Network error tests - flat structure without nested describe blocks
 * Tests network errors, timeouts, AbortError, and malformed response handling
 */

import { expect, test, vi } from "vitest";
import { callApi } from "../../src/createFetchClient";
import { expectErrorResult } from "../test-setup/assertions";
import { mockNetworkError, mockTimeoutError } from "../test-setup/common";
import { createFetchMock, mockFetchSuccess } from "../test-setup/fetch-mock";
import { mockUser } from "../test-setup/fixtures";

test("callApi handles network timeout with AbortError creation", async () => {
	using mockFetch = createFetchMock();

	const timeoutError = mockTimeoutError();
	mockFetch.mockRejectedValue(timeoutError);

	const result = await callApi("/users", { resultMode: "all", timeout: 1000 });

	expectErrorResult(result);
	expect(result.error.name).toBe("AbortError");
	expect(result.error.originalError).toBe(timeoutError);
	expect(result.error.message).toContain("The operation was aborted");
});

test("callApi handles AbortController timeout with proper error message", async () => {
	using mockFetch = createFetchMock();

	const abortError = new DOMException("The operation was aborted", "AbortError");
	mockFetch.mockRejectedValue(abortError);

	const result = await callApi("/users", { resultMode: "all", timeout: 2000 });

	expectErrorResult(result);
	expect(result.error.name).toBe("AbortError");
	expect(result.error.originalError).toBe(abortError);
});

test("callApi handles TimeoutError with custom timeout message", async () => {
	using mockFetch = createFetchMock();

	const timeoutError = new DOMException("Request timed out", "TimeoutError");
	mockFetch.mockRejectedValue(timeoutError);

	const result = await callApi("/users", { resultMode: "all", timeout: 3000 });

	expectErrorResult(result);
	expect(result.error.name).toBe("TimeoutError");
	expect(result.error.originalError).toBe(timeoutError);
});

test("callApi handles generic network errors correctly", async () => {
	using mockFetch = createFetchMock();

	const networkError = mockNetworkError("Failed to fetch");
	mockFetch.mockRejectedValue(networkError);

	const result = await callApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.name).toBe("Error");
	expect(result.error.message).toBe("Failed to fetch");
	expect(result.error.originalError).toBe(networkError);
});

test("callApi handles network errors consistently across result modes", async () => {
	using mockFetch = createFetchMock();

	const networkError = mockNetworkError();

	// Test 'all' mode
	mockFetch.mockRejectedValue(networkError);
	const resultAll = await callApi("/users", { resultMode: "all" });
	expectErrorResult(resultAll);

	// Test 'onlyData' mode
	mockFetch.mockRejectedValue(networkError);
	const resultSuccess = await callApi("/users", { resultMode: "onlyData" });
	expect(resultSuccess).toBeNull();

	// Test exception modes with throwOnError
	mockFetch.mockRejectedValue(networkError);
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

test("callApi handles malformed JSON response gracefully", async () => {
	using mockFetch = createFetchMock();

	const malformedResponse = new Response("{ invalid json", {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
	mockFetch.mockResolvedValue(malformedResponse);

	const result = await callApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.name).toBe("SyntaxError");
	expect(result.error.message).toContain("JSON");
});

test("callApi handles empty response body gracefully", async () => {
	using mockFetch = createFetchMock();

	const emptyResponse = new Response("", {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
	mockFetch.mockResolvedValue(emptyResponse);

	const result = await callApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.name).toBe("SyntaxError");
});

test("callApi handles successful response with JSON content-type but invalid JSON content", async () => {
	using mockFetch = createFetchMock();

	const invalidJsonResponse = new Response("<html><body>Success</body></html>", {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
	mockFetch.mockResolvedValue(invalidJsonResponse);

	const result = await callApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.name).toBe("SyntaxError");
});

test("callApi handles response parsing with custom parser that throws", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

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

test("callApi handles errors during error processing gracefully", async () => {
	using mockFetch = createFetchMock();

	const mockError = { message: "Test error", code: "TEST_ERROR" };
	mockFetch.mockResolvedValue(
		new Response(JSON.stringify(mockError), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		})
	);

	try {
		await callApi("/users", {
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

test("callApi handles connection refused errors", async () => {
	using mockFetch = createFetchMock();

	const connectionError = new Error("ECONNREFUSED");
	mockFetch.mockRejectedValue(connectionError);

	const result = await callApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.message).toBe("ECONNREFUSED");
});

test("callApi handles DNS resolution errors", async () => {
	using mockFetch = createFetchMock();

	const dnsError = new Error("getaddrinfo ENOTFOUND");
	mockFetch.mockRejectedValue(dnsError);

	const result = await callApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.message).toBe("getaddrinfo ENOTFOUND");
});

test("callApi handles SSL/TLS certificate errors", async () => {
	using mockFetch = createFetchMock();

	const sslError = new Error("UNABLE_TO_VERIFY_LEAF_SIGNATURE");
	mockFetch.mockRejectedValue(sslError);

	const result = await callApi("/users", { resultMode: "all" });

	expectErrorResult(result);
	expect(result.error.message).toBe("UNABLE_TO_VERIFY_LEAF_SIGNATURE");
});
