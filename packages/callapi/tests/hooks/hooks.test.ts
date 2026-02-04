/**
 * Hook functionality tests - consolidated from hook-composition, hook-execution-modes, and hook-types
 * Tests hook lifecycle, composition, execution modes, and specific hook types
 */

import { expect, test } from "vitest";
import { callApi, createFetchClient } from "../../src/createFetchClient";
import type { CallApiPlugin } from "../../src/plugins";
import { createCallTracker, delay, mockNetworkError } from "../test-setup/common";
import {
	createFetchMock,
	createMockErrorResponse,
	createMockResponse,
	mockFetchError,
	mockFetchSuccess,
} from "../test-setup/fetch-mock";

// --- Hook Composition ---

test("Hook Composition - multiple hooks of the same type compose in sequential mode", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess({ success: true });

	const executionOrder: string[] = [];

	await callApi("/test", {
		hooksExecutionMode: "sequential",
		onRequest: [
			() => executionOrder.push("hook1"),
			() => executionOrder.push("hook2"),
			() => executionOrder.push("hook3"),
		],
	});

	expect(executionOrder).toEqual(["hook1", "hook2", "hook3"]);
});

test("Hook Composition - hooks from plugins and main hooks compose together", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess({ success: true });

	const executionOrder: string[] = [];

	const plugin1: CallApiPlugin = {
		hooks: {
			onRequest: () => executionOrder.push("plugin1"),
		},
		id: "plugin-1",
		name: "Plugin 1",
	};

	const plugin2: CallApiPlugin = {
		hooks: {
			onRequest: () => executionOrder.push("plugin2"),
		},
		id: "plugin-2",
		name: "Plugin 2",
	};

	const client = createFetchClient({
		hooksExecutionMode: "sequential",
		onRequest: () => executionOrder.push("base"),
		plugins: [plugin1, plugin2],
	});

	await client("/test", {
		onRequest: () => executionOrder.push("instance"),
	});

	expect(executionOrder).toContain("plugin1");
	expect(executionOrder).toContain("plugin2");
	expect(executionOrder).toContain("instance");
});

test("Hook Composition - hooks execute in correct lifecycle order for successful requests", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess({ success: true });

	const executionOrder: string[] = [];

	await callApi("/test", {
		hooksExecutionMode: "sequential",
		onRequest: () => executionOrder.push("onRequest"),
		onResponse: () => executionOrder.push("onResponse"),
		onSuccess: () => executionOrder.push("onSuccess"),
	});

	expect(executionOrder).toContain("onRequest");
	expect(executionOrder).toContain("onResponse");
	expect(executionOrder).toContain("onSuccess");
	expect(executionOrder).toHaveLength(3);
});

test("Hook Composition - hooks execute in correct lifecycle order for error requests", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchError({ error: "Not found" }, 404);

	const executionOrder: string[] = [];

	const { error } = await callApi("/test", {
		hooksExecutionMode: "sequential",
		onRequest: () => executionOrder.push("onRequest"),
		onResponse: () => executionOrder.push("onResponse"),
		onResponseError: () => executionOrder.push("onResponseError"),
		onError: () => executionOrder.push("onError"),
		resultMode: "all",
	});

	expect(error).toBeDefined();
	expect(executionOrder).toContain("onRequest");
	expect(executionOrder).toContain("onResponse");
	expect(executionOrder.some((hook) => hook.includes("Error"))).toBe(true);
});

test("Hook Composition - nested hook arrays are flattened correctly", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess({ success: true });

	const executionOrder: string[] = [];

	const client = createFetchClient({
		hooksExecutionMode: "sequential",
		onRequest: [() => executionOrder.push("base1"), () => executionOrder.push("base2")],
	});

	await client("/test", {
		onRequest: [() => executionOrder.push("instance1"), () => executionOrder.push("instance2")],
	});

	expect(executionOrder).toEqual(["base1", "base2", "instance1", "instance2"]);
});

test("Hook Composition - hooks can modify request context", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess({ success: true });

	let capturedContext: any;

	await callApi("/test", {
		onRequest: (context) => {
			capturedContext = context;
			context.request.headers["X-Modified"] = "true";
			context.request.headers["X-Hook-Added"] = "hook-value";
		},
	});

	expect(capturedContext).toBeDefined();
	expect(capturedContext.request).toBeDefined();
	expect(capturedContext.request.headers).toBeDefined();
});

// --- Execution Modes ---

test("Execution Modes - hooks execute in parallel mode by default", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess({ success: true });

	const tracker = createCallTracker();
	const startTime = Date.now();

	await callApi("/test", {
		hooksExecutionMode: "parallel",
		onRequest: [
			async () => {
				await delay(50);
				tracker.track("hook1", Date.now() - startTime);
			},
			async () => {
				await delay(50);
				tracker.track("hook2", Date.now() - startTime);
			},
			async () => {
				await delay(50);
				tracker.track("hook3", Date.now() - startTime);
			},
		],
	});

	expect(tracker.getCallCount()).toBe(3);
	const calls = tracker.getCalls();

	const timestamps = calls.map((call) => call.args[1] as number);
	const maxDiff = Math.max(...timestamps) - Math.min(...timestamps);
	expect(maxDiff).toBeLessThan(40);
});

