/**
 * Retry functionality tests - consolidated from retry-conditions, retry-filtering, and retry-strategies
 * Tests retry conditions, filtering triggers, and delay strategies
 */

import { expect, test, vi } from "vitest";
import { createFetchClient } from "../../src/createFetchClient";
import {
	createFetchMock,
	expectFetchCallCount,
	mockFetchSequence,
	resetFetchMock,
} from "../test-setup/fetch-mock";

// --- Retry Conditions ---

test("Retry Conditions - uses custom retry condition correctly", async () => {
	using _ignoredMockFetch = createFetchMock();
	vi.useFakeTimers({ shouldAdvanceTime: true });

	const retryCondition = vi.fn().mockResolvedValue(true);

	const client = createFetchClient({
		retryAttempts: 2,
		retryCondition,
		retryStatusCodes: [500],
	});

	mockFetchSequence([
		{ data: { error: "Server error" }, status: 500 },
		{ data: { error: "Server error" }, status: 500 },
		{ data: { success: true }, status: 200 },
	]);

	const promise = client("/test");
	await vi.runAllTimersAsync();
	await promise;

	expect(retryCondition).toHaveBeenCalledTimes(2);
	expect(retryCondition).toHaveBeenCalledWith(
		expect.objectContaining({
			error: expect.objectContaining({
				errorData: { error: "Server error" },
				name: "HTTPError",
			}),
			response: expect.objectContaining({ status: 500 }),
		})
	);

	vi.useRealTimers();
});

test("Retry Conditions - handles async retry conditions correctly", async () => {
	using _ignoredMockFetch = createFetchMock();
	vi.useFakeTimers({ shouldAdvanceTime: true });

	const retryCondition = vi.fn().mockImplementation(async () => {
		await new Promise((resolve) => setTimeout(resolve, 50));
		return true;
	});

	const client = createFetchClient({
		retryAttempts: 1,
		retryCondition,
		retryStatusCodes: [500],
	});

	mockFetchSequence([
		{ data: { error: "Server error" }, status: 500 },
		{ data: { success: true }, status: 200 },
	]);

	const promise = client("/test");
	await vi.runAllTimersAsync();
	await promise;

	expect(retryCondition).toHaveBeenCalledTimes(1);
	expectFetchCallCount(2);

	vi.useRealTimers();
});

test("Retry Conditions - handles retry condition returning false", async () => {
	using _ignoredMockFetch = createFetchMock();
	vi.useFakeTimers({ shouldAdvanceTime: true });

	const retryCondition = vi.fn().mockResolvedValue(false);

	const client = createFetchClient({
		retryAttempts: 2,
		retryCondition,
		retryStatusCodes: [500],
	});

	mockFetchSequence([{ data: { error: "Server error" }, status: 500 }]);

	const promise = client("/test");
	await vi.runAllTimersAsync();
	const result = await promise;

	expect(result.error).toBeDefined();
	expect(retryCondition).toHaveBeenCalledTimes(1);
	expectFetchCallCount(1);

	vi.useRealTimers();
});

test("Retry Conditions - tracks retry attempt count accurately in condition context", async () => {
	using _ignoredMockFetch = createFetchMock();
	vi.useFakeTimers({ shouldAdvanceTime: true });

	const retryCondition = vi.fn().mockResolvedValue(true);

	const client = createFetchClient({
		retryAttempts: 3,
		retryCondition,
		retryStatusCodes: [500],
	});

	mockFetchSequence([
		{ data: { error: "Server error" }, status: 500 },
		{ data: { error: "Server error" }, status: 500 },
		{ data: { error: "Server error" }, status: 500 },
		{ data: { success: true }, status: 200 },
	]);

	const promise = client("/test");
	await vi.runAllTimersAsync();
	await promise;

	expect(retryCondition).toHaveBeenCalledTimes(3);
	const calls = retryCondition.mock.calls;
	expect(calls).toHaveLength(3);
	// eslint-disable-next-line ts-eslint/no-deprecated
	expect(calls[0]![0].options["~retryAttemptCount"] ?? 1).toBe(1);
	// eslint-disable-next-line ts-eslint/no-deprecated
	expect(calls[1]![0].options["~retryAttemptCount"]).toBe(2);
	// eslint-disable-next-line ts-eslint/no-deprecated
	expect(calls[2]![0].options["~retryAttemptCount"]).toBe(3);

	vi.useRealTimers();
});

