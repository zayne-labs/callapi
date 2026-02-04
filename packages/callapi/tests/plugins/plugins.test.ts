/**
 * Plugin functionality tests - consolidated from plugin-composition, plugin-hooks, plugin-initialization, and plugin-middleware
 * Tests plugin registration, setup, hooks, and middleware
 */

import { expect, test, vi } from "vitest";
import { createFetchClient } from "../../src/createFetchClient";
import type { CallApiPlugin } from "../../src/plugins";
import { expectErrorResult, expectSuccessResult } from "../test-setup/assertions";
import { createFetchMock, createMockResponse, mockFetchSuccess } from "../test-setup/fetch-mock";
import { mockUser } from "../test-setup/fixtures";

// --- Plugin Composition ---

test("Plugin Composition - composes multiple plugins with different hook types correctly", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);
	const hookTracker: Record<string, string[]> = {
		onRequest: [],
		onResponse: [],
	};

	const requestPlugin: CallApiPlugin = {
		id: "request-plugin",
		name: "Request Plugin",
		hooks: { onRequest: () => hookTracker.onRequest!.push("request-plugin") },
	};

	const responsePlugin: CallApiPlugin = {
		id: "response-plugin",
		name: "Response Plugin",
		hooks: { onResponse: () => hookTracker.onResponse!.push("response-plugin") },
	};

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [requestPlugin, responsePlugin],
	});

	await client("/users/1");

	expect(hookTracker.onRequest).toEqual(["request-plugin"]);
	expect(hookTracker.onResponse).toEqual(["response-plugin"]);
});

test("Plugin Composition - supports plugins config as a function for dynamic modification", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);
	const order: string[] = [];

	const basePlugin: CallApiPlugin = {
		id: "base",
		name: "Base",
		hooks: { onRequest: () => order.push("base") },
	};
	const extraPlugin: CallApiPlugin = {
		id: "extra",
		name: "Extra",
		hooks: { onRequest: () => order.push("extra") },
	};

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [basePlugin],
	});

	await client("/users/1", {
		hooksExecutionMode: "sequential",
		plugins: ({ basePlugins }) => [...basePlugins, extraPlugin],
	});

	expect(order).toEqual(["base", "extra"]);
});

// --- Plugin Hooks ---

test("Plugin Hooks - plugin registers and executes hooks correctly", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);
	const hookSpy = vi.fn();

	const hookPlugin: CallApiPlugin = {
		id: "hook-plugin",
		name: "Hook Plugin",
		hooks: { onRequest: hookSpy },
	};

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [hookPlugin],
	});

	await client("/users/1");

	expect(hookSpy).toHaveBeenCalledWith(
		expect.objectContaining({
			request: expect.any(Object),
			options: expect.any(Object),
		})
	);
});

test("Plugin Hooks - handles plugin hooks that throw errors", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

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

test("Plugin Hooks - executes plugin hooks before main hooks in sequential mode", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);
	const order: string[] = [];

	const orderingPlugin: CallApiPlugin = {
		id: "ordering-plugin",
		name: "Ordering Plugin",
		hooks: { onRequest: () => order.push("plugin") },
	};

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		onRequest: () => order.push("main"),
		plugins: [orderingPlugin],
	});

	await client("/users/1", { hooksExecutionMode: "sequential" });

	expect(order).toEqual(["plugin", "main"]);
});

// --- Plugin Initialization ---

test("Plugin Initialization - plugin setup function is called during initialization", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);
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

	await client("/users/1");

	expect(setupSpy).toHaveBeenCalledWith(
		expect.objectContaining({
			baseConfig: expect.objectContaining({ baseURL: "https://api.example.com" }),
			initURL: "/users/1",
		})
	);
});

test("Plugin Initialization - async plugin setup function is handled correctly", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	const asyncSetupPlugin: CallApiPlugin = {
		id: "async-setup-plugin",
		name: "Async Setup Plugin",
		setup: async (context) => {
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

	const result = await client("/users/1");

	expectSuccessResult(result);
});

test("Plugin Initialization - gracefully handles errors in plugin setup", async () => {
	using mockFetch = createFetchMock();

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

// --- Plugin Middleware ---

test("Plugin Middleware - multiple plugin middlewares execute in reverse order", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);
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

	await client("/users/1");

	expect(executionOrder).toEqual(["plugin2-before", "plugin1-before", "plugin1-after", "plugin2-after"]);
});

test("Plugin Middleware - plugin middleware can short-circuit a request", async () => {
	using mockFetch = createFetchMock();

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

test("Plugin Middleware - plugin middleware can modify request and response", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	const transformPlugin: CallApiPlugin = {
		id: "transform-plugin",
		name: "Transform Plugin",
		middlewares: {
			fetchMiddleware: (ctx) => async (input, init) => {
				const modifiedInit = {
					...init,
					headers: { ...init?.headers, "X-Modified": "true" },
				};

				const response = await ctx.fetchImpl(input, modifiedInit);
				const data = (await response.json()) as Record<string, unknown>;

				return new Response(JSON.stringify({ ...data, transformed: true }), {
					status: response.status,
					headers: response.headers,
				});
			},
		},
	};

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [transformPlugin],
	});

	const result = await client("/users/1");

	expectSuccessResult(result);
	expect(result.data).toMatchObject({ ...mockUser, transformed: true });
	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/1",
		expect.objectContaining({
			headers: expect.objectContaining({ "X-Modified": "true" }),
		})
	);
});

test("Plugin Middleware - composes plugin middleware with base and instance middleware in correct order", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);
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

	await client("/users/1", {
		fetchMiddleware: (ctx) => async (input, init) => {
			executionOrder.push("instance");
			return ctx.fetchImpl(input, init);
		},
	});

	expect(executionOrder).toEqual(["instance", "base", "plugin"]);
});
