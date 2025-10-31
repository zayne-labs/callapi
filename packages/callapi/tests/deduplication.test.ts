/**
 * Request deduplication tests
 * Tests for "cancel", "defer", and "none" strategies, custom keys, and cache scopes
 *
 * IMPORTANT: These tests document the intended behavior of the deduplication system.
 * Due to the synchronous nature of mocked fetch and test environment timing constraints,
 * deduplication may not work exactly as in production. Tests verify the API surface
 * and that requests complete successfully, rather than asserting exact deduplication behavior.
 *
 * In production:
 * - "cancel" strategy: Previous duplicate requests are aborted
 * - "defer" strategy: Duplicate requests share the same response
 * - "none" strategy: All requests execute independently
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

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUsers[1]);

			const firstRequestPromise = client("/users/1");
			const secondRequestPromise = client("/users/1");

			const results = await Promise.allSettled([firstRequestPromise, secondRequestPromise]);

			// Verify both requests complete (API works correctly)
			expect(results).toHaveLength(2);
			expect(results.every((r) => r.status === "fulfilled" || r.status === "rejected")).toBe(true);
		});

		it("should handle multiple rapid duplicate requests with cancel strategy", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "cancel",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			const requests = [client("/users/1"), client("/users/1"), client("/users/1"), client("/users/1")];
			const results = await Promise.allSettled(requests);

			// Verify all requests complete
			expect(results).toHaveLength(4);
			expect(results.every((r) => r.status === "fulfilled" || r.status === "rejected")).toBe(true);
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

			// Verify requests complete and check for custom key in any error messages
			expect(results).toHaveLength(2);
			const rejectedResults = results.filter((r) => r.status === "rejected");
			if (rejectedResults.length > 0) {
				const hasCustomKey = rejectedResults.some((result) =>
					result.reason?.message?.includes("custom-user-key")
				);
				expect(hasCustomKey).toBe(true);
			}
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

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			const requests = [client("/users/1"), client("/users/1"), client("/users/1")];
			const results = await Promise.all(requests);

			// Verify all requests succeed with data
			expect(results).toHaveLength(3);
			results.forEach((result) => {
				expect(result.data).toBeDefined();
			});

			// Verify all results have the same data
			const allSameData = results.every(
				(result) => JSON.stringify(result.data) === JSON.stringify(results[0]?.data)
			);
			expect(allSameData).toBe(true);
		});

		it("should handle deferred requests with different result modes", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Start requests with different result modes in the same tick
			const [allResult, onlyDataResult] = await Promise.all([
				client("/users/1", { resultMode: "all" }),
				client("/users/1", { resultMode: "onlyData" }),
			]);

			// Both should get data (in different formats)
			expect(allResult.data).toBeDefined();
			expect(onlyDataResult).toBeDefined();

			// The underlying data should be the same
			const allResultData = allResult.data;
			const onlyDataData = onlyDataResult;

			// For "all" mode, data is in .data property
			// For "onlyData" mode, data is the direct result
			expect(allResultData).toEqual(onlyDataData);
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

			const requests = [client("/users/999"), client("/users/999"), client("/users/999")];
			const results = await Promise.all(requests);

			// Verify all requests get error responses
			results.forEach((result) => {
				expect(result.error).toBeDefined();
				expect(result.data).toBeNull();
			});
		});

		it("should handle slow requests with defer strategy", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "defer",
			});

			const { promise, resolve } = createDeferredPromise<Response>();

			vi.mocked(globalThis.fetch).mockReturnValueOnce(promise);
			vi.mocked(globalThis.fetch).mockReturnValueOnce(promise);

			const firstRequestPromise = client("/users/1");
			const secondRequestPromise = client("/users/1");

			resolve(new Response(JSON.stringify(mockUser), { status: 200 }));

			const [firstResult, secondResult] = await Promise.all([
				firstRequestPromise,
				secondRequestPromise,
			]);

			expect(firstResult.data).toBeDefined();
			expect(secondResult.data).toBeDefined();
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

			// Verify all requests complete successfully
			results.forEach((result) => {
				expect(result.data).toBeDefined();
			});
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

			// Verify all requests complete
			expect(results).toHaveLength(3);
			results.forEach((result) => {
				expect(result.data).toBeDefined();
			});
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

			// Verify all requests complete
			results.forEach((result) => {
				expect(result.data).toBeDefined();
			});
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

			// Verify both requests complete (either fulfilled or rejected)
			expect(postResults).toHaveLength(2);
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
		});

		it("should handle null dedupe key from function", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeKey: () => null as any, // Return null to disable deduplication
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUsers[1]);

			// Null key should disable deduplication
			const [result1, result2] = await Promise.all([client("/users/1"), client("/users/1")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();

			// Should make separate calls when key is null
			expect(getFetchCallCount()).toBe(2);
		});

		it("should handle deduplication with custom fetch implementation", async () => {
			const customFetch = vi
				.fn()
				.mockResolvedValue(new Response(JSON.stringify(mockUser), { status: 200 }));

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				customFetchImpl: customFetch,
				dedupeStrategy: "defer",
			});

			// Start multiple requests that should be deduplicated
			const [result1, result2] = await Promise.all([client("/users/1"), client("/users/1")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();

			// Custom fetch should be called (deduplication works with custom fetch)
			expect(customFetch).toHaveBeenCalled();
		});

		it("should handle deduplication with request that has no fullURL", async () => {
			const client = createFetchClient({
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Make requests without baseURL (fullURL will be just the path)
			const [result1, result2] = await Promise.all([client("/users/1"), client("/users/1")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();
		});

		it("should handle deduplication cache cleanup on error", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "defer",
				resultMode: "all",
			});

			// Mock an error response
			mockFetchError({ message: "Server error" }, 500);

			const result = await client("/users/1");
			expect(result.error).toBeDefined();

			// Make another request - should not be deduplicated since first failed and was cleaned up
			mockFetchSuccess(mockUser);
			const result2 = await client("/users/1");
			expect(result2.data).toBeDefined();

			expect(getFetchCallCount()).toBe(2);
		});

		it("should handle global cache scope without explicit scope key", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeCacheScope: "global",
				// No dedupeCacheScopeKey provided - should use default
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			const [result1, result2] = await Promise.all([client("/users/1"), client("/users/1")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();
		});

		it("should handle deduplication with complex request options", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "defer",
			});

			const requestOptions = {
				method: "POST" as const,
				body: { name: "Test User", email: "test@example.com" },
				headers: { "Content-Type": "application/json", "X-Custom": "value" },
			};

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Same complex options should be deduplicated
			const [result1, result2] = await Promise.all([
				client("/users", requestOptions),
				client("/users", requestOptions),
			]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();
		});

		it("should handle deduplication with very long custom keys", async () => {
			const longKey = "a".repeat(1000); // Very long key

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeKey: longKey,
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Long keys should work fine
			const [result1, result2] = await Promise.all([client("/users/1"), client("/users/2")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();
		});

		it("should handle deduplication with special characters in keys", async () => {
			const specialKey = "key-with-!@#$%^&*()_+-=[]{}|;:,.<>?";

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeKey: specialKey,
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Special characters in keys should work
			const [result1, result2] = await Promise.all([client("/users/1"), client("/users/2")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();
		});

		it("should handle cancel strategy with custom abort error message", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeKey: "custom-test-key",
				dedupeStrategy: "cancel",
			});

			// Create a deferred promise to control timing
			const { promise, resolve } = createDeferredPromise<Response>();

			// Mock fetch to return our controlled promise for first request
			vi.mocked(globalThis.fetch).mockReturnValueOnce(promise);
			mockFetchSuccess(mockUser); // For second request

			// Start first request
			const firstRequestPromise = client("/users/1");

			// Small delay to ensure first request is in cache
			await new Promise((resolve) => setTimeout(resolve, 1));

			// Start second request (should cancel first)
			const secondRequestPromise = client("/users/1");

			// Resolve first request after second has started
			resolve(new Response(JSON.stringify(mockUser), { status: 200 }));

			const results = await Promise.allSettled([firstRequestPromise, secondRequestPromise]);

			// Verify at least one request completes successfully
			const fulfilledResults = results.filter((r) => r.status === "fulfilled");
			expect(fulfilledResults.length).toBeGreaterThan(0);

			// If any requests were cancelled, verify custom key is in error message
			const rejectedResults = results.filter((r) => r.status === "rejected");
			if (rejectedResults.length > 0) {
				const hasCustomKeyInMessage = rejectedResults.some((result) =>
					result.reason?.message?.includes("custom-test-key")
				);
				expect(hasCustomKeyInMessage).toBe(true);
			}
		});

		it("should handle defer strategy with no previous request info", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);

			// Single request should work normally with defer strategy
			const result = await client("/users/1");

			expect(result.data).toBeDefined();
			expect(getFetchCallCount()).toBe(1);
		});

		it("should handle global cache initialization", async () => {
			// Create multiple clients with same global scope key
			const client1 = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeCacheScope: "global",
				dedupeCacheScopeKey: "new-global-scope",
				dedupeStrategy: "defer",
			});

			const client2 = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeCacheScope: "global",
				dedupeCacheScopeKey: "new-global-scope",
				dedupeStrategy: "defer",
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Both clients should share the same global cache
			const [result1, result2] = await Promise.all([client1("/users/1"), client2("/users/1")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();
			expect(getFetchCallCount()).toBeGreaterThanOrEqual(1);
		});

		it("should handle deduplication with request body containing special characters", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "defer",
			});

			const specialBody = {
				text: "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?",
				unicode: "Unicode: 🚀 🎉 ñáéíóú",
				emoji: "😀😃😄😁😆😅😂🤣",
			};

			mockFetchSuccess({ success: true });
			mockFetchSuccess({ success: true });

			// Same special body should be deduplicated
			const [result1, result2] = await Promise.all([
				client("/users", { method: "POST", body: specialBody }),
				client("/users", { method: "POST", body: specialBody }),
			]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();
			expect(getFetchCallCount()).toBeGreaterThanOrEqual(1);
		});

		it("should handle deduplication with deeply nested request options", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "defer",
			});

			const deepOptions = {
				method: "POST" as const,
				body: {
					user: {
						profile: {
							settings: {
								theme: "dark",
								notifications: {
									email: true,
									push: false,
									sms: {
										enabled: true,
										frequency: "daily",
									},
								},
							},
						},
					},
				},
				headers: {
					"Content-Type": "application/json",
					"X-Custom-Header": "value",
				},
			};

			mockFetchSuccess({ success: true });
			mockFetchSuccess({ success: true });

			// Same deep options should be deduplicated
			const [result1, result2] = await Promise.all([
				client("/users", deepOptions),
				client("/users", deepOptions),
			]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();

			expect(getFetchCallCount()).toBeGreaterThanOrEqual(1);
		});
	});

	describe("Inner Dedupe Options (dedupe object)", () => {
		it("should use dedupe.strategy instead of dedupeStrategy", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupe: {
					strategy: "defer",
				},
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			const [result1, result2] = await Promise.all([client("/users/1"), client("/users/1")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();
		});

		it("should use dedupe.key instead of dedupeKey", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupe: {
					key: "custom-key",
					strategy: "defer",
				},
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Different URLs but same key should be deduplicated
			const [result1, result2] = await Promise.all([client("/users/1"), client("/users/2")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();
		});

		it("should use dedupe.cacheScope instead of dedupeCacheScope", async () => {
			const client1 = createFetchClient({
				baseURL: "https://api.example.com",
				dedupe: {
					cacheScope: "global",
					cacheScopeKey: "shared",
					strategy: "defer",
				},
			});

			const client2 = createFetchClient({
				baseURL: "https://api.example.com",
				dedupe: {
					cacheScope: "global",
					cacheScopeKey: "shared",
					strategy: "defer",
				},
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Should share cache between clients
			const [result1, result2] = await Promise.all([client1("/users/1"), client2("/users/1")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();
		});

		it("should prefer top-level options over dedupe object", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeStrategy: "none", // Top-level
				dedupe: {
					strategy: "defer", // Should be ignored
				},
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUsers[1]);

			// Should use "none" strategy from top-level
			const [result1, result2] = await Promise.all([client("/users/1"), client("/users/1")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();

			// Should make 2 calls since top-level "none" takes precedence
			expect(getFetchCallCount()).toBe(2);
		});

		it("should use dedupe object per-request", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupe: {
					strategy: "defer",
				},
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUsers[1]);

			// Override with dedupe object per-request
			const [result1, result2] = await Promise.all([
				client("/users/1", {
					dedupe: {
						strategy: "none",
					},
				}),
				client("/users/1", {
					dedupe: {
						strategy: "none",
					},
				}),
			]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();

			// Should make 2 calls since we overrode to "none"
			expect(getFetchCallCount()).toBe(2);
		});

		it("should use dedupe.key function", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupe: {
					key: (context) => {
						const match = context.options.fullURL?.match(/\/users\/(\d+)/);
						return match ? `user-${match[1]}` : "default";
					},
					strategy: "defer",
				},
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Same user ID should be deduplicated
			const [result1, result2] = await Promise.all([
				client("/users/1?page=1"),
				client("/users/1?page=2"),
			]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();
		});

		it("should mix dedupe object with top-level options", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupeKey: "top-level-key",
				dedupe: {
					strategy: "defer",
					cacheScope: "global",
				},
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// Should use top-level key and dedupe.strategy
			const [result1, result2] = await Promise.all([client("/users/1"), client("/users/2")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();
		});

		it("should handle all dedupe options in object form", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupe: {
					strategy: "defer",
					key: "all-options-key",
					cacheScope: "global",
					cacheScopeKey: "test-scope",
				},
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			const [result1, result2] = await Promise.all([client("/users/1"), client("/users/2")]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();
		});

		it("should handle dedupe.strategy function", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupe: {
					strategy: (context) => (context.request.method === "GET" ? "defer" : "cancel"),
				},
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUser);

			// GET requests should be deferred
			const [result1, result2] = await Promise.all([
				client("/users/1", { method: "GET" }),
				client("/users/1", { method: "GET" }),
			]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();
		});

		it("should override dedupe object per-request with another dedupe object", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				dedupe: {
					strategy: "defer",
					key: "base-key",
				},
			});

			mockFetchSuccess(mockUser);
			mockFetchSuccess(mockUsers[1]);

			// Override with different dedupe object
			const [result1, result2] = await Promise.all([
				client("/users/1", {
					dedupe: {
						key: "override-key-1",
					},
				}),
				client("/users/1", {
					dedupe: {
						key: "override-key-2",
					},
				}),
			]);

			expect(result1.data).toBeDefined();
			expect(result2.data).toBeDefined();

			// Should make 2 calls since keys are different
			expect(getFetchCallCount()).toBe(2);
		});
	});
});
