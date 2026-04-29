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

test("Refetch - refetch function is available in onError hook", async () => {
	using ignoredMockFetch = createFetchMock();
	mockFetchError({ error: "Server error" }, 500);

	let refetchFunction: RefetchFn | undefined;

	const { error } = await callTestApi("/test", {
		onError: (context) => {
			refetchFunction = context.options.refetch;
		},
		resultMode: "all",
	});

	expect(error).toBeDefined();
	expect(refetchFunction).toBeDefined();
	expect(typeof refetchFunction).toBe("function");
});

test("Refetch - refetch function is available in onResponseError hook", async () => {
	using ignoredMockFetch = createFetchMock();
	mockFetchError({ error: "Not found" }, 404);

	let refetchFunction: RefetchFn | undefined;

	const { error } = await callTestApi("/test", {
		onResponseError: (context) => {
			refetchFunction = context.options.refetch;
		},
		resultMode: "all",
	});

	expect(error).toBeDefined();
	expect(refetchFunction).toBeDefined();
	expect(typeof refetchFunction).toBe("function");
});

test("Refetch - refetch function is available in onRequestError hook", async () => {
	using mockFetch = createFetchMock();
	mockFetch.mockRejectedValue(mockNetworkError("Network failure"));

	let refetchFunction: RefetchFn | undefined;

	const { error } = await callTestApi("/test", {
		onRequestError: (context) => {
			refetchFunction = context.options.refetch;
		},
		resultMode: "all",
	});

	expect(error).toBeDefined();
	expect(refetchFunction).toBeDefined();
	expect(typeof refetchFunction).toBe("function");
});

