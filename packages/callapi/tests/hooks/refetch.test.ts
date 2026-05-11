/**
 * Refetch functionality tests
 * Tests the refetch function available in error contexts
 */

import { expect, test } from "vitest";
import type { RefetchFn } from "../../src/refetch";
import { callTestApi, createTestFetchClient } from "../test-setup/callapi-setup";
import { createCallTracker, mockNetworkError } from "../test-setup/common";
import {
	createFetchMock,
	createMockErrorResponse,
	createMockResponse,
	mockFetchError,
	mockFetchSuccess,
} from "../test-setup/fetch-mock";

test("Refetch - refetch function is available in all error hooks", async () => {
	using ignoredMockFetch = createFetchMock();

	// Test onResponseError
	mockFetchError({ error: "Server error" }, 500);
	let refetchFn: RefetchFn | undefined;
	await callTestApi("/test", {
		onResponseError: (context) => {
			refetchFn = context.options.refetch;
		},
		resultMode: "all",
	});
	expect(refetchFn).toBeDefined();
	expect(typeof refetchFn).toBe("function");

	// Test onRequestError
	using mockFetch2 = createFetchMock();
	mockFetch2.mockRejectedValue(mockNetworkError("Network failure"));
	await callTestApi("/test", {
		onRequestError: (context) => {
			refetchFn = context.options.refetch;
		},
		resultMode: "all",
	});
	expect(refetchFn).toBeDefined();

	// Test onValidationError
	mockFetchSuccess({ invalid: "data" });
	await callTestApi("/test", {
		onValidationError: (context) => {
			refetchFn = context.options.refetch;
		},
		resultMode: "all",
		schema: {
			data: (data: unknown) => {
				if (typeof data === "object" && data !== null && "invalid" in data) {
					throw new Error("Invalid response format");
				}
				return data;
			},
		},
	});
	expect(refetchFn).toBeDefined();
});

test("Refetch - calling refetch retries the same request", async () => {
	using mockFetch = createFetchMock();
	const tracker = createCallTracker();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	const result = await callTestApi("/test", {
		onResponseError: (context) => {
			tracker.track("error", context.response.status);
			context.options.refetch();
		},
		resultMode: "all",
	});

	expect(tracker.getCallCount()).toBe(1);
	expect(result.data).toEqual({ success: true });
	expect(result.error).toBeNull();
	expect(mockFetch).toHaveBeenCalledTimes(2);
});

test("Refetch - multiple refetch calls only trigger one refetch", async () => {
	using mockFetch = createFetchMock();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Error 1" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	const result = await callTestApi("/test", {
		onResponseError: (context) => {
			// Call refetch multiple times - should only trigger once
			context.options.refetch();
			context.options.refetch();
			context.options.refetch();
		},
		resultMode: "all",
	});

	expect(mockFetch).toHaveBeenCalledTimes(2);
	expect(result.data).toEqual({ success: true });
});

test("Refetch - works after network and validation errors", async () => {
	using mockFetch = createFetchMock();

	// Network error
	mockFetch
		.mockRejectedValueOnce(mockNetworkError("Network failure"))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	let result = await callTestApi("/test", {
		onRequestError: (context) => {
			context.options.refetch();
		},
		resultMode: "all",
	});

	expect(result.data).toEqual({ success: true });
	expect(mockFetch).toHaveBeenCalledTimes(2);

	// Validation error
	mockFetch
		.mockResolvedValueOnce(createMockResponse({ invalid: "data" }))
		.mockResolvedValueOnce(createMockResponse({ valid: "data" }));

	result = await callTestApi("/test", {
		onValidationError: (context) => {
			context.options.refetch();
		},
		resultMode: "all",
		schema: {
			data: (data: unknown) => {
				if (typeof data === "object" && data !== null && "invalid" in data) {
					throw new Error("Invalid response format");
				}
				return data;
			},
		},
	});

	expect(result.data).toEqual({ valid: "data" });
	expect(mockFetch).toHaveBeenCalledTimes(4); // 2 from network + 2 from validation
});

test("Refetch - returns error if refetch also fails", async () => {
	using mockFetch = createFetchMock();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Error 1" }, 500))
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Error 2" }, 503));

	let refetchCount = 0;

	const result = await callTestApi("/test", {
		onResponseError: (context) => {
			if (refetchCount === 0) {
				refetchCount++;
				context.options.refetch();
			}
		},
		resultMode: "all",
		retryAttempts: 0,
	});

	expect(result.data).toBeNull();
	expect(result.error).toBeDefined();
	expect(mockFetch).toHaveBeenCalledTimes(2);
	expect(result.response?.status).toBe(503);
});

