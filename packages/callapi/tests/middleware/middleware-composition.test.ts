/**
 * Middleware composition tests - flat structure without nested describe blocks
 * Tests middleware composition order, plugin middleware, and execution flow
 */

import { expect, test } from "vitest";
import { createFetchClient } from "../../src/createFetchClient";
import type { FetchImpl, Middlewares } from "../../src/middlewares";
import type { CallApiPlugin } from "../../src/plugins";
import { expectSuccessResult } from "../test-setup/assertions";
import { createFetchMock, createMockResponse, mockFetchSuccess } from "../test-setup/fetch-mock";
import { mockUser } from "../test-setup/fixtures";

type FetchMiddleware = Middlewares["fetchMiddleware"];

test("middleware composes in correct order: per-request → base → plugin → customFetch", async () => {
	using mockFetch = createFetchMock();
	const executionOrder: string[] = [];
	mockFetch.mockResolvedValue(createMockResponse(mockUser));

	const baseMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
		executionOrder.push("base-before");
		const response = await ctx.fetchImpl(input, init);
		executionOrder.push("base-after");
		return response;
	};

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

	const perRequestMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
		executionOrder.push("per-request-before");
		const response = await ctx.fetchImpl(input, init);
		executionOrder.push("per-request-after");
		return response;
	};

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

	await client("/users/1", {
		fetchMiddleware: perRequestMiddleware,
	});

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

test("multiple plugin middlewares execute in reverse registration order", async () => {
	using _ignoredMockFetch = createFetchMock();
	const executionOrder: string[] = [];
	mockFetchSuccess(mockUser);

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

	await client("/users/1");

	expect(executionOrder).toEqual([
		"plugin3-before",
		"plugin2-before",
		"plugin1-before",
		"plugin1-after",
		"plugin2-after",
		"plugin3-after",
	]);
});

test("works with only base middleware", async () => {
	using _ignoredMockFetch = createFetchMock();
	const executionOrder: string[] = [];
	mockFetchSuccess(mockUser);

	const middleware: FetchMiddleware = (ctx) => async (input, init) => {
		executionOrder.push("base");
		return ctx.fetchImpl(input, init);
	};

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		fetchMiddleware: middleware,
	});

	await client("/users/1");

	expect(executionOrder).toEqual(["base"]);
});

test("works with only per-request middleware", async () => {
	using _ignoredMockFetch = createFetchMock();
	const executionOrder: string[] = [];
	mockFetchSuccess(mockUser);

	const middleware: FetchMiddleware = (ctx) => async (input, init) => {
		executionOrder.push("per-request");
		return ctx.fetchImpl(input, init);
	};

	const client = createFetchClient({
		baseURL: "https://api.example.com",
	});

	await client("/users/1", {
		fetchMiddleware: middleware,
	});

	expect(executionOrder).toEqual(["per-request"]);
});

test("works with only plugin middleware", async () => {
	using _ignoredMockFetch = createFetchMock();
	const executionOrder: string[] = [];
	mockFetchSuccess(mockUser);

	const middleware: FetchMiddleware = (ctx) => async (input, init) => {
		executionOrder.push("plugin");
		return ctx.fetchImpl(input, init);
	};

	const plugin: CallApiPlugin = {
		id: "test-plugin",
		name: "Test Plugin",
		middlewares: { fetchMiddleware: middleware },
	};

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	await client("/users/1");

	expect(executionOrder).toEqual(["plugin"]);
});

test("plugin maintains state via closure for caching", async () => {
	using mockFetch = createFetchMock();
	const cache = new Map<string, Response>();
	mockFetch.mockResolvedValue(createMockResponse(mockUser));

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
	const result1 = await client("/users/1");
	expectSuccessResult(result1);
	expect(mockFetch).toHaveBeenCalledTimes(1);

	// Second call - should hit cache
	const result2 = await client("/users/1");
	expectSuccessResult(result2);
	expect(result2.data).toEqual(mockUser);
	expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call
});

test("plugin tracks request count via closure", async () => {
	using _ignoredMockFetch = createFetchMock();
	let requestCount = 0;
	mockFetchSuccess(mockUser);

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

	await client("/users/1");
	expect(requestCount).toBe(1);

	await client("/users/2");
	expect(requestCount).toBe(2);

	await client("/users/3");
	expect(requestCount).toBe(3);
});
