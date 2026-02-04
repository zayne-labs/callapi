/**
 * Middleware short-circuiting tests - flat structure without nested describe blocks
 * Tests middleware ability to return responses without calling fetchImpl
 */

import { expect, test } from "vitest";
import { createFetchClient } from "../../src/createFetchClient";
import type { Middlewares } from "../../src/middlewares";
import type { CallApiPlugin } from "../../src/plugins";
import { expectSuccessResult } from "../test-setup/assertions";
import { createFetchMock, createMockResponse } from "../test-setup/fetch-mock";
import { mockUser } from "../test-setup/fixtures";

type FetchMiddleware = Middlewares["fetchMiddleware"];

test("middleware can return response without calling fetchImpl", async () => {
	using mockFetch = createFetchMock();

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

test("plugin middleware can short-circuit request", async () => {
	using mockFetch = createFetchMock();

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

test("per-request middleware can short-circuit request", async () => {
	using mockFetch = createFetchMock();

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

test("short-circuit stops middleware chain execution", async () => {
	using mockFetch = createFetchMock();
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

test("conditional short-circuiting based on request URL", async () => {
	using mockFetch = createFetchMock();
	mockFetch.mockResolvedValue(createMockResponse(mockUser));

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
	const cachedResult = await client("/cached/data");
	expectSuccessResult(cachedResult);
	expect(cachedResult.data).toEqual({ cached: true });
	expect(mockFetch).not.toHaveBeenCalled();

	// Non-cached endpoint - should call fetch
	const normalResult = await client("/users/1");
	expectSuccessResult(normalResult);
	expect(normalResult.data).toEqual(mockUser);
	expect(mockFetch).toHaveBeenCalledTimes(1);
});

test("middleware can short-circuit based on request method", async () => {
	using mockFetch = createFetchMock();
	mockFetch.mockResolvedValue(createMockResponse(mockUser));

	const methodMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
		const method = init?.method || "GET";

		// Short-circuit GET requests with cached response
		if (method === "GET") {
			return createMockResponse({ cached: true, method: "GET" });
		}

		// Pass through other methods
		return ctx.fetchImpl(input, init);
	};

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		fetchMiddleware: methodMiddleware,
	});

	// GET request - should short-circuit
	const getResult = await client("/users/1", { method: "GET" });
	expectSuccessResult(getResult);
	expect(getResult.data).toEqual({ cached: true, method: "GET" });
	expect(mockFetch).not.toHaveBeenCalled();

	// POST request - should call fetch
	const postResult = await client("/users", { method: "POST", body: { name: "test" } });
	expectSuccessResult(postResult);
	expect(postResult.data).toEqual(mockUser);
	expect(mockFetch).toHaveBeenCalledTimes(1);
});

test("middleware can short-circuit based on headers", async () => {
	using mockFetch = createFetchMock();
	mockFetch.mockResolvedValue(createMockResponse(mockUser));

	const headerMiddleware: FetchMiddleware = (ctx) => async (input, init) => {
		const headers = new Headers(init?.headers);

		// Short-circuit if offline mode header is present
		if (headers.get("X-Offline-Mode") === "true") {
			return createMockResponse({ offline: true });
		}

		return ctx.fetchImpl(input, init);
	};

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		fetchMiddleware: headerMiddleware,
	});

	// With offline header - should short-circuit
	const offlineResult = await client("/users/1", {
		headers: { "X-Offline-Mode": "true" },
	});
	expectSuccessResult(offlineResult);
	expect(offlineResult.data).toEqual({ offline: true });
	expect(mockFetch).not.toHaveBeenCalled();

	// Without offline header - should call fetch
	const onlineResult = await client("/users/1");
	expectSuccessResult(onlineResult);
	expect(onlineResult.data).toEqual(mockUser);
	expect(mockFetch).toHaveBeenCalledTimes(1);
});