test("Refetch - refetch function is available in onValidationError hook", async () => {
	using ignoredMockFetch = createFetchMock();
	mockFetchSuccess({ invalid: "data" });

	let refetchFunction: RefetchFn | undefined;

	const { error } = await callTestApi("/test", {
		onValidationError: (context) => {
			refetchFunction = context.options.refetch;
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

	expect(error).toBeDefined();
	expect(refetchFunction).toBeDefined();
	expect(typeof refetchFunction).toBe("function");
});

test("Refetch - calling refetch retries the same request", async () => {
	using mockFetch = createFetchMock();
	const tracker = createCallTracker();

	// First call fails, second succeeds
	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	let refetchResult: Awaited<ReturnType<RefetchFn>> | undefined;

	const { error } = await callTestApi("/test", {
		onResponseError: async (context) => {
			tracker.track("error", context.response.status);
			// Call refetch to retry
			refetchResult = await context.options.refetch();
		},
		resultMode: "all",
	});

	expect(error).toBeDefined();
	expect(tracker.getCallCount()).toBe(1);
	expect(refetchResult).toBeDefined();
	expect(refetchResult?.data).toEqual({ success: true });
	expect(refetchResult?.error).toBeNull();
});

test("Refetch - refetch uses the same URL and options", async () => {
	using mockFetch = createFetchMock();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	await callTestApi("/test-endpoint", {
		body: { key: "value" },
		headers: { "X-Custom": "header" },
		method: "POST",
		onResponseError: async (context) => {
			await context.options.refetch();
		},
		resultMode: "all",
	});

	// Verify both calls were made
	expect(mockFetch).toHaveBeenCalledTimes(2);
});

test("Refetch - refetch can be called multiple times", async () => {
	using mockFetch = createFetchMock();
	const tracker = createCallTracker();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Error 1" }, 500))
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Error 2" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	let refetchCount = 0;

	const { error } = await callTestApi("/test", {
		onResponseError: async (context) => {
			tracker.track("attempt", context.response.status);
			refetchCount++;

			if (refetchCount < 2) {
				await context.options.refetch();
			}
		},
		resultMode: "all",
	});

	expect(error).toBeDefined();
	expect(tracker.getCallCount()).toBe(2);
	expect(mockFetch).toHaveBeenCalledTimes(2);
});

test("Refetch - refetch works after network error", async () => {
	using mockFetch = createFetchMock();

	mockFetch
		.mockRejectedValueOnce(mockNetworkError("Network failure"))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	let refetchResult: Awaited<ReturnType<RefetchFn>> | undefined;

	const { error } = await callTestApi("/test", {
		onRequestError: async (context) => {
			refetchResult = await context.options.refetch();
		},
		resultMode: "all",
	});

	expect(error).toBeDefined();
	expect(refetchResult).toBeDefined();
	expect(refetchResult?.data).toEqual({ success: true });
	expect(refetchResult?.error).toBeNull();
});

test("Refetch - refetch works after validation error", async () => {
	using mockFetch = createFetchMock();

	mockFetch
		.mockResolvedValueOnce(createMockResponse({ invalid: "data" }))
		.mockResolvedValueOnce(createMockResponse({ valid: "data" }));

	let refetchResult: Awaited<ReturnType<RefetchFn>> | undefined;

	const { error } = await callTestApi("/test", {
		onValidationError: async (context) => {
			refetchResult = await context.options.refetch();
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

	expect(error).toBeDefined();
	expect(refetchResult).toBeDefined();
	expect(refetchResult?.data).toEqual({ valid: "data" });
});

test("Refetch - refetch works with createFetchClient", async () => {
	using mockFetch = createFetchMock();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	const client = createTestFetchClient({
		baseURL: "https://api.example.com",
	});

	let refetchResult: Awaited<ReturnType<RefetchFn>> | undefined;

	const { error } = await client("/test", {
		onResponseError: async (context) => {
			refetchResult = await context.options.refetch();
		},
		resultMode: "all",
	});

	expect(error).toBeDefined();
	expect(refetchResult).toBeDefined();
	expect(refetchResult?.data).toEqual({ success: true });
});

test("Refetch - refetch preserves base client configuration", async () => {
	using mockFetch = createFetchMock();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Unauthorized" }, 401))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	const client = createTestFetchClient({
		baseURL: "https://api.example.com",
		headers: {
			"X-Base-Header": "base-value",
		},
	});

	await client("/test", {
		headers: {
			"X-Instance-Header": "instance-value",
		},
		onResponseError: async (context) => {
			await context.options.refetch();
		},
		resultMode: "all",
	});

	expect(mockFetch).toHaveBeenCalledTimes(2);
});

test("Refetch - refetch returns result object with data and error", async () => {
	using mockFetch = createFetchMock();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse({ id: 123, name: "test" }));

	let refetchResult: Awaited<ReturnType<RefetchFn>> | undefined;

	await callTestApi("/test", {
		onResponseError: async (context) => {
			refetchResult = await context.options.refetch();
		},
		resultMode: "all",
	});

	expect(refetchResult).toBeDefined();
	expect(refetchResult?.data).toEqual({ id: 123, name: "test" });
	expect(refetchResult?.error).toBeNull();
	expect(refetchResult?.response).toBeDefined();
});

test("Refetch - refetch returns error if retry also fails", async () => {
	using mockFetch = createFetchMock();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Error 1" }, 500))
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Error 2" }, 503));

	let refetchResult: Awaited<ReturnType<RefetchFn>> | undefined;

	await callTestApi("/test", {
		onResponseError: async (context) => {
			refetchResult = await context.options.refetch();
		},
		resultMode: "all",
	});

	expect(refetchResult).toBeDefined();
	expect(refetchResult?.data).toBeNull();
	expect(refetchResult?.error).toBeDefined();
	expect(refetchResult?.error?.name).toBe("HTTPError");
});

test("Refetch - refetch triggers hooks on retry", async () => {
	using mockFetch = createFetchMock();
	const tracker = createCallTracker();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	await callTestApi("/test", {
		onRequest: () => tracker.track("onRequest"),
		onResponseError: async (context) => {
			await context.options.refetch();
		},
		onSuccess: () => tracker.track("onSuccess"),
		resultMode: "all",
	});

	// onRequest should be called twice (original + refetch)
	// onSuccess should be called once (after successful refetch)
	expect(tracker.getCallCount()).toBeGreaterThanOrEqual(2);
	expect(tracker.getCalls().some((call) => call.args[0] === "onSuccess")).toBe(true);
});

test("Refetch - refetch does not trigger onRetry hook", async () => {
	using mockFetch = createFetchMock();
	const tracker = createCallTracker();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	await callTestApi("/test", {
		onResponseError: async (context) => {
			await context.options.refetch();
		},
		onRetry: () => tracker.track("onRetry"),
		resultMode: "all",
		retryAttempts: 0, // Disable automatic retries
	});

	// onRetry should not be called since refetch is manual, not automatic retry
	const retryCalls = tracker.getCalls().filter((call) => call.args[0] === "onRetry");
	expect(retryCalls).toHaveLength(0);
});

test("Refetch - refetch respects resultMode from original call", async () => {
	using mockFetch = createFetchMock();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	let refetchResult: Awaited<ReturnType<RefetchFn>> | undefined;

	await callTestApi("/test", {
		onResponseError: async (context) => {
			refetchResult = await context.options.refetch();
		},
		resultMode: "onlyData",
	});

	// With resultMode: "onlyData", refetch should return just the data
	expect(refetchResult).toEqual({ success: true });
});

test("Refetch Edge cases - refetch can be stored and called later", async () => {
	using mockFetch = createFetchMock();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	let refetchFunction: RefetchFn | undefined;

	const { error } = await callTestApi("/test", {
		onResponseError: (context) => {
			// Store refetch for later use
			refetchFunction = context.options.refetch;
		},
		resultMode: "all",
	});

	expect(error).toBeDefined();
	expect(refetchFunction).toBeDefined();

	// Call refetch later
	const refetchResult = await refetchFunction?.();

	expect(refetchResult?.data).toEqual({ success: true });
	expect(refetchResult?.error).toBeNull();
});

test("Refetch Edge cases - refetch works with throwOnError option", async () => {
	using mockFetch = createFetchMock();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	let refetchResult: Awaited<ReturnType<RefetchFn>> | undefined;
	let caughtError: unknown;

	try {
		await callTestApi("/test", {
			onResponseError: async (context) => {
				refetchResult = await context.options.refetch();
			},
			throwOnError: true,
		});
	} catch (error) {
		caughtError = error;
	}

	expect(caughtError).toBeDefined();
	expect(refetchResult).toBeDefined();
	expect(refetchResult?.data).toEqual({ success: true });
});

test("Refetch Edge cases - multiple error hooks can access refetch independently", async () => {
	using mockFetch = createFetchMock();
	const tracker = createCallTracker();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	await callTestApi("/test", {
		hooksExecutionMode: "sequential",
		onError: (context) => {
			tracker.track("onError", typeof context.options.refetch);
		},
		onResponseError: async (context) => {
			tracker.track("onResponseError", typeof context.options.refetch);
			await context.options.refetch();
		},
		resultMode: "all",
	});

	const calls = tracker.getCalls();
	expect(calls.some((call) => call.args[0] === "onError" && call.args[1] === "function")).toBe(true);
	expect(calls.some((call) => call.args[0] === "onResponseError" && call.args[1] === "function")).toBe(
		true
	);
});

test("Refetch Edge cases - refetch can be called from onRetry hook", async () => {
	using mockFetch = createFetchMock();
	const tracker = createCallTracker();

	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Error 1" }, 500))
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Error 2" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	await callTestApi("/test", {
		onRetry: async (context) => {
			tracker.track("retry", context.retryAttemptCount);

			if (context.retryAttemptCount === 1) {
				const result = await context.options.refetch();
				tracker.track("refetch-result", result?.data);
			}
		},
		retryAttempts: 2,
		retryDelay: 10,
	});
});