// --- Retry Filtering ---

test("Retry Filtering - retries on specified status codes", async () => {
	using _ignoredMockFetch = createFetchMock();
	vi.useFakeTimers({ shouldAdvanceTime: true });

	const statusCodes = [500, 502, 503, 504];
	const client = createFetchClient({
		retryAttempts: 1,
		retryStatusCodes: statusCodes,
	});

	for (const statusCode of statusCodes) {
		resetFetchMock();
		mockFetchSequence([
			{ data: { error: "Server error" }, status: statusCode },
			{ data: { success: true }, status: 200 },
		]);

		const promise = client("/test");
		await vi.runAllTimersAsync();
		const result = await promise;

		expect(result.data).toEqual({ success: true });
		expectFetchCallCount(2);
	}

	vi.useRealTimers();
});

test("Retry Filtering - retries on any error status when retryStatusCodes is empty", async () => {
	using _ignoredMockFetch = createFetchMock();
	vi.useFakeTimers({ shouldAdvanceTime: true });

	const client = createFetchClient({
		retryAttempts: 1,
		retryStatusCodes: [],
	});

	mockFetchSequence([
		{ data: { error: "Not found" }, status: 404 },
		{ data: { success: true }, status: 200 },
	]);

	const promise = client("/test");
	await vi.runAllTimersAsync();
	const result = await promise;

	expect(result.data).toEqual({ success: true });
	expectFetchCallCount(2);

	vi.useRealTimers();
});

test("Retry Filtering - respects allowed retry methods", async () => {
	using _ignoredMockFetch = createFetchMock();
	vi.useFakeTimers({ shouldAdvanceTime: true });

	const client = createFetchClient({
		retryAttempts: 1,
		retryMethods: ["GET"],
		retryStatusCodes: [500],
	});

	// Test allowed method (GET)
	mockFetchSequence([
		{ data: { error: "Server error" }, status: 500 },
		{ data: { success: true }, status: 200 },
	]);
	await client("/test", { method: "GET" });
	await vi.runAllTimersAsync();
	expectFetchCallCount(2);

	// Test disallowed method (POST)
	resetFetchMock();
	mockFetchSequence([{ data: { error: "Server error" }, status: 500 }]);
	const result = await client("/test", { method: "POST" });
	await vi.runAllTimersAsync();
	expect(result.error).toBeDefined();
	expectFetchCallCount(1);

	vi.useRealTimers();
});

test("Retry Filtering - handles network errors with retries", async () => {
	using mockFetch = createFetchMock();
	vi.useFakeTimers({ shouldAdvanceTime: true });

	const client = createFetchClient({
		retryAttempts: 1,
		retryStatusCodes: [500],
	});

	mockFetch.mockRejectedValueOnce(new TypeError("Network error"));
	mockFetchSequence([{ data: { success: true }, status: 200 }]);

	const promise = client("/test");
	await vi.runAllTimersAsync();
	const result = await promise;

	expect(result.data).toEqual({ success: true });
	expectFetchCallCount(2);

	vi.useRealTimers();
});

test("Retry Filtering - respects maximum retry attempt limit", async () => {
	using _ignoredMockFetch = createFetchMock();
	vi.useFakeTimers({ shouldAdvanceTime: true });

	const client = createFetchClient({
		retryAttempts: 2,
		retryStatusCodes: [500],
	});

	mockFetchSequence([
		{ data: { error: "Server error" }, status: 500 },
		{ data: { error: "Server error" }, status: 500 },
		{ data: { error: "Server error" }, status: 500 },
	]);

	const promise = client("/test");
	await vi.runAllTimersAsync();
	const result = await promise;

	expect(result.error).toBeDefined();
	expectFetchCallCount(3);

	vi.useRealTimers();
});