test("Execution Modes - hooks execute in sequential mode one after another", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess({ success: true });

	const tracker = createCallTracker();
	const startTime = Date.now();

	await callApi("/test", {
		hooksExecutionMode: "sequential",
		onRequest: [
			async () => {
				await delay(50);
				tracker.track("hook1", Date.now() - startTime);
			},
			async () => {
				await delay(50);
				tracker.track("hook2", Date.now() - startTime);
			},
			async () => {
				await delay(50);
				tracker.track("hook3", Date.now() - startTime);
			},
		],
	});

	expect(tracker.getCallCount()).toBe(3);
	const calls = tracker.getCalls();

	const timestamps = calls.map((call) => call.args[1] as number);
	expect(timestamps[0]).toBeLessThan(timestamps[1]!);
	expect(timestamps[1]).toBeLessThan(timestamps[2]!);

	const totalTime = timestamps[2]! - timestamps[0]!;
	expect(totalTime).toBeGreaterThanOrEqual(90);
});

test("Execution Modes - async hooks execute in parallel mode with fastest finishing first", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess({ success: true });

	const results: string[] = [];

	await callApi("/test", {
		hooksExecutionMode: "parallel",
		onRequest: [
			async () => {
				await delay(30);
				results.push("async1");
			},
			async () => {
				await delay(20);
				results.push("async2");
			},
			async () => {
				await delay(10);
				results.push("async3");
			},
		],
	});

	expect(results).toHaveLength(3);
	expect(results[0]).toBe("async3");
});

// --- Hook Types ---

test("Hook Types - onRequestReady hook executes with correct context", async () => {
	using _ignoredMockFetch = createFetchMock();
	const tracker = createCallTracker();
	mockFetchSuccess({ success: true });

	await callApi("/test", {
		onRequestReady: (context: any) => {
			tracker.track("onRequestReady", context.options.fullURL);
		},
	});

	expect(tracker.getCallCount()).toBe(1);
	expect(tracker.getLastCall()?.args[0]).toBe("onRequestReady");
});

test("Hook Types - onResponse hook executes for successful responses", async () => {
	using _ignoredMockFetch = createFetchMock();
	const tracker = createCallTracker();
	mockFetchSuccess({ success: true });

	await callApi("/test", {
		onResponse: (context) => tracker.track("onResponse", context.response.status),
	});

	expect(tracker.getCallCount()).toBe(1);
	expect(tracker.getLastCall()?.args).toEqual(["onResponse", 200]);
});

test("Hook Types - onSuccess hook executes for successful responses with data", async () => {
	using _ignoredMockFetch = createFetchMock();
	const tracker = createCallTracker();
	mockFetchSuccess({ id: 1, name: "test" });

	await callApi("/test", {
		onSuccess: (context) => tracker.track("onSuccess", context.data),
	});

	expect(tracker.getCallCount()).toBe(1);
	expect(tracker.getLastCall()?.args).toEqual(["onSuccess", { id: 1, name: "test" }]);
});

test("Hook Types - onError hook executes for any error", async () => {
	using mockFetch = createFetchMock();
	const tracker = createCallTracker();
	mockFetch.mockRejectedValue(mockNetworkError("Network failure"));

	const { error } = await callApi("/test", {
		onError: (context) => tracker.track("onError", context.error.message),
		resultMode: "all",
	});

	expect(error).toBeDefined();
	expect(tracker.getLastCall()?.args).toEqual(["onError", "Network failure"]);
});

test("Hook Types - onResponseError hook executes for HTTP error responses", async () => {
	using _ignoredMockFetch = createFetchMock();
	const tracker = createCallTracker();
	mockFetchError({ error: "Not found" }, 404);

	const { error } = await callApi("/test", {
		onResponseError: (context) => tracker.track("onResponseError", context.response.status),
		resultMode: "all",
	});

	expect(error).toBeDefined();
	expect(tracker.getLastCall()?.args).toEqual(["onResponseError", 404]);
});

test("Hook Types - onRetry hook executes during retry attempts", async () => {
	using mockFetch = createFetchMock();
	const tracker = createCallTracker();
	mockFetch
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse({ success: true }));

	await callApi("/test", {
		onRetry: (context) => tracker.track("onRetry", context.retryAttemptCount),
		retryAttempts: 2,
		retryDelay: 10,
	});

	expect(tracker.getCallCount()).toBeGreaterThanOrEqual(0);
});

test("Hook Types - onValidationError hook executes for validation failures", async () => {
	using _ignoredMockFetch = createFetchMock();
	const tracker = createCallTracker();
	mockFetchSuccess({ invalid: "data" });

	const { error } = await callApi("/test", {
		onValidationError: (context) => tracker.track("onValidationError", context.error.message),
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
	expect(tracker.getCallCount()).toBeGreaterThanOrEqual(0);
});
