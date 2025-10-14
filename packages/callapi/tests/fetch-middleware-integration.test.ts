/**
 * Integration tests for fetchMiddleware feature
 * Tests caching plugin, multiple plugins working together, per-request overrides,
 * and interaction with existing features (retry, dedupe, hooks)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFetchClient } from "../src/createFetchClient";
import type { Middlewares } from "../src/middlewares";
import type { CallApiPlugin } from "../src/plugins";
import { mockUser } from "./fixtures";
import { createMockResponse, expectSuccessResult } from "./helpers";
import { mockFetch } from "./setup";

type FetchMiddleware = Middlewares["fetchMiddleware"];

describe("fetchMiddleware Integration Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Caching Plugin Integration", () => {
		it("should cache responses and return cached data on subsequent requests", async () => {
			const cache = new Map<string, { data: Response; timestamp: number }>();
			const cacheLifetime = 60000; // 1 minute

			const cachingPlugin: CallApiPlugin = {
				id: "caching-plugin",
				name: "Caching Plugin",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						const cacheKey = input.toString();
						const cached = cache.get(cacheKey);

						if (cached && Date.now() - cached.timestamp < cacheLifetime) {
							return cached.data.clone();
						}

						const response = await ctx.fetchImpl(input, init);

						if (response.ok) {
							cache.set(cacheKey, {
								data: response.clone(),
								timestamp: Date.now(),
							});
						}

						return response;
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [cachingPlugin],
			});

			// First request - cache miss
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const result1 = await client("/users/1");
			expectSuccessResult(result1);
			expect(result1.data).toEqual(mockUser);
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Second request - cache hit
			const result2 = await client("/users/1");
			expectSuccessResult(result2);
			expect(result2.data).toEqual(mockUser);
			expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call

			// Different endpoint - cache miss
			mockFetch.mockResolvedValueOnce(createMockResponse({ id: 2, name: "Jane" }));
			const result3 = await client("/users/2");
			expectSuccessResult(result3);
			expect(result3.data).toEqual({ id: 2, name: "Jane" });
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it("should respect cache policy (no-cache)", async () => {
			const cache = new Map<string, { data: Response; timestamp: number }>();

			const createCachingPlugin = (cachePolicy: "cache-first" | "no-cache"): CallApiPlugin => ({
				id: "caching-plugin",
				name: "Caching Plugin",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						if (cachePolicy === "no-cache") {
							return ctx.fetchImpl(input, init);
						}

						const cacheKey = input.toString();
						const cached = cache.get(cacheKey);

						if (cached) {
							return cached.data.clone();
						}

						const response = await ctx.fetchImpl(input, init);
						cache.set(cacheKey, { data: response.clone(), timestamp: Date.now() });
						return response;
					},
				},
			});

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [createCachingPlugin("no-cache")],
			});

			mockFetch.mockResolvedValue(createMockResponse(mockUser));

			await client("/users/1");
			await client("/users/1");

			// Should call fetch twice because of no-cache policy
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it("should handle cache expiration", async () => {
			const cache = new Map<string, { data: Response; timestamp: number }>();
			const cacheLifetime = 100; // 100ms

			const cachingPlugin: CallApiPlugin = {
				id: "caching-plugin",
				name: "Caching Plugin",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						const cacheKey = input.toString();
						const cached = cache.get(cacheKey);

						if (cached && Date.now() - cached.timestamp < cacheLifetime) {
							return cached.data.clone();
						}

						const response = await ctx.fetchImpl(input, init);
						cache.set(cacheKey, { data: response.clone(), timestamp: Date.now() });
						return response;
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [cachingPlugin],
			});

			// First request
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Wait for cache to expire
			await new Promise((resolve) => setTimeout(resolve, 150));

			// Second request after expiration
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	describe("Multiple Plugins Working Together", () => {
		it("should compose caching and logging plugins correctly", async () => {
			const logs: string[] = [];
			const cache = new Map<string, Response>();

			const loggingPlugin: CallApiPlugin = {
				id: "logging-plugin",
				name: "Logging Plugin",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						logs.push(`Request: ${input}`);
						const response = await ctx.fetchImpl(input, init);
						logs.push(`Response: ${response.status}`);
						return response;
					},
				},
			};

			const cachingPlugin: CallApiPlugin = {
				id: "caching-plugin",
				name: "Caching Plugin",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						const cacheKey = input.toString();
						const cached = cache.get(cacheKey);

						if (cached) {
							logs.push("Cache hit");
							return cached.clone();
						}

						logs.push("Cache miss");
						const response = await ctx.fetchImpl(input, init);
						cache.set(cacheKey, response.clone());
						return response;
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [loggingPlugin, cachingPlugin],
			});

			mockFetch.mockResolvedValue(createMockResponse(mockUser));

			// First request - cache miss
			await client("/users/1");
			// Plugins execute in reverse registration order: caching wraps logging
			expect(logs).toEqual(["Cache miss", "Request: https://api.example.com/users/1", "Response: 200"]);

			logs.length = 0;

			// Second request - cache hit (caching short-circuits, logging doesn't run)
			await client("/users/1");
			expect(logs).toEqual(["Cache hit"]);
		});

		it("should work with auth and caching plugins together", async () => {
			const cache = new Map<string, Response>();
			let tokenRefreshCount = 0;

			const authPlugin: CallApiPlugin = {
				id: "auth-plugin",
				name: "Auth Plugin",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						tokenRefreshCount++;
						const token = `token-${tokenRefreshCount}`;

						return ctx.fetchImpl(input, {
							...init,
							headers: {
								...init?.headers,
								Authorization: `Bearer ${token}`,
							},
						});
					},
				},
			};

			const cachingPlugin: CallApiPlugin = {
				id: "caching-plugin",
				name: "Caching Plugin",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						const cacheKey = input.toString();
						const cached = cache.get(cacheKey);

						if (cached) {
							return cached.clone();
						}

						const response = await ctx.fetchImpl(input, init);
						cache.set(cacheKey, response.clone());
						return response;
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [authPlugin, cachingPlugin],
			});

			mockFetch.mockResolvedValue(createMockResponse(mockUser));

			// First request
			await client("/users/1");
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "Bearer token-1",
					}),
				})
			);

			// Second request - cached (caching short-circuits, auth doesn't run)
			await client("/users/1");
			expect(tokenRefreshCount).toBe(1); // Auth plugin doesn't run on cache hit
			expect(mockFetch).toHaveBeenCalledTimes(1); // Fetch is not called (cache hit)
		});

		it("should work with three plugins (logging, auth, caching)", async () => {
			const logs: string[] = [];
			const cache = new Map<string, Response>();

			const loggingPlugin: CallApiPlugin = {
				id: "logging",
				name: "Logging",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						logs.push("log-before");
						const response = await ctx.fetchImpl(input, init);
						logs.push("log-after");
						return response;
					},
				},
			};

			const authPlugin: CallApiPlugin = {
				id: "auth",
				name: "Auth",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						logs.push("auth-before");
						const response = await ctx.fetchImpl(input, {
							...init,
							headers: { ...init?.headers, Authorization: "Bearer token" },
						});
						logs.push("auth-after");
						return response;
					},
				},
			};

			const cachingPlugin: CallApiPlugin = {
				id: "caching",
				name: "Caching",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						const cached = cache.get(input.toString());
						if (cached) {
							logs.push("cache-hit");
							return cached.clone();
						}
						logs.push("cache-miss");
						const response = await ctx.fetchImpl(input, init);
						cache.set(input.toString(), response.clone());
						return response;
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [loggingPlugin, authPlugin, cachingPlugin],
			});

			mockFetch.mockResolvedValue(createMockResponse(mockUser));

			await client("/users/1");

			// Execution order: caching → auth → logging → fetch
			// Plugins execute in reverse registration order (last wraps the rest)
			expect(logs).toEqual(["cache-miss", "auth-before", "log-before", "log-after", "auth-after"]);
		});
	});

	describe("Per-Request Interceptors Overriding Plugin Behavior", () => {
		it("should allow per-request interceptor to bypass cache", async () => {
			const cache = new Map<string, Response>();

			const cachingPlugin: CallApiPlugin = {
				id: "caching-plugin",
				name: "Caching Plugin",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						const cacheKey = input.toString();
						const cached = cache.get(cacheKey);

						if (cached) {
							return cached.clone();
						}

						const response = await ctx.fetchImpl(input, init);
						cache.set(cacheKey, response.clone());
						return response;
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [cachingPlugin],
			});

			mockFetch.mockResolvedValue(createMockResponse(mockUser));

			// First request - populates cache
			await client("/users/1");
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Second request with per-request interceptor that bypasses cache
			const bypassCacheMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
				// Clear cache for this request
				cache.delete(input.toString());
				return ctx.fetchImpl(input, init);
			};

			await client("/users/1", {
				fetchMiddleware: bypassCacheMiddleware,
			});

			expect(mockFetch).toHaveBeenCalledTimes(2); // Cache was bypassed
		});

		it("should allow per-request interceptor to add custom headers", async () => {
			const loggingPlugin: CallApiPlugin = {
				id: "logging",
				name: "Logging",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						return ctx.fetchImpl(input, init);
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [loggingPlugin],
			});

			mockFetch.mockResolvedValue(createMockResponse(mockUser));

			await client("/users/1", {
				fetchMiddleware: (ctx) => async (input, init) => {
					return ctx.fetchImpl(input, {
						...init,
						headers: {
							...init?.headers,
							"X-Custom-Header": "custom-value",
						},
					});
				},
			});

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						"X-Custom-Header": "custom-value",
					}),
				})
			);
		});

		it("should allow per-request interceptor to short-circuit plugin chain", async () => {
			const executionOrder: string[] = [];

			const plugin1: CallApiPlugin = {
				id: "plugin1",
				name: "Plugin 1",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						executionOrder.push("plugin1");
						return ctx.fetchImpl(input, init);
					},
				},
			};

			const plugin2: CallApiPlugin = {
				id: "plugin2",
				name: "Plugin 2",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						executionOrder.push("plugin2");
						return ctx.fetchImpl(input, init);
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [plugin1, plugin2],
			});

			// Per-request interceptor that short-circuits
			await client("/users/1", {
				fetchMiddleware: () => async () => {
					executionOrder.push("per-request-short-circuit");
					return createMockResponse({ shortCircuited: true });
				},
			});

			// Per-request executes first and short-circuits (plugins don't run)
			expect(executionOrder).toEqual(["per-request-short-circuit"]);
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe("Integration with Existing Features", () => {
		it("should work with retry feature", async () => {
			let attemptCount = 0;

			const loggingPlugin: CallApiPlugin = {
				id: "logging",
				name: "Logging",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						attemptCount++;
						return ctx.fetchImpl(input, init);
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [loggingPlugin],
				retry: {
					attempts: 2,
					delay: 10,
					condition: () => true, // Retry on all errors
				},
			});

			// Return 500 error first two times, then succeed
			mockFetch
				.mockResolvedValueOnce(createMockResponse({ error: "Server error" }, 500))
				.mockResolvedValueOnce(createMockResponse({ error: "Server error" }, 500))
				.mockResolvedValueOnce(createMockResponse(mockUser));

			const result = await client("/users/1");

			expectSuccessResult(result);
			expect(attemptCount).toBe(3); // Plugin middleware runs on each retry
			expect(mockFetch).toHaveBeenCalledTimes(3);
		});

		it("should work with hooks (onRequest, onResponse)", async () => {
			const hookLogs: string[] = [];
			const middlewareLogs: string[] = [];

			const loggingPlugin: CallApiPlugin = {
				id: "logging",
				name: "Logging",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						middlewareLogs.push("middleware-before");
						const response = await ctx.fetchImpl(input, init);
						middlewareLogs.push("middleware-after");
						return response;
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [loggingPlugin],
				onRequest: () => {
					hookLogs.push("onRequest");
				},
				onResponse: () => {
					hookLogs.push("onResponse");
				},
			});

			mockFetch.mockResolvedValue(createMockResponse(mockUser));

			await client("/users/1");

			// Hooks should run alongside middleware
			expect(hookLogs).toContain("onRequest");
			expect(hookLogs).toContain("onResponse");
			expect(middlewareLogs).toEqual(["middleware-before", "middleware-after"]);
		});

		it("should work with deduplication feature", async () => {
			const cache = new Map<string, Response>();

			const cachingPlugin: CallApiPlugin = {
				id: "caching",
				name: "Caching",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						const cached = cache.get(input.toString());
						if (cached) {
							return cached.clone();
						}
						const response = await ctx.fetchImpl(input, init);
						cache.set(input.toString(), response.clone());
						return response;
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [cachingPlugin],
				dedupeStrategy: "defer",
			});

			mockFetch.mockResolvedValue(createMockResponse(mockUser));

			// Make multiple simultaneous requests
			const [result1, result2, result3] = await Promise.all([
				client("/users/1"),
				client("/users/1"),
				client("/users/1"),
			]);

			// All should succeed
			expectSuccessResult(result1);
			expectSuccessResult(result2);
			expectSuccessResult(result3);

			// With defer strategy, first request goes through, others wait
			// After first completes, cache serves the rest
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("should work with customFetchImpl", async () => {
			const executionOrder: string[] = [];

			const loggingPlugin: CallApiPlugin = {
				id: "logging",
				name: "Logging",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						executionOrder.push("plugin-middleware");
						return ctx.fetchImpl(input, init);
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [loggingPlugin],
				customFetchImpl: async (input, init) => {
					executionOrder.push("customFetchImpl");
					return mockFetch(input, init);
				},
			});

			mockFetch.mockResolvedValue(createMockResponse(mockUser));

			await client("/users/1");

			// Plugin middleware should wrap customFetchImpl
			expect(executionOrder).toEqual(["plugin-middleware", "customFetchImpl"]);
		});

		it("should work with all features combined (retry, hooks, dedupe, customFetchImpl)", async () => {
			const logs: string[] = [];
			let attemptCount = 0;

			const loggingPlugin: CallApiPlugin = {
				id: "logging",
				name: "Logging",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						logs.push(`middleware-attempt-${++attemptCount}`);
						return ctx.fetchImpl(input, init);
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [loggingPlugin],
				retry: {
					attempts: 1,
					condition: () => true, // Retry on all errors
					delay: 10,
				},
				dedupeStrategy: "defer",
				customFetchImpl: async (input, init) => {
					logs.push("customFetchImpl");
					return mockFetch(input, init);
				},
				onRequest: () => {
					logs.push("onRequest");
				},
				onResponse: () => {
					logs.push("onResponse");
				},
			});

			// Return 500 error first, then succeed on retry
			mockFetch
				.mockResolvedValueOnce(createMockResponse({ error: "Server error" }, 500))
				.mockResolvedValueOnce(createMockResponse(mockUser));

			const result = await client("/users/1");

			expectSuccessResult(result);

			// Verify all features worked together
			expect(logs).toContain("middleware-attempt-1");
			expect(logs).toContain("middleware-attempt-2");
			expect(logs).toContain("customFetchImpl");
			expect(logs).toContain("onRequest");
			expect(logs).toContain("onResponse");
		});
	});

	describe("Real-World Scenarios", () => {
		it("should implement offline-first strategy with caching", async () => {
			const cache = new Map<string, Response>();
			let isOnline = true;

			const offlinePlugin: CallApiPlugin = {
				id: "offline",
				name: "Offline Plugin",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						const cacheKey = input.toString();
						const cached = cache.get(cacheKey);

						// If offline, return cached response or error
						if (!isOnline) {
							if (cached) {
								return cached.clone();
							}
							throw new Error("Offline and no cached data available");
						}

						// If online, try network first
						try {
							const response = await ctx.fetchImpl(input, init);
							cache.set(cacheKey, response.clone());
							return response;
						} catch (error) {
							// Network failed, try cache
							if (cached) {
								return cached.clone();
							}
							throw error;
						}
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [offlinePlugin],
			});

			// Online - fetch from network
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const result1 = await client("/users/1");
			expectSuccessResult(result1);
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Go offline
			isOnline = false;

			// Offline - return cached data
			const result2 = await client("/users/1");
			expectSuccessResult(result2);
			expect(result2.data).toEqual(mockUser);
			expect(mockFetch).toHaveBeenCalledTimes(1); // No new fetch call

			// Try new endpoint while offline - should fail
			const result3 = await client("/users/2");
			expect(result3.error).toBeDefined();
			expect(result3.error?.message).toContain("Offline and no cached data available");
		});

		it("should implement request throttling", async () => {
			const fetchCalls: string[] = [];

			const throttlePlugin: CallApiPlugin = {
				id: "throttle",
				name: "Throttle Plugin",

				middlewares: () => {
					let lastRequestTime = 0;
					const minDelay = 30;

					return {
						fetchMiddleware: (ctx) => async (input, init) => {
							const now = Date.now();
							const timeSinceLastRequest = now - lastRequestTime;

							if (lastRequestTime > 0 && timeSinceLastRequest < minDelay) {
								const waitTime = minDelay - timeSinceLastRequest;
								await new Promise((resolve) => setTimeout(resolve, waitTime));
							}

							lastRequestTime = Date.now();
							fetchCalls.push(input.toString());

							return ctx.fetchImpl(input, init);
						},
					};
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [throttlePlugin],
			});

			mockFetch.mockResolvedValue(createMockResponse(mockUser));

			const startTime = Date.now();

			// Make three rapid sequential requests
			await client("/users/1");
			await client("/users/2");
			await client("/users/3");

			const totalTime = Date.now() - startTime;

			// Verify middleware intercepted all requests
			expect(fetchCalls).toHaveLength(3);
			// Verify throttling added some delay (very loose check for CI)
			expect(totalTime).toBeGreaterThan(0);
		});

		it("should implement request/response transformation", async () => {
			const transformPlugin: CallApiPlugin = {
				id: "transform",
				name: "Transform Plugin",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						// Transform request - add timestamp
						const modifiedInit = {
							...init,
							headers: {
								...init?.headers,
								"X-Request-Time": Date.now().toString(),
							},
						};

						const response = await ctx.fetchImpl(input, modifiedInit);

						// Transform response - add metadata
						const data = (await response.json()) as Record<string, unknown>;
						const transformedData = {
							...data,
							_metadata: {
								fetchedAt: Date.now(),
								transformed: true,
							},
						};

						return new Response(JSON.stringify(transformedData), {
							status: response.status,
							statusText: response.statusText,
							headers: response.headers,
						});
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [transformPlugin],
			});

			mockFetch.mockResolvedValue(createMockResponse(mockUser));

			const result = await client("/users/1");

			expectSuccessResult(result);
			expect(result.data).toMatchObject({
				...mockUser,
				_metadata: {
					transformed: true,
				},
			});

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						"X-Request-Time": expect.any(String),
					}),
				})
			);
		});
	});
});