test("Refetch - triggers hooks correctly on refetch", async () => {
	using mockFetch = createFetchMock();
	const tracker = createCallTracker();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	await callTestApi("/test", {
		onRequest: () => tracker.track("onRequest"),
		onResponseError: (context) => {
			context.options.refetch();
		},
		onSuccess: () => tracker.track("onSuccess"),
		resultMode: "all",
	});

	// onRequest called twice (original + refetch)
	const requestCalls = tracker.getCalls().filter((call) => call.args[0] === "onRequest");
	expect(requestCalls).toHaveLength(2);

	// onSuccess called once (after successful refetch)
	const successCalls = tracker.getCalls().filter((call) => call.args[0] === "onSuccess");
	expect(successCalls).toHaveLength(1);
});

test("Refetch - does not trigger onRetry hook", async () => {
	using mockFetch = createFetchMock();
	const tracker = createCallTracker();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	await callTestApi("/test", {
		onResponseError: (context) => {
			context.options.refetch();
		},
		onRetry: () => tracker.track("onRetry"),
		resultMode: "all",
		retryAttempts: 0,
	});

	const retryCalls = tracker.getCalls().filter((call) => call.args[0] === "onRetry");
	expect(retryCalls).toHaveLength(0);
});

test("Refetch - clears dedupe cache before refetch (defer strategy)", async () => {
	using mockFetch = createFetchMock();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	const client = createTestFetchClient({
		baseURL: "https://api.example.com",
		dedupeStrategy: "defer",
		dedupeKey: "test-request",
	});

	const result = await client("/test", {
		onResponseError: (context) => {
			context.options.refetch();
		},
		resultMode: "all",
	});

	// Refetch should make a new request, not reuse the failed one
	expect(result.data).toEqual({ success: true });
	expect(result.error).toBeNull();
	expect(mockFetch).toHaveBeenCalledTimes(2);
});

test("Refetch - does not interfere with retry logic", async () => {
	using mockFetch = createFetchMock();
	const tracker = createCallTracker();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Error 1" }, 500))
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Error 2" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	const result = await callTestApi("/test", {
		onResponseError: (context) => {
			tracker.track("error", context.response.status);
			// Call refetch on first error only
			if (tracker.getCallCount() === 1) {
				context.options.refetch();
			}
		},
		resultMode: "all",
		retryAttempts: 1,
		retryDelay: 10,
		retryStatusCodes: [500],
	});

	// First error triggers refetch (2nd call)
	// Second error triggers retry (3rd call)
	// Third call succeeds
	expect(mockFetch).toHaveBeenCalledTimes(3);
	expect(result.data).toEqual({ success: true });
	expect(tracker.getCallCount()).toBe(2);
});

test("Refetch Edge cases - refetch works with throwOnError option", async () => {
	using mockFetch = createFetchMock();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	let didRefetch = false;

	const result = await callTestApi("/test", {
		onResponseError: (context) => {
			didRefetch = true;
			context.options.refetch();
		},
		resultMode: "all",
		throwOnError: false, // Don't throw so we can check the result
	});

	expect(didRefetch).toBe(true);
	expect(result.data).toEqual({ success: true });
	expect(result.error).toBeNull();
});

test("Refetch Edge cases - refetch can be called from onRetry hook", async () => {
	using mockFetch = createFetchMock();
	const tracker = createCallTracker();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Error 1" }, 500))
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Error 2" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	const result = await callTestApi("/test", {
		onRetry: (context) => {
			tracker.track("retry", context.retryAttemptCount);

			if (context.retryAttemptCount === 1) {
				// Call refetch to signal manual retry
				context.options.refetch();
				tracker.track("refetch-called", true);
			}
		},
		resultMode: "all",
		retryAttempts: 2,
		retryDelay: 10,
	});

	// Should have retried and eventually succeeded
	expect(result.data).toEqual({ success: true });
	expect(tracker.getCalls().some((call) => call.args[0] === "refetch-called")).toBe(true);
});

test("Refetch Edge cases - refetch can be called from onSuccess hook", async () => {
	using mockFetch = createFetchMock();
	const tracker = createCallTracker();

	mockFetch
		.mockResolvedValueOnce(createMockResponse({ data: "first" }))
		.mockResolvedValueOnce(createMockResponse({ data: "second" }));

	let callCount = 0;

	const result = await callTestApi("/test", {
		onSuccess: (context) => {
			callCount++;
			tracker.track("success", callCount);

			// Only refetch on first success to avoid infinite loop
			if (callCount === 1) {
				context.options.refetch();
			}
		},
		resultMode: "all",
	});

	// Should have made two requests
	expect(mockFetch).toHaveBeenCalledTimes(2);
	// Should return the second response
	expect(result.data).toEqual({ data: "second" });
	// onSuccess should be called twice
	expect(callCount).toBe(2);
});
