/**
 * Plugin system tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFetchClient } from "../src/createFetchClient";
import type { CallApiPlugin } from "../src/plugins";
import { mockUser } from "./fixtures";
import { createMockResponse, expectErrorResult, expectSuccessResult } from "./helpers";
import { mockFetch } from "./setup";

describe("plugins", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("plugin initialization and setup", () => {
		it("should initialize plugin with basic properties", async () => {
			const basicPlugin: CallApiPlugin = {
				id: "basic-plugin",
				name: "Basic Plugin",
				description: "A basic test plugin",
				version: "1.0.0",
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [basicPlugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const result = await client("/users/1");

			expectSuccessResult(result);
			expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/users/1", expect.any(Object));
		});

		it("should call plugin setup function during initialization", async () => {
			const setupSpy = vi.fn();
			const setupPlugin: CallApiPlugin = {
				id: "setup-plugin",
				name: "Setup Plugin",
				setup: setupSpy,
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [setupPlugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");

			expect(setupSpy).toHaveBeenCalledWith({
				baseConfig: expect.objectContaining({ baseURL: "https://api.example.com" }),
				config: expect.any(Object),
				initURL: "/users/1",
				options: expect.any(Object),
				request: expect.any(Object),
			});
		});

		it("should handle async plugin setup functions", async () => {
			const asyncSetupPlugin: CallApiPlugin = {
				id: "async-setup-plugin",
				name: "Async Setup Plugin",
				setup: async (context) => {
					// Simulate async operation
					await new Promise((resolve) => setTimeout(resolve, 10));
					return {
						options: {
							...context.options,
							meta: { asyncSetupCompleted: true },
						},
					};
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [asyncSetupPlugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const result = await client("/users/1");

			expectSuccessResult(result);
		});

		it("should handle plugin setup that returns void", async () => {
			const voidSetupPlugin: CallApiPlugin = {
				id: "void-setup-plugin",
				name: "Void Setup Plugin",
				setup: () => {
					// Setup that doesn't return anything
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [voidSetupPlugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const result = await client("/users/1");

			expectSuccessResult(result);
		});

		it("should handle plugin setup errors gracefully", async () => {
			const failingSetupPlugin: CallApiPlugin = {
				id: "failing-setup-plugin",
				name: "Failing Setup Plugin",
				setup: () => {
					throw new Error("Setup failed");
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [failingSetupPlugin],
			});

			await expect(client("/users/1")).rejects.toThrow("Setup failed");
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe("plugin hook registration and execution", () => {
		it("should register and execute plugin hooks", async () => {
			const hookSpy = vi.fn();
			const hookPlugin: CallApiPlugin = {
				id: "hook-plugin",
				name: "Hook Plugin",
				hooks: {
					onRequest: hookSpy,
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [hookPlugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");

			expect(hookSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					request: expect.any(Object),
					options: expect.any(Object),
				})
			);
		});

		it("should execute multiple hook types from plugin", async () => {
			const onRequestSpy = vi.fn();
			const onResponseSpy = vi.fn();
			const multiHookPlugin: CallApiPlugin = {
				id: "multi-hook-plugin",
				name: "Multi Hook Plugin",
				hooks: {
					onRequest: onRequestSpy,
					onResponse: onResponseSpy,
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [multiHookPlugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");

			expect(onRequestSpy).toHaveBeenCalled();
			expect(onResponseSpy).toHaveBeenCalled();
		});

		it("should handle plugin hooks that throw errors", async () => {
			const throwingHookPlugin: CallApiPlugin = {
				id: "throwing-hook-plugin",
				name: "Throwing Hook Plugin",
				hooks: {
					onRequest: () => {
						throw new Error("Hook error");
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [throwingHookPlugin],
			});

			const result = await client("/users/1");
			expectErrorResult(result);
			expect(result.error.message).toContain("Hook error");
		});

		it("should execute plugin hooks before main hooks when sequential", async () => {
			const order: string[] = [];

			const orderingPlugin: CallApiPlugin = {
				hooks: {
					onRequest: () => {
						order.push("plugin");
					},
				},
				id: "ordering-plugin",
				name: "Ordering Plugin",
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				onRequest: () => {
					order.push("main");
				},
				plugins: [orderingPlugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			await client("/users/1", { hooksExecutionMode: "sequential" });

			expect(order).toEqual(["plugin", "main"]);
			expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/users/1", expect.any(Object));
		});

		it("should execute multiple plugins in provided order", async () => {
			const order: string[] = [];

			const p1: CallApiPlugin = {
				hooks: { onRequest: () => order.push("p1") },
				id: "p1",
				name: "P1",
			};
			const p2: CallApiPlugin = {
				hooks: { onRequest: () => order.push("p2") },
				id: "p2",
				name: "P2",
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				onRequest: () => order.push("main"),
				plugins: [p1, p2],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1", { hooksExecutionMode: "sequential" });

			expect(order).toEqual(["p1", "p2", "main"]);
		});

		it("should compose base hook array with instance hook preserving order", async () => {
			const order: string[] = [];

			const baseB1 = () => order.push("base1");
			const baseB2 = () => order.push("base2");
			const instI3 = () => order.push("inst3");
			const plugin: CallApiPlugin = {
				hooks: { onRequest: () => order.push("plugin") },
				id: "pl",
				name: "PL",
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				onRequest: [baseB1, baseB2],
				plugins: [plugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1", { hooksExecutionMode: "sequential", onRequest: instI3 });

			// With pluginsFirst: plugin then base1, base2, inst3
			expect(order).toEqual(["plugin", "base1", "base2", "inst3"]);
		});
	});

	describe("plugin option merging and inheritance", () => {
		it("should merge plugin options with base options", async () => {
			const optionMergingPlugin: CallApiPlugin = {
				id: "option-merging-plugin",
				name: "Option Merging Plugin",
				hooks: {
					onRequest: (context) => {
						// Verify that plugin can access merged options
						expect(context.options.timeout).toBe(5000);
						expect(context.baseConfig.baseURL).toBe("https://api.example.com");
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				timeout: 5000,
				plugins: [optionMergingPlugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");
		});

		it("should allow plugin setup to modify options", async () => {
			const optionModifyingPlugin: CallApiPlugin = {
				id: "option-modifying-plugin",
				name: "Option Modifying Plugin",
				setup: (context) => {
					return {
						options: {
							...context.options,
							timeout: 10000,
							meta: { pluginModified: true },
						},
					};
				},
				hooks: {
					onRequest: (context) => {
						expect(context.options.timeout).toBe(10000);
						expect(context.options.meta?.pluginModified).toBe(true);
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				timeout: 5000,
				plugins: [optionModifyingPlugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");
		});

		it("should inherit base plugin options in instance calls", async () => {
			const basePlugin: CallApiPlugin = {
				id: "base-plugin",
				name: "Base Plugin",
				hooks: {
					onRequest: (context) => {
						context.request.headers = {
							...context.request.headers,
							"X-Base-Plugin": "true",
						};
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [basePlugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						"X-Base-Plugin": "true",
					}),
				})
			);
		});
	});

	describe("plugin composition with multiple plugins", () => {
		it("should compose multiple plugins correctly", async () => {
			const executionOrder: string[] = [];

			const plugin1: CallApiPlugin = {
				id: "plugin-1",
				name: "Plugin 1",
				setup: () => {
					executionOrder.push("setup-1");
				},
				hooks: {
					onRequest: () => executionOrder.push("request-1"),
					onResponse: () => executionOrder.push("response-1"),
				},
			};

			const plugin2: CallApiPlugin = {
				id: "plugin-2",
				name: "Plugin 2",
				setup: () => {
					executionOrder.push("setup-2");
				},
				hooks: {
					onRequest: () => executionOrder.push("request-2"),
					onResponse: () => executionOrder.push("response-2"),
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [plugin1, plugin2],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1", { hooksExecutionMode: "sequential" });

			// Setup functions should execute in order during initialization
			expect(executionOrder.slice(0, 2)).toEqual(["setup-1", "setup-2"]);
			// Hooks should execute in plugin order
			expect(executionOrder.slice(2, 4)).toEqual(["request-1", "request-2"]);
			expect(executionOrder.slice(4, 6)).toEqual(["response-1", "response-2"]);
		});

		it("should handle plugin composition with different hook types", async () => {
			const hookTracker: Record<string, string[]> = {
				onRequest: [],
				onResponse: [],
				onError: [],
			};

			const requestPlugin: CallApiPlugin = {
				id: "request-plugin",
				name: "Request Plugin",
				hooks: {
					onRequest: () => hookTracker.onRequest?.push("request-plugin"),
				},
			};

			const responsePlugin: CallApiPlugin = {
				id: "response-plugin",
				name: "Response Plugin",
				hooks: {
					onResponse: () => hookTracker.onResponse?.push("response-plugin"),
				},
			};

			const errorPlugin: CallApiPlugin = {
				id: "error-plugin",
				name: "Error Plugin",
				hooks: {
					onError: () => hookTracker.onError?.push("error-plugin"),
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [requestPlugin, responsePlugin, errorPlugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");

			expect(hookTracker.onRequest).toEqual(["request-plugin"]);
			expect(hookTracker.onResponse).toEqual(["response-plugin"]);
			expect(hookTracker.onError).toEqual([]); // No error occurred
		});

		it("should support plugins config as a function with basePlugins", async () => {
			const order: string[] = [];
			const basePlugin: CallApiPlugin = {
				hooks: { onRequest: () => order.push("base") },
				id: "base",
				name: "Base",
			};
			const extraPlugin: CallApiPlugin = {
				hooks: { onRequest: () => order.push("extra") },
				id: "extra",
				name: "Extra",
			};

			const client = createFetchClient({ baseURL: "https://api.example.com", plugins: [basePlugin] });

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			await client("/users/1", {
				hooksExecutionMode: "sequential",
				plugins: ({ basePlugins }) => [...basePlugins, extraPlugin],
			});

			expect(order).toEqual(["base", "extra"]);
		});
	});

	describe("custom plugin option definition", () => {
		it("should support plugins with defineExtraOptions", async () => {
			interface CustomPluginOptions {
				customOption: string;
				customNumber: number;
			}

			const customOptionsPlugin: CallApiPlugin = {
				id: "custom-options-plugin",
				name: "Custom Options Plugin",
				defineExtraOptions: () =>
					({
						customOption: "default",
						customNumber: 42,
					}) as CustomPluginOptions,
				hooks: {
					onRequest: (context) => {
						// Plugin should be able to access its custom options
						const options = context.options as any;
						expect(options.customOption).toBeDefined();
						expect(options.customNumber).toBeDefined();
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [customOptionsPlugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");
		});

		it("should handle plugin without defineExtraOptions", async () => {
			const simplePlugin: CallApiPlugin = {
				id: "simple-plugin",
				name: "Simple Plugin",
				hooks: {
					onRequest: () => {
						// Simple plugin without custom options
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [simplePlugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const result = await client("/users/1");
			expectSuccessResult(result);
		});
	});

	describe("plugin middleware", () => {
		it("should execute multiple plugin middlewares in reverse order", async () => {
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

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [plugin1, plugin2],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");

			// Middlewares execute in reverse: plugin2 wraps plugin1
			expect(executionOrder).toEqual([
				"plugin2-before",
				"plugin1-before",
				"plugin1-after",
				"plugin2-after",
			]);
		});

		it("should allow plugin middleware to short-circuit request", async () => {
			const shortCircuitPlugin: CallApiPlugin = {
				id: "short-circuit-plugin",
				name: "Short Circuit Plugin",
				middlewares: {
					fetchMiddleware: () => async () => {
						return createMockResponse({ cached: true });
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [shortCircuitPlugin],
			});

			const result = await client("/users/1");

			expectSuccessResult(result);
			expect(result.data).toEqual({ cached: true });
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should allow plugin middleware to modify request and response", async () => {
			const transformPlugin: CallApiPlugin = {
				id: "transform-plugin",
				name: "Transform Plugin",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						// Modify request
						const modifiedInit = {
							...init,
							headers: {
								...init?.headers,
								"X-Modified": "true",
							},
						};

						const response = await ctx.fetchImpl(input, modifiedInit);
						const data = (await response.json()) as Record<string, unknown>;

						// Modify response
						return new Response(
							JSON.stringify({
								...data,
								transformed: true,
							}),
							{
								status: response.status,
								headers: response.headers,
							}
						);
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [transformPlugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const result = await client("/users/1");

			expectSuccessResult(result);
			expect(result.data).toMatchObject({
				...mockUser,
				transformed: true,
			});
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						"X-Modified": "true",
					}),
				})
			);
		});

		it("should support dynamic middleware from setup context", async () => {
			const executionOrder: string[] = [];

			const dynamicPlugin: CallApiPlugin = {
				id: "dynamic-plugin",
				name: "Dynamic Plugin",
				middlewares: (context) => {
					executionOrder.push(`setup-url:${context.initURL}`);

					return {
						fetchMiddleware: (ctx) => async (input, init) => {
							executionOrder.push("middleware-execute");
							return ctx.fetchImpl(input, init);
						},
					};
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [dynamicPlugin],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");

			expect(executionOrder).toEqual(["setup-url:/users/1", "middleware-execute"]);
		});

		it("should compose plugin middleware with base and instance middleware", async () => {
			const executionOrder: string[] = [];

			const plugin: CallApiPlugin = {
				id: "plugin",
				name: "Plugin",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						executionOrder.push("plugin");
						return ctx.fetchImpl(input, init);
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [plugin],
				fetchMiddleware: (ctx) => async (input, init) => {
					executionOrder.push("base");
					return ctx.fetchImpl(input, init);
				},
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			await client("/users/1", {
				fetchMiddleware: (ctx) => async (input, init) => {
					executionOrder.push("instance");
					return ctx.fetchImpl(input, init);
				},
			});

			// Execution order: instance → base → plugin → fetch
			expect(executionOrder).toEqual(["instance", "base", "plugin"]);
		});

		it("should allow plugin middleware to access request context", async () => {
			let capturedContext: any;

			const contextPlugin: CallApiPlugin = {
				id: "context-plugin",
				name: "Context Plugin",
				middlewares: {
					fetchMiddleware: (ctx) => async (input, init) => {
						capturedContext = ctx;
						return ctx.fetchImpl(input, init);
					},
				},
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [contextPlugin],
				timeout: 5000,
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			await client("/users/1");

			expect(capturedContext).toBeDefined();
			expect(capturedContext.baseConfig).toBeDefined();
			expect(capturedContext.options.timeout).toBe(5000);
			expect(capturedContext.fetchImpl).toBeTypeOf("function");
		});
	});

	describe("plugin edge cases and error handling", () => {
		it("should handle plugin without hooks and without setup", async () => {
			const noOpPlugin: CallApiPlugin = { id: "noop", name: "Noop" } as CallApiPlugin;
			const client = createFetchClient({ baseURL: "https://api.example.com", plugins: [noOpPlugin] });

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const result = await client("/users/1");
			expectSuccessResult(result);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("should allow plugin setup to modify initURL and request options", async () => {
			const setupPlugin: CallApiPlugin = {
				hooks: {
					onRequest: (ctx) => {
						// Confirm we see POST before fetch
						expect(ctx.request.method).toBe("POST");
					},
				},
				id: "setup-plugin",
				name: "Setup Plugin",
				setup: () => {
					return {
						initURL: "/users/2",
						request: { method: "POST" },
					};
				},
			};

			const client = createFetchClient({ baseURL: "https://api.example.com", plugins: [setupPlugin] });

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const result = await client("/users/1");
			expectSuccessResult(result);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/2",
				expect.objectContaining({ method: "POST" })
			);
		});

		it("should surface plugin onRequest errors as result error and execute error hooks", async () => {
			const errorOrder: string[] = [];

			const throwingPlugin: CallApiPlugin = {
				hooks: {
					onRequest: () => {
						throw new Error("plugin request error");
					},
				},
				id: "throw-on-request",
				name: "Throw On Request",
			};

			const client = createFetchClient({
				baseURL: "https://api.example.com",
				onError: () => errorOrder.push("onError"),
				onRequestError: () => errorOrder.push("onRequestError"),
				plugins: [throwingPlugin],
			});

			// Even though hooks throw before fetch, the client should return an error result (not throw)
			const result = await client("/users/1");
			expectErrorResult(result);
			const err = result.error;
			expect(err.message).toContain("plugin request error");
			expect(errorOrder).toEqual(["onRequestError", "onError"]);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should handle empty plugins array", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				plugins: [],
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const result = await client("/users/1");
			expectSuccessResult(result);
		});

		it("should handle undefined plugins", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
				// plugins is undefined
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
			const result = await client("/users/1");
			expectSuccessResult(result);
		});
	});
});