// --- Retry Strategies ---

test("Retry Strategies - linear retry strategy retries with fixed delays", async () => {
	using _ignoredMockFetch = createFetchMock();
	vi.useFakeTimers({ shouldAdvanceTime: true });

	const client = createFetchClient({
		retryAttempts: 3,
		retryDelay: 1000,
		retryStatusCodes: [500],
		retryStrategy: "linear",
	});

	mockFetchSequence([
		{ data: { error: "Server error" }, status: 500 },
		{ data: { error: "Server error" }, status: 500 },
		{ data: { error: "Server error" }, status: 500 },
		{ data: { success: true }, status: 200 },
	]);

	const startTime = Date.now();
	const promise = client("/test");
	await vi.runAllTimersAsync();
	const result = await promise;
	const endTime = Date.now();

	expectFetchCallCount(4);
	expect(result.data).toEqual({ success: true });
	expect(endTime - startTime).toBeGreaterThanOrEqual(3000);

	vi.useRealTimers();
});

test("Retry Strategies - linear retry strategy uses custom delay function correctly", async () => {
	using _ignoredMockFetch = createFetchMock();
	vi.useFakeTimers({ shouldAdvanceTime: true });

	const delayFn = vi.fn((attemptCount: number) => attemptCount * 500);

	const client = createFetchClient({
		retryAttempts: 2,
		retryDelay: delayFn,
		retryStatusCodes: [500],
		retryStrategy: "linear",
	});

	mockFetchSequence([
		{ data: { error: "Server error" }, status: 500 },
		{ data: { error: "Server error" }, status: 500 },
		{ data: { success: true }, status: 200 },
	]);

	const promise = client("/test");
	await vi.runAllTimersAsync();
	await promise;

	expect(delayFn).toHaveBeenCalledTimes(2);
	expect(delayFn).toHaveBeenCalledWith(1);
	expect(delayFn).toHaveBeenCalledWith(2);

	vi.useRealTimers();
});

test("Retry Strategies - exponential retry strategy retries with backoff", async () => {
	using _ignoredMockFetch = createFetchMock();
	vi.useFakeTimers({ shouldAdvanceTime: true });

	const client = createFetchClient({
		retryAttempts: 3,
		retryDelay: 100,
		retryMaxDelay: 10000,
		retryStatusCodes: [500],
		retryStrategy: "exponential",
	});

	mockFetchSequence([
		{ data: { error: "Server error" }, status: 500 },
		{ data: { error: "Server error" }, status: 500 },
		{ data: { error: "Server error" }, status: 500 },
		{ data: { success: true }, status: 200 },
	]);

	const startTime = Date.now();
	const promise = client("/test");
	await vi.runAllTimersAsync();
	await promise;
	const endTime = Date.now();

	expect(endTime - startTime).toBeGreaterThanOrEqual(700);
	expectFetchCallCount(4);

	vi.useRealTimers();
});

test("Retry Strategies - exponential retry strategy respects maximum delay limit", async () => {
	using _ignoredMockFetch = createFetchMock();
	vi.useFakeTimers({ shouldAdvanceTime: true });

	const client = createFetchClient({
		retryAttempts: 5,
		retryDelay: 1000,
		retryMaxDelay: 2000,
		retryStatusCodes: [500],
		retryStrategy: "exponential",
	});

	mockFetchSequence([
		{ data: { error: "Server error" }, status: 500 },
		{ data: { error: "Server error" }, status: 500 },
		{ data: { error: "Server error" }, status: 500 },
		{ data: { success: true }, status: 200 },
	]);

	const startTime = Date.now();
	const promise = client("/test");
	await vi.runAllTimersAsync();
	await promise;
	const endTime = Date.now();

	expect(endTime - startTime).toBeGreaterThanOrEqual(5000);
	expect(endTime - startTime).toBeLessThan(8000);

	vi.useRealTimers();
});
