/**
 * Retry logic tests
 * Tests retry strategies, conditions, and configuration options
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFetchClient } from "../src/createFetchClient";
import { expectFetchCallCount, mockFetchSequence, resetFetchMock } from "./fetch-mock";

describe("Retry Logic", () => {
	beforeEach(() => {
		resetFetchMock();
		vi.clearAllTimers();
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("Linear Retry Strategy", () => {
		it("should retry with fixed delays using linear strategy", async () => {
			const client = createFetchClient({
				retryAttempts: 3,
				retryDelay: 1000,
				retryStatusCodes: [500],
				retryStrategy: "linear",
			});

			// Mock sequence: 3 failures, then success
			mockFetchSequence([
				{ data: { error: "Server error" }, status: 500 },
				{ data: { error: "Server error" }, status: 500 },
				{ data: { error: "Server error" }, status: 500 },
				{ data: { success: true }, status: 200 },
			]);

			const startTime = Date.now();
			const promise = client("/test");

			// Fast-forward through all delays
			await vi.runAllTimersAsync();

			const result = await promise;
			const endTime = Date.now();

			// Should have made 4 calls total (3 retries + 1 success)
			expectFetchCallCount(4);

			// Should succeed after retries
			expect(result.data).toEqual({ success: true });
			expect(result.error).toBeNull();

			// Should have waited for delays (3 delays of 1000ms each)
			expect(endTime - startTime).toBeGreaterThanOrEqual(3000);
		});

		it("should use custom delay function with linear strategy", async () => {
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

			// Should call delay function for each retry attempt
			expect(delayFn).toHaveBeenCalledTimes(2);
			expect(delayFn).toHaveBeenCalledWith(1); // First retry
			expect(delayFn).toHaveBeenCalledWith(2); // Second retry
		});

		it("should respect default linear delay when no delay specified", async () => {
			const client = createFetchClient({
				retryAttempts: 1,
				retryStatusCodes: [500],
				retryStrategy: "linear",
			});

			mockFetchSequence([
				{ data: { error: "Server error" }, status: 500 },
				{ data: { success: true }, status: 200 },
			]);

			const startTime = Date.now();
			const promise = client("/test");
			await vi.runAllTimersAsync();
			await promise;

			const endTime = Date.now();

			// Should use default delay of 1000ms
			expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
		});
	});

	describe("Exponential Retry Strategy", () => {
		it("should retry with exponential backoff", async () => {
			const client = createFetchClient({
				retryAttempts: 3,
				retryDelay: 100, // Base delay
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

			// Exponential delays: 100ms, 200ms, 400ms = 700ms total
			expect(endTime - startTime).toBeGreaterThanOrEqual(700);
			expectFetchCallCount(4);
		});

		it("should respect maximum delay limit with exponential strategy", async () => {
			const client = createFetchClient({
				retryAttempts: 5,
				retryDelay: 1000,
				retryMaxDelay: 2000, // Cap at 2 seconds
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

			// Delays should be capped: 1000ms, 2000ms (capped), 2000ms (capped) = 5000ms
			expect(endTime - startTime).toBeGreaterThanOrEqual(5000);
			expect(endTime - startTime).toBeLessThan(8000); // Should not exceed if uncapped
		});

		it("should use custom delay function with exponential strategy", async () => {
			const delayFn = vi.fn((attemptCount: number) => attemptCount * 200);

			const client = createFetchClient({
				retryAttempts: 2,
				retryDelay: delayFn,
				retryMaxDelay: 5000,
				retryStatusCodes: [500],
				retryStrategy: "exponential",
			});

			mockFetchSequence([
				{ data: { error: "Server error" }, status: 500 },
				{ data: { error: "Server error" }, status: 500 },
				{ data: { success: true }, status: 200 },
			]);

			const promise = client("/test");
			await vi.runAllTimersAsync();
			await promise;

			// Should call delay function and apply exponential calculation
			expect(delayFn).toHaveBeenCalledTimes(2);
			expect(delayFn).toHaveBeenCalledWith(1);
			expect(delayFn).toHaveBeenCalledWith(2);
		});
	});

	describe("Retry Condition Evaluation", () => {
		it("should use custom retry condition", async () => {
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

			// Should call custom retry condition for each retry attempt
			expect(retryCondition).toHaveBeenCalledTimes(2);

			// Should receive error context with proper structure
			expect(retryCondition).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.objectContaining({
						errorData: { error: "Server error" },
						name: "HTTPError",
					}),
					response: expect.objectContaining({ status: 500 }),
				})
			);
		});

		it("should handle async retry conditions", async () => {
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
		});

		it("should use default retry condition when none specified", async () => {
			const client = createFetchClient({
				retryAttempts: 1,
				retryStatusCodes: [500],
			});

			mockFetchSequence([
				{ data: { error: "Server error" }, status: 500 },
				{ data: { success: true }, status: 200 },
			]);

			const promise = client("/test");
			await vi.runAllTimersAsync();
			const result = await promise;

			// Should retry with default condition (always true)
			expectFetchCallCount(2);
			expect(result.data).toEqual({ success: true });
		});
	});

	describe("Method-based Retry Filtering", () => {
		it("should use default retry methods when none specified", async () => {
			const client = createFetchClient({
				retryAttempts: 1,
				retryStatusCodes: [500],
			});

			// Test GET (default allowed method)
			mockFetchSequence([
				{ data: { error: "Server error" }, status: 500 },
				{ data: { success: true }, status: 200 },
			]);

			const promise = client("/test", { method: "GET" });
			await vi.runAllTimersAsync();
			const result = await promise;

			expect(result.data).toEqual({ success: true });
			expectFetchCallCount(2); // Should retry GET by default
		});
	});

	describe("Status Code-based Retry Triggers", () => {
		it("should retry on any status code when retryStatusCodes is empty", async () => {
			const client = createFetchClient({
				retryAttempts: 1,
				retryStatusCodes: [], // Empty array means retry on any error status
			});

			// Should retry on 404
			mockFetchSequence([
				{ data: { error: "Not found" }, status: 404 },
				{ data: { success: true }, status: 200 },
			]);

			const promise = client("/test");
			await vi.runAllTimersAsync();
			const result = await promise;

			expect(result.data).toEqual({ success: true });
			expectFetchCallCount(2);
		});

		it("should handle multiple status codes", async () => {
			const client = createFetchClient({
				retryAttempts: 1,
				retryStatusCodes: [500, 502, 503, 504],
			});

			// Test each status code
			const statusCodes = [500, 502, 503, 504];

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
		});
	});

	describe("Maximum Retry Attempt Limits", () => {
		it("should respect maximum retry attempts", async () => {
			const client = createFetchClient({
				retryAttempts: 2,
				retryStatusCodes: [500],
			});

			// Mock 3 failures (more than retry limit)
			mockFetchSequence([
				{ data: { error: "Server error" }, status: 500 },
				{ data: { error: "Server error" }, status: 500 },
				{ data: { error: "Server error" }, status: 500 },
			]);

			const promise = client("/test");
			await vi.runAllTimersAsync();
			const result = await promise;

			// Should return error result after exhausting retries
			expect(result.error).toBeDefined();
			expect(result.error?.name).toBe("HTTPError");
			expect(result.data).toBeNull();

			// Should make 3 calls total (1 original + 2 retries)
			expectFetchCallCount(3);
		});

		it("should handle high retry attempt counts", async () => {
			const client = createFetchClient({
				retryAttempts: 10,
				retryDelay: 10, // Short delay for test speed
				retryStatusCodes: [500],
			});

			// Mock 5 failures then success
			mockFetchSequence([
				{ data: { error: "Server error" }, status: 500 },
				{ data: { error: "Server error" }, status: 500 },
				{ data: { error: "Server error" }, status: 500 },
				{ data: { error: "Server error" }, status: 500 },
				{ data: { error: "Server error" }, status: 500 },
				{ data: { success: true }, status: 200 },
			]);

			const promise = client("/test");
			await vi.runAllTimersAsync();
			const result = await promise;

			expect(result.data).toEqual({ success: true });
			expectFetchCallCount(6); // 1 original + 5 retries
		});

		it("should track retry attempt count correctly", async () => {
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

			// Should call retry condition 3 times
			expect(retryCondition).toHaveBeenCalledTimes(3);

			// Each call should have the correct attempt count context
			const calls = retryCondition.mock.calls;
			expect(calls).toHaveLength(3);
		});
	});

	describe("Error Handling and Edge Cases", () => {
		it("should handle retry with custom delay function returning zero", async () => {
			const delayFn = vi.fn().mockReturnValue(0); // Zero delay

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

			const startTime = Date.now();
			const promise = client("/test");
			await vi.runAllTimersAsync();
			const result = await promise;

			const endTime = Date.now();

			// Should succeed with minimal delay
			expect(result.data).toEqual({ success: true });
			expect(delayFn).toHaveBeenCalledTimes(2);
			expect(endTime - startTime).toBeLessThan(100); // Very fast due to zero delay
		});

		it("should handle retry with very large delay values", async () => {
			const client = createFetchClient({
				retryAttempts: 1,
				retryDelay: 50000, // Large delay
				retryMaxDelay: 100, // But capped at 100ms
				retryStatusCodes: [500],
				retryStrategy: "exponential",
			});

			mockFetchSequence([
				{ data: { error: "Server error" }, status: 500 },
				{ data: { success: true }, status: 200 },
			]);

			const startTime = Date.now();
			const promise = client("/test");
			await vi.runAllTimersAsync();
			const result = await promise;

			const endTime = Date.now();

			// Should be capped by maxDelay
			expect(result.data).toEqual({ success: true });
			expect(endTime - startTime).toBeGreaterThanOrEqual(100);
			expect(endTime - startTime).toBeLessThan(200); // Should not use the large delay
		});

		it("should handle retry with no response status", async () => {
			const client = createFetchClient({
				retryAttempts: 1,
				retryStatusCodes: [500],
			});

			// Mock a network error (no response)
			vi.mocked(globalThis.fetch).mockRejectedValueOnce(new TypeError("Network error"));
			mockFetchSequence([{ data: { success: true }, status: 200 }]);

			const promise = client("/test");
			await vi.runAllTimersAsync();
			const result = await promise;

			// Should retry non-http errors - all errors retry by default unless response has status code not in retryStatusCodes
			expect(result.data).toEqual({ success: true });
			expectFetchCallCount(2); // Should retry network error and succeed
		});

		it("should handle retry with empty status codes array", async () => {
			const client = createFetchClient({
				retryAttempts: 1,
				retryStatusCodes: [], // Empty array should retry on any error status
			});

			mockFetchSequence([
				{ data: { error: "Not found" }, status: 404 },
				{ data: { success: true }, status: 200 },
			]);

			const promise = client("/test");
			await vi.runAllTimersAsync();
			const result = await promise;

			expect(result.data).toEqual({ success: true });
			expectFetchCallCount(2); // Should retry on 404 when array is empty
		});

		it("should handle retry with method not in allowed methods", async () => {
			const client = createFetchClient({
				retryAttempts: 1,
				retryMethods: ["GET"], // Only allow GET
				retryStatusCodes: [500],
			});

			mockFetchSequence([{ data: { error: "Server error" }, status: 500 }]);

			const promise = client("/test", { method: "POST" }); // POST not allowed
			await vi.runAllTimersAsync();
			const result = await promise;

			// Should not retry POST when only GET is allowed
			expect(result.error).toBeDefined();
			expectFetchCallCount(1); // No retry should occur
		});

		it("should handle retry with zero attempts", async () => {
			const client = createFetchClient({
				retryAttempts: 0, // No retries allowed
				retryStatusCodes: [500],
			});

			mockFetchSequence([{ data: { error: "Server error" }, status: 500 }]);

			const promise = client("/test");
			await vi.runAllTimersAsync();
			const result = await promise;

			// Should not retry when attempts is 0
			expect(result.error).toBeDefined();
			expectFetchCallCount(1); // No retry should occur
		});

		it("should handle retry condition returning false", async () => {
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

			// Should not retry when condition returns false
			expect(result.error).toBeDefined();
			expect(retryCondition).toHaveBeenCalledTimes(1);
			expectFetchCallCount(1); // No retry should occur
		});

		it("should handle exponential backoff with very high attempt count", async () => {
			const client = createFetchClient({
				retryAttempts: 1,
				retryDelay: 1000,
				retryMaxDelay: 2000,
				retryStatusCodes: [500],
				retryStrategy: "exponential",
			});

			mockFetchSequence([
				{ data: { error: "Server error" }, status: 500 },
				{ data: { success: true }, status: 200 },
			]);

			const startTime = Date.now();
			const promise = client("/test");
			await vi.runAllTimersAsync();
			await promise;

			const endTime = Date.now();

			// Should respect max delay even with exponential growth
			expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
			expect(endTime - startTime).toBeLessThan(3000); // Should be capped at maxDelay
		});
	});
});
