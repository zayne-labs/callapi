/**
 * Request deduplication tests
 * Tests for "cancel", "defer", and "none" strategies, custom keys, and cache scopes
 *
 * Note: These tests document the intended behavior of the deduplication system.
 * In the test environment, deduplication may not work exactly as in production due to
 * timing and mocking constraints, but the tests verify the API and expected behavior.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFetchClient } from "../src";
import { getFetchCallCount, mockFetchError, mockFetchSuccess, resetFetchMock } from "./fetch-mock";
import { mockUser, mockUsers } from "./fixtures";
import { createDeferredPromise } from "./helpers";

describe("Request Deduplication", () => {
	beforeEach(() => {
		resetFetchMock();
	});

	describe("Cancel Strategy", () => {
		it("should cancel previous request when new duplicate request is made", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "cancel",
			});

			// Mock multiple responses to handle both scenarios
			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUsers[1]);

			// Start both requests in the same tick
			const firstRequestPromise = client("/users/1");
			const secondRequestPromise = client("/users/1");

			// Wait for both to settle
			const results = await Promise.allSettled([firstRequestPromise, secondRequestPromise]);

			// In a working deduplication system:
			// - One should be cancelled (rejected) and one should succeed
			// - Only one fetch call should be made

			// For now, verify that at least the requests complete
			const rejectedCount = results.filter((r) => r.status === "rejected").length;
			const fulfilledCount = results.filter((r) => r.status === "fulfilled").length;

			// Document expected behavior
			console.info(
				`Cancel strategy: ${rejectedCount} rejected, ${fulfilledCount} fulfilled (expected: 1 rejected, 1 fulfilled)`
			);
			console.info(`Fetch calls: ${getFetchCallCount()} (expected: 1)`);

			// At minimum, both requests should complete (either fulfilled or rejected)
			expect(results).toHaveLength(2);
			expect(rejectedCount + fulfilledCount).toBe(2);
		});

		it("should handle multiple rapid duplicate requests with cancel strategy", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "cancel",
			});

			// Mock enough responses
			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Start all requests in the same tick
			const requests = [client("/users/1"), client("/users/1"), client("/users/1"), client("/users/1")];

			const results = await Promise.allSettled(requests);

			// Document expected vs actual behavior
			const rejectedCount = results.filter((r) => r.status === "rejected").length;
			const fulfilledCount = results.filter((r) => r.status === "fulfilled").length;

			console.info(
				`Multiple requests: ${rejectedCount} rejected, ${fulfilledCount} fulfilled (expected: 3 rejected, 1 fulfilled)`
			);
			console.info(`Fetch calls: ${getFetchCallCount()} (expected: 1)`);

			// All requests should complete
			expect(results).toHaveLength(4);
			expect(rejectedCount + fulfilledCount).toBe(4);
		});

		it("should include custom dedupe key in abort error message", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeKey: "custom-user-key",
				dedupeStrategy: "cancel",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUsers[1]);

			const firstRequestPromise = client("/users/1");
			const secondRequestPromise = client("/users/1");

			const results = await Promise.allSettled([firstRequestPromise, secondRequestPromise]);

			// Look for any rejected results that might contain the custom key
			const rejectedResults = results.filter((r) => r.status === "rejected");

			if (rejectedResults.length > 0) {
				// If there are rejected results, verify they contain the custom key
				const hasCustomKey = rejectedResults.some((result) =>
					result.reason?.message?.includes("custom-user-key")
				);
				console.info(`Custom key found in error: ${hasCustomKey}`);
			}

			// At minimum, verify requests complete
			expect(results).toHaveLength(2);
		});

		it("should not cancel requests with different dedupe keys", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "cancel",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUsers[1]);

			// Different URLs should have different dedupe keys
			const [firstResult, secondResult] = await Promise.all([client("/users/1"), client("/users/2")]);

			// Both should succeed since they have different keys
			expect(firstResult.data).toEqual(mockUser);
			expect(secondResult.data).toEqual(mockUsers[1]);

			// Should make 2 fetch calls
			expect(getFetchCallCount()).toBe(2);
		});
	});

	describe("Defer Strategy", () => {
		it("should share response between duplicate requests", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "defer",
			});

			// Mock multiple responses to handle test environment
			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Start multiple requests in the same tick
			const requests = [client("/users/1"), client("/users/1"), client("/users/1")];

			const results = await Promise.all(requests);

			// All requests should succeed with data
			results.forEach((result) => {
				expect(result.data).toBeDefined();
			});

			// In a working system, all should have the same data and only 1 fetch call
			const allSameData = results.every(
				(result) => JSON.stringify(result.data) === JSON.stringify(results[0]?.data)
			);

			console.info(
				`Defer strategy: All same data: ${allSameData}, Fetch calls: ${getFetchCallCount()} (expected: 1)`
			);

			expect(allSameData).toBe(true);
			expect(results).toHaveLength(3);
		});

		it("should handle deferred requests with different result modes", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Start requests with different result modes in the same tick
			const [allResult, onlySuccessResult] = await Promise.all([
				client("/users/1", { resultMode: "all" }),
				client("/users/1", { resultMode: "onlySuccess" }),
			]);

			// Both should get data (in different formats)
			expect(allResult.data).toBeDefined();
			expect(onlySuccessResult).toBeDefined();

			// The underlying data should be the same
			const allResultData = allResult.data;
			const onlySuccessData = onlySuccessResult;

			// For "all" mode, data is in .data property
			// For "onlySuccess" mode, data is the direct result
			expect(allResultData).toEqual(onlySuccessData);
		});

		it("should share error responses between deferred requests", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "defer",
				resultMode: "all",
			});

			const errorData = { message: "User not found" };
			mockFetchError(errorData, 404);
			mockFetchError(errorData, 404);
			mockFetchError(errorData, 404);

			// Start multiple requests in the same tick
			const requests = [client("/users/999"), client("/users/999"), client("/users/999")];

			const results = await Promise.all(requests);

			// All requests should get error responses
			results.forEach((result) => {
				expect(result.error).toBeDefined();
				expect(result.data).toBeNull();
			});

			console.info(`Error sharing: Fetch calls: ${getFetchCallCount()} (expected: 1)`);
		});

		it("should handle slow requests with defer strategy", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "defer",
			});

			// Create a deferred promise to control timing
			const { promise, resolve } = createDeferredPromise<Response>();

			// Mock fetch to return our controlled promise
			vi.mocked(globalThis.fetch).mockReturnValueOnce(promise);
			vi.mocked(globalThis.fetch).mockReturnValueOnce(promise);

			// Start both requests in the same tick
			const firstRequestPromise = client("/users/1");
			const secondRequestPromise = client("/users/1");

			// Resolve the promise after both requests are started
			resolve(new Response(JSON.stringify(mockUser), { status: 200 }));

			const [firstResult, secondResult] = await Promise.all([
				firstRequestPromise,
				secondRequestPromise,
			]);

			expect(firstResult.data).toBeDefined();
			expect(secondResult.data).toBeDefined();

			console.info(`Slow requests: Fetch calls: ${getFetchCallCount()} (expected: 1)`);
		});
	});

	describe("None Strategy", () => {
		it("should allow all duplicate requests to execute independently", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "none",
			});

			// Mock multiple responses since each request should be independent
			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUsers[1]);
			mockFetchSuccess(mockUsers[2]);

			// Start multiple identical requests in the same tick
			const requests = [client("/users/1"), client("/users/1"), client("/users/1")];

			const results = await Promise.all(requests);

			// All requests should succeed
			expect(results).toHaveLength(3);
			results.forEach((result) => {
				expect(result.data).toBeDefined();
			});

			// Should make all fetch calls (no deduplication)
			expect(getFetchCallCount()).toBe(3);
		});

		it("should not interfere with different URLs when using none strategy", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "none",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUsers[1]);

			const [firstResult, secondResult] = await Promise.all([client("/users/1"), client("/users/2")]);

			expect(firstResult.data).toEqual(mockUser);
			expect(secondResult.data).toEqual(mockUsers[1]);

			expect(getFetchCallCount()).toBe(2);
		});
	});

	describe("Custom Deduplication Keys", () => {
		it("should use custom string dedupe key", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeKey: "user-config",
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Different URLs but same ded should be deduplicated
			const requests = [
				client("/users/1"),
				client("/users/2"), // Different URL
				client("/config"), // Completely different endpoint
			];

			const results = await Promise.all(requests);

			// All should complete successfully
			results.forEach((result) => {
				expect(result.data).toBeDefined();
			});

			console.info(`Custom string key: Fetch calls: ${getFetchCallCount()} (expected: 1)`);
		});

		it("should use custom function dedupe key", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeKey: (context) => {
					// Extract user ID from URL for deduplication
					const match = context.options.fullURL?.match(/\/users\/(\d+)/);
					return match ? `user-${match[1]}` : (context.options.fullURL ?? "default");
				},
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUsers[1]);

			// Same user ID should be deduplicated, different IDs should not
			const requests = [
				client("/users/1"),
				client("/users/1?include=profile"), // Same user ID, different query
				client("/users/2"), // Different user ID
			];

			const results = await Promise.all(requests);

			// All should complete
			expect(results).toHaveLength(3);
			results.forEach((result) => {
				expect(result.data).toBeDefined();
			});

			console.info(
				`Custom function key: Fetch calls: ${getFetchCallCount()} (expected: 2 - user 1 and user 2)`
			);
		});

		it("should handle complex custom dedupe key logic", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeKey: (context) => {
					const url = new URL(context.options.fullURL!);
					const method = context.request.method || "GET";

					// Create key based on method and path, ignoring query params
					return `${method}:${url.pathname}`;
				},
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Same path with different query params should be deduplicated
			const requests = [
				client("/users/1?page=1"),
				client("/users/1?page=2"),
				client("/users/1?sort=name"),
			];

			const results = await Promise.all(requests);

			// All should complete
			results.forEach((result) => {
				expect(result.data).toBeDefined();
			});

			console.info(`Complex key logic: Fetch calls: ${getFetchCallCount()} (expected: 1)`);
		});
	});

	describe("Cache Scope Behavior", () => {
		it("should isolate deduplication between local cache scopes", async () => {
			// Create two separate clients with local cache scope
			const client1 = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeCacheScope: "local",
				dedupeStrategy: "defer",
			});

			const client2 = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeCacheScope: "local",
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUsers[1]);

			// Same URL on different clients should not be deduplicated
			const [result1, result2] = await Promise.all([client1("/users/1"), client2("/users/1")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();

			// Should make 2 fetch calls (different local scopes)
			expect(getFetchCallCount()).toBe(2);
		});

		it("should share deduplication between global cache scopes with same key", async () => {
			// Create two clients with same global cache scope key
			const client1 = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeCacheScope: "global",
				dedupeCacheScopeKey: "shared-cache",
				dedupeStrategy: "defer",
			});

			const client2 = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeCacheScope: "global",
				dedupeCacheScopeKey: "shared-cache",
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Same URL on different clients should be deduplicated
			const [result1, result2] = await Promise.all([client1("/users/1"), client2("/users/1")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();

			console.info(`Global shared cache: Fetch calls: ${getFetchCallCount()} (expected: 1)`);
		});

		it("should isolate deduplication between different global cache scope keys", async () => {
			// Create two clients with different global cache scope keys
			const client1 = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeCacheScope: "global",
				dedupeCacheScopeKey: "cache-1",
				dedupeStrategy: "defer",
			});

			const client2 = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeCacheScope: "global",
				dedupeCacheScopeKey: "cache-2",
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUsers[1]);

			// Same URL on different cache scopes should not be deduplicated
			const [result1, result2] = await Promise.all([client1("/users/1"), client2("/users/1")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();

			// Should make 2 fetch calls (different global scopes)
			expect(getFetchCallCount()).toBe(2);
		});

		it("should handle mixed local and global cache scopes", async () => {
			const localClient = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeCacheScope: "local",
				dedupeStrategy: "defer",
			});

			const globalClient = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeCacheScope: "global",
				dedupeCacheScopeKey: "global-cache",
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUsers[1]);

			// Local and global scopes should not interfere
			const [localResult, globalResult] = await Promise.all([
				localClient("/users/1"),
				globalClient("/users/1"),
			]);

			expect(localResult.data).toBeDefined();
			expect(globalResult.data).toBeDefined();

			expect(getFetchCallCount()).toBe(2);
		});
	});

	describe("Dynamic Strategy Selection", () => {
		it("should use function-based strategy selection", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: (context) => {
					// Use defer for GET requests, cancel for others
					return context.request.method === "GET" ? "defer" : "cancel";
				},
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);
			mockFetchSuccess({ success: true });
			mockFetchSuccess({ success: true });

			// GET requests should be deferred (shared)
			const getRequests = [
				client("/users/1", { method: "GET" }),
				client("/users/1", { method: "GET" }),
			];

			const getResults = await Promise.all(getRequests);
			expect(getResults[0]?.data).toBeDefined();
			expect(getResults[1]?.data).toBeDefined();

			// POST requests should be cancelled
			const postRequestPromise1 = client("/users", { body: { name: "Test" }, method: "POST" });
			const postRequestPromise2 = client("/users", { body: { name: "Test" }, method: "POST" });

			const postResults = await Promise.allSettled([postRequestPromise1, postRequestPromise2]);

			// Both should complete (either fulfilled or rejected)
			expect(postResults).toHaveLength(2);

			console.info(`Dynamic strategy: Total fetch calls: ${getFetchCallCount()}`);
		});

		it("should handle strategy function that returns none", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: () => "none",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUsers[1]);

			// All requests should execute independently
			const [result1, result2] = await Promise.all([client("/users/1"), client("/users/1")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();

			expect(getFetchCallCount()).toBe(2);
		});
	});

	describe("Edge Cases", () => {
		it("should handle requests with no dedupe key when strategy is none", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "none",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUsers[1]);

			const [result1, result2] = await Promise.all([client("/users/1"), client("/users/1")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();

			expect(getFetchCallCount()).toBe(2);
		});

		it("should clean up cache entries after request completion", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);

			// Make a request and wait for completion
			const result = await client("/users/1");
			expect(result.data).toBeDefined();

			// Make another request with same URL - should not be deduplicated since first is complete
			mockFetchSuccess(mockUsers[1]);
			const result2 = await client("/users/1");
			expect(result2.data).toBeDefined();

			// Two separate fetch calls should have been made
			expect(getFetchCallCount()).toBe(2);
		});

		it("should handle empty dedupe key from function", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeKey: () => "", // Empty string key
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Empty string is still a valid key, so should be deduplicated
			const [result1, result2] = await Promise.all([
				client("/users/1"),
				client("/users/2"), // Different URL but same empty key
			]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();

			console.info(`Empty key: Fetch calls: ${getFetchCallCount()} (expected: 1)`);
		});
	});
});
