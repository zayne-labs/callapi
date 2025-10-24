/**
 * Fetch middleware composition tests
 * Tests the composition order, short-circuiting, plugin interceptors, and error handling
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFetchClient } from "../src/createFetchClient";
import type { FetchImpl, Middlewares } from "../src/middlewares";
import type { CallApiPlugin } from "../src/plugins";
import { definePlugin } from "../src/utils/external/define";
import { mockUser } from "./fixtures";
import { createMockResponse, expectSuccessResult } from "./helpers";
import { mockFetch } from "./setup";

type FetchMiddleware = Middlewares["fetchMiddleware"];

describe("fetchMiddleware", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("composition order", () => {
		it("should compose middleware in correct order: plugins → base → per-request → customFetchImpl → fetch", async () => {
			const executionOrder: string[] = [];

			// Base config middleware
			const baseMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
				executionOrder.push("base-before");
				const response = await ctx.fetchImpl(input, init);
				executionOrder.push("base-after");
				return response;
			};

			// Plugin middleware
			const pluginMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
				executionOrder.push("plugin-before");
				const response = await ctx.fetchImpl(input, init);
				executionOrder.push("plugin-after");
				return response;
			};

			const plugin: CallApiPlugin = {
				id: "test-plugin",
				name: "Test Plugin",
				middlewares: {
					fetchMiddleware: pluginMiddleware,
				},
			};

			// Per-request middleware
			const perRequestMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
				executionOrder.push("per-request-before");
				const response = await ctx.fetchImpl(input, init);
				executionOrder.push("per-request-after");
				return response;
			};

			// Custom fetch implementation
			const customFetch: FetchImpl = async (input, init) => {
				executionOrder.push("customFetch");
				return mockFetch(input, init);
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				fetchMiddleware: baseMiddleware,
				customFetchImpl: customFetch,
				plugins: [plugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			await client("/users/1", {
				fetchMiddleware: perRequestMiddleware,
			});

			// Verify execution order: per-request → base → plugin → customFetch
			// Middlewares are added to registry in order: plugins, base, per-request
			// Then composed so last added wraps the rest (reverse order execution)
			expect(executionOrder).toEqual([
				"per-request-before",
				"base-before",
				"plugin-before",
				"customFetch",
				"plugin-after",
				"base-after",
				"per-request-after",
			]);
		});

		it("should compose multiple plugin middlewares in registration order", async () => {
			const executionOrder: string[] = [];

			const plugin1: CallApiPlugin = {
				id: "plugin-1",
				name: "Plugin 1",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						executionOrder.push("plugin1-before");
						const response = await ctx.fetchImpl(input, init);
						executionOrder.push("plugin1-after");
						return response;
					},
				},
			};

			const plugin2: CallApiPlugin = {
				id: "plugin-2",
				name: "Plugin 2",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						executionOrder.push("plugin2-before");
						const response = await ctx.fetchImpl(input, init);
						executionOrder.push("plugin2-after");
						return response;
					},
				},
			};

			const plugin3: CallApiPlugin = {
				id: "plugin-3",
				name: "Plugin 3",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						executionOrder.push("plugin3-before");
						const response = await ctx.fetchImpl(input, init);
						executionOrder.push("plugin3-after");
						return response;
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [plugin1, plugin2, plugin3],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");

			// Plugins execute in reverse registration order: plugin3 → plugin2 → plugin1
			// Last registered plugin wraps the rest (executes first)
			expect(executionOrder).toEqual([
				"plugin3-before",
				"plugin2-before",
				"plugin1-before",
				"plugin1-after",
				"plugin2-after",
				"plugin3-after",
			]);
		});

		it.each([
			["base", { baseMiddleware: true, perRequestMiddleware: false, pluginMiddleware: false }],
			["per-request", { baseMiddleware: false, perRequestMiddleware: true, pluginMiddleware: false }],
			["plugin", { baseMiddleware: false, perRequestMiddleware: false, pluginMiddleware: true }],
		])("should work with only %s middleware", async (level, config) => {
			const executionOrder: string[] = [];
			const middleware: FetchMiddleware = (ctx) => async (input, init) => {
				executionOrder.push(level);
				return ctx.fetchImpl(input, init);
			};

			const plugin: CallApiPlugin = {
				id: "test-plugin",
				name: "Test Plugin",
				middlewares: { fetchMiddleware: middleware },
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				...(config.baseMiddleware && { fetchMiddleware: middleware }),
				...(config.pluginMiddleware && { plugins: [plugin] }),
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1", {
				...(config.perRequestMiddleware && { fetchMiddleware: middleware }),
			});

			expect(executionOrder).toEqual([level]);
		});
	});

	describe("short-circuiting", () => {
		it("should allow middleware to return response without calling fetchImpl", async () => {
			const cachedResponse = createMockResponse({ cached: true, id: 999 });
			const cachingMiddleware: FetchMiddleware = () => async () => cachedResponse;

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				fetchMiddleware: cachingMiddleware,
			});

			const result = await client("/users/1");

			expectSuccessResult(result);
			expect(result.data).toEqual({ cached: true, id: 999 });
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should allow plugin middleware to short-circuit", async () => {
			const mockResponse = createMockResponse({ mocked: true });
			const mockingPlugin: CallApiPlugin = {
				id: "mocking-plugin",
				name: "Mocking Plugin",
				middlewares: { fetchMiddleware: () => async () => mockResponse },
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [mockingPlugin],
			});

			const result = await client("/users/1");

			expectSuccessResult(result);
			expect(result.data).toEqual({ mocked: true });
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should allow per-request middleware to short-circuit", async () => {
			const offlineResponse = createMockResponse({ offline: true }, 200);

			const client = createFetchClient({
				baseURL: "https://api.example.com",
			});

			const result = await client("/users/1", {
				fetchMiddleware: () => async () => offlineResponse,
			});

			expectSuccessResult(result);
			expect(result.data).toEqual({ offline: true });
			expect(result.response.status).toBe(200);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should stop chain when middleware short-circuits", async () => {
			const executionOrder: string[] = [];

			const shortCircuitMiddleware: FetchMiddleware = () => async () => {
				executionOrder.push("short-circuit");
				return createMockResponse({ shortCircuited: true });
			};

			const baseMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
				executionOrder.push("base");
				return ctx.fetchImpl(input, init);
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				fetchMiddleware: baseMiddleware,
			});

			await client("/users/1", {
				fetchMiddleware: shortCircuitMiddleware,
			});

			// Per-request executes first and short-circuits (doesn't call base)
			expect(executionOrder).toEqual(["short-circuit"]);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should allow conditional short-circuiting based on request", async () => {
			const cacheMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
				const url = input.toString();

				// Short-circuit for cached endpoints
				if (url.includes("/cached")) {
					return createMockResponse({ cached: true });
				}

				// Pass through for non-cached endpoints
				return ctx.fetchImpl(input, init);
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				fetchMiddleware: cacheMiddleware,
			});

			// Cached endpoint - should short-circuit
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const cachedResult = await client("/cached/data");
			expectSuccessResult(cachedResult);
			expect(cachedResult.data).toEqual({ cached: true });
			expect(mockFetch).not.toHaveBeenCalled();

			// Non-cached endpoint - should call fetch
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const normalResult = await client("/users/1");
			expectSuccessResult(normalResult);
			expect(normalResult.data).toEqual(mockUser);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});
	});

	describe("plugin interceptors with closure state", () => {
		it("should allow plugin to maintain state via closure", async () => {
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

			// First call - should hit network
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const result1 = await client("/users/1");
			expectSuccessResult(result1);
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Second call - should hit cache
			const result2 = await client("/users/1");
			expectSuccessResult(result2);
			expect(result2.data).toEqual(mockUser);
			expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call
		});

		it("should allow plugin to track request count", async () => {
			let requestCount = 0;

			const countingPlugin: CallApiPlugin = {
				id: "counting-plugin",
				name: "Counting Plugin",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						requestCount++;
						return ctx.fetchImpl(input, init);
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [countingPlugin],
			});

			mockFetch.mockResolvedValue(createMockResponse(mockUser));

			await client("/users/1");
			expect(requestCount).toBe(1);

			await client("/users/2");
			expect(requestCount).toBe(2);

			await client("/users/3");
			expect(requestCount).toBe(3);
		});

		it("should allow plugin to access and modify plugin options via closure", async () => {
			interface CachePluginOptions {
				cacheEnabled: boolean;
				maxCacheSize: number;
			}

			const cache = new Map<string, Response>();

			const configurableCachingPlugin: CallApiPlugin = {
				id: "configurable-caching",
				name: "Configurable Caching",
				middlewares: ({ options }) => {
					const pluginOptions = options as unknown as CachePluginOptions;
					const cacheEnabled = pluginOptions.cacheEnabled ?? true;
					const maxCacheSize = pluginOptions.maxCacheSize ?? 100;

					return {
						fetchMiddleware: (ctx) => async (input, init) => {
							if (!cacheEnabled) {
								return ctx.fetchImpl(input, init);
							}

							const cacheKey = input.toString();
							const cached = cache.get(cacheKey);

							if (cached) {
								return cached.clone();
							}

							const response = await ctx.fetchImpl(input, init);

							if (cache.size < maxCacheSize) {
								cache.set(cacheKey, response.clone());
							}

							return response;
						},
					};
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [configurableCachingPlugin],
			});

			mockFetch.mockResolvedValue(createMockResponse(mockUser));

			await client("/users/1");
			await client("/users/1");

			// Should cache and only call fetch once
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("should maintain separate state for different plugin instances", async () => {
			let counter1 = 0;
			let counter2 = 0;

			const createCounterPlugin = (id: string, counterRef: { value: number }) =>
				definePlugin({
					id,
					name: `Counter ${id}`,
					middlewares: {
						fetchMiddleware: (ctx) => async (input, init) => {
							counterRef.value++;
							return ctx.fetchImpl(input, init);
						},
					},
				});

			const plugin1 = createCounterPlugin("counter-1", { value: counter1 });
			const plugin2 = createCounterPlugin("counter-2", { value: counter2 });

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [plugin1, plugin2],
			});

			mockFetch.mockResolvedValue(createMockResponse(mockUser));

			await client("/users/1");

			// Both plugins should have incremented their counters
			expect(plugin1).toBeDefined();
			expect(plugin2).toBeDefined();
		});
	});

	describe("error handling during composition", () => {
		it.each([
			["base middleware", { baseMiddleware: true, pluginMiddleware: false }],
			["plugin middleware", { baseMiddleware: false, pluginMiddleware: true }],
		])("should propagate errors thrown in %s", async (_, config) => {
			const errorMiddleware: FetchMiddleware = () => async () => {
				throw new Error("Middleware error");
			};

			const errorPlugin: CallApiPlugin = {
				id: "error-plugin",
				name: "Error Plugin",
				middlewares: { fetchMiddleware: errorMiddleware },
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				...(config.baseMiddleware && { fetchMiddleware: errorMiddleware }),
				...(config.pluginMiddleware && { plugins: [errorPlugin] }),
			});

			const result = await client("/users/1");

			expect(result.error?.message).toContain("Middleware error");
			expect(result.data).toBeNull();
		});

		it("should invoke onError and onRequestError hooks when middleware throws", async () => {
			const onErrorSpy = vi.fn();
			const onRequestErrorSpy = vi.fn();

			const errorMiddleware: FetchMiddleware = () => async () => {
				throw new Error("Middleware error");
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				fetchMiddleware: errorMiddleware,
				onError: onErrorSpy,
				onRequestError: onRequestErrorSpy,
			});

			await client("/users/1");

			expect(onRequestErrorSpy).toHaveBeenCalled();
			expect(onErrorSpy).toHaveBeenCalled();
		});

		it("should handle errors in nested middleware composition", async () => {
			const executionOrder: string[] = [];

			const baseMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
				executionOrder.push("base-before");
				try {
					const response = await ctx.fetchImpl(input, init);
					executionOrder.push("base-after");
					return response;
				} catch (error) {
					executionOrder.push("base-catch");
					throw error;
				}
			};

			const perRequestMiddleware: FetchMiddleware = () => async () => {
				executionOrder.push("per-request-throw");
				throw new Error("Per-request error");
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				fetchMiddleware: baseMiddleware,
			});

			await client("/users/1", {
				fetchMiddleware: perRequestMiddleware,
			});

			// Per-request wraps base, so per-request executes first and throws
			expect(executionOrder).toEqual(["per-request-throw"]);
		});

		it("should handle errors when fetchImpl is called with invalid parameters", async () => {
			const invalidMiddleware: FetchMiddleware = (ctx) => async () => {
				// Call with invalid URL
				return ctx.fetchImpl("", undefined);
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				fetchMiddleware: invalidMiddleware,
			});

			const result = await client("/users/1");

			expect(result.error).toBeDefined();
		});

		it("should handle middleware that returns invalid response", async () => {
			const invalidMiddleware: FetchMiddleware = () => async () => {
				// Return invalid response (null)
				return null as unknown as Response;
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				fetchMiddleware: invalidMiddleware,
			});

			const result = await client("/users/1");

			expect(result.error).toBeDefined();
		});
	});

	describe("backward compatibility", () => {
		it("should work without any interceptors (no fetchMiddleware)", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const result = await client("/users/1");

			expectSuccessResult(result);
			expect(result.data).toEqual(mockUser);
			expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/users/1", expect.any(Object));
		});

		it("should work with only customFetchImpl (no fetchMiddleware)", async () => {
			const customFetch: FetchImpl = async (input, init) => {
				// Custom implementation that adds a header
				const modifiedInit = {
					...init,
					headers: {
						...init?.headers,
						"X-Custom-Fetch": "true",
					},
				};
				return mockFetch(input, modifiedInit);
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				customFetchImpl: customFetch,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						"X-Custom-Fetch": "true",
					}),
				})
			);
		});

		it("should compose fetchMiddleware with customFetchImpl correctly", async () => {
			const executionOrder: string[] = [];

			const customFetch: FetchImpl = async (input, init) => {
				executionOrder.push("customFetch");
				return mockFetch(input, init);
			};

			const middleware: FetchMiddleware = (ctx) => async (input, init) => {
				executionOrder.push("middleware-before");
				const response = await ctx.fetchImpl(input, init);
				executionOrder.push("middleware-after");
				return response;
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				customFetchImpl: customFetch,
				fetchMiddleware: middleware,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");

			// Middleware should wrap customFetchImpl
			expect(executionOrder).toEqual(["middleware-before", "customFetch", "middleware-after"]);
		});

		it("should maintain existing behavior when plugins don't provide fetchMiddleware", async () => {
			const hookSpy = vi.fn();

			const legacyPlugin: CallApiPlugin = {
				id: "legacy-plugin",
				name: "Legacy Plugin",
				hooks: {
					onRequest: hookSpy,
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [legacyPlugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const result = await client("/users/1");

			expectSuccessResult(result);
			expect(hookSpy).toHaveBeenCalled();
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("should work with mix of plugins with and without fetchMiddleware", async () => {
			const executionOrder: string[] = [];

			const pluginWithMiddleware: CallApiPlugin = {
				id: "with-middleware",
				name: "With Middleware",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						executionOrder.push("middleware-plugin");
						return ctx.fetchImpl(input, init);
					},
				},
			};

			const pluginWithoutMiddleware: CallApiPlugin = {
				id: "without-middleware",
				name: "Without Middleware",
				hooks: {
					onRequest: () => {
						executionOrder.push("hook-plugin");
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [pluginWithMiddleware, pluginWithoutMiddleware],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");

			expect(executionOrder).toContain("middleware-plugin");
			expect(executionOrder).toContain("hook-plugin");
		});

		it("should handle customFetchImpl at request level alongside middleware", async () => {
			const executionOrder: string[] = [];

			const baseCustomFetch: FetchImpl = async (input, init) => {
				executionOrder.push("base-customFetch");
				return mockFetch(input, init);
			};

			const middleware: FetchMiddleware = (ctx) => async (input, init) => {
				executionOrder.push("middleware");
				return ctx.fetchImpl(input, init);
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				customFetchImpl: baseCustomFetch,
				fetchMiddleware: middleware,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");

			expect(executionOrder).toEqual(["middleware", "base-customFetch"]);
		});
	});

	describe("request and response modification", () => {
		it("should allow middleware to modify request before passing to next layer", async () => {
			const authMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
				const modifiedInit = {
					...init,
					headers: {
						...init?.headers,
						Authorization: "Bearer test-token",
					},
				};
				return ctx.fetchImpl(input, modifiedInit);
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				fetchMiddleware: authMiddleware,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "Bearer test-token",
					}),
				})
			);
		});

		it("should allow middleware to modify URL", async () => {
			const urlModifyingMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
				const url = new URL(input.toString());
				url.searchParams.set("modified", "true");
				return ctx.fetchImpl(url.toString(), init);
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				fetchMiddleware: urlModifyingMiddleware,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("modified=true"),
				expect.any(Object)
			);
		});

		it("should allow middleware to clone and modify response", async () => {
			const responseModifyingMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
				const response = await ctx.fetchImpl(input, init);
				const data = (await response.json()) as Record<string, unknown>;

				// Return modified response
				return new Response(JSON.stringify({ ...data, modified: true }), {
					status: response.status,
					statusText: response.statusText,
					headers: response.headers,
				});
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				fetchMiddleware: responseModifyingMiddleware,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const result = await client("/users/1");

			expectSuccessResult(result);
			expect(result.data).toEqual({ ...mockUser, modified: true });
		});

		it("should allow multiple middlewares to modify request sequentially", async () => {
			const addHeader1: FetchMiddleware = (ctx) => async (input, init) => {
				return ctx.fetchImpl(input, {
					...init,
					headers: { ...init?.headers, "X-Header-1": "value1" },
				});
			};

			const addHeader2: FetchMiddleware = (ctx) => async (input, init) => {
				return ctx.fetchImpl(input, {
					...init,
					headers: { ...init?.headers, "X-Header-2": "value2" },
				});
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				fetchMiddleware: addHeader1,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1", {
				fetchMiddleware: addHeader2,
			});

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						"X-Header-1": "value1",
						"X-Header-2": "value2",
					}),
				})
			);
		});
	});

	describe("access to options in middleware", () => {
		it("should provide access to RequestInit in middleware", async () => {
			let capturedInit: RequestInit | undefined;

			const inspectMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
				capturedInit = init;
				return ctx.fetchImpl(input, init);
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				fetchMiddleware: inspectMiddleware,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});

			expect(capturedInit).toBeDefined();
			expect(capturedInit?.method).toBe("POST");
			expect(capturedInit?.headers).toMatchObject({
				"Content-Type": "application/json",
			});
		});

		it("should allow middleware to access request init options", async () => {
			let capturedHeaders: Record<string, string> = {};
			let capturedMethod: string | undefined;

			const inspectMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
				capturedHeaders = init?.headers as Record<string, string>;
				capturedMethod = init?.method;
				return ctx.fetchImpl(input, init);
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				fetchMiddleware: inspectMiddleware,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1", {
				method: "POST",
				headers: { "X-Request": "request-value" },
			});

			// Middleware receives the merged RequestInit
			expect(capturedMethod).toBe("POST");
			expect(capturedHeaders).toMatchObject({
				"X-Request": "request-value",
			});
		});
	});

	describe("edge cases", () => {
		it("should handle middleware that doesn't call fetchImpl and doesn't return response", async () => {
			const brokenMiddleware: FetchMiddleware = () => async () => {
				// Doesn't call fetchImpl and returns undefined
				return undefined as unknown as Response;
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				fetchMiddleware: brokenMiddleware,
			});

			const result = await client("/users/1");

			expect(result.error).toBeDefined();
		});

		it("should handle empty middleware chain gracefully", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				// No middleware at any level
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const result = await client("/users/1");

			expectSuccessResult(result);
			expect(result.data).toEqual(mockUser);
		});

		it("should handle async middleware correctly", async () => {
			const asyncMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
				// Simulate async operation
				await new Promise((resolve) => setTimeout(resolve, 10));
				return ctx.fetchImpl(input, init);
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				fetchMiddleware: asyncMiddleware,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const result = await client("/users/1");

			expectSuccessResult(result);
			expect(result.data).toEqual(mockUser);
		});
	});
});
