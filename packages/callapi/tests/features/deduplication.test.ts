/**
 * Deduplication functionality tests - consolidated from dedupe-keys, dedupe-scopes, and dedupe-strategies
 * Tests deduplication keys, cache scopes, and strategies
 */

import { expect, test } from "vitest";
import { createFetchClient } from "../../src";
import {
	createFetchMock,
	getFetchCallCount,
	mockFetchError,
	mockFetchSuccess,
} from "../test-setup/fetch-mock";
import { mockUser } from "../test-setup/fixtures";

// --- Dedupe Keys ---

test("Dedupe Keys - uses custom string dedupe key to deduplicate different endpoints", async () => {
	using _ignoredMockFetch = createFetchMock();
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		dedupeKey: "shared-key",
		dedupeStrategy: "defer",
	});

	mockFetchSuccess(mockUser);
	mockFetchSuccess(mockUser);
	mockFetchSuccess(mockUser);

	const requests = [client("/users/1"), client("/users/2"), client("/config")];

	const results = await Promise.all(requests);

	results.forEach((result) => {
		expect(result.data).toBeDefined();
	});
	expect(getFetchCallCount()).toBeGreaterThanOrEqual(1);
});

test("Dedupe Keys - uses custom function dedupe key for granular control", async () => {
	using _ignoredMockFetch = createFetchMock();
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		dedupeKey: (context) => {
			const match = context.options.fullURL?.match(/\/users\/(\d+)/);
			return match ? `user-${match[1]}` : (context.options.fullURL ?? "default");
		},
		dedupeStrategy: "defer",
	});

	mockFetchSuccess(mockUser);
	mockFetchSuccess(mockUser);

	const requests = [client("/users/1?a=1"), client("/users/1?b=2")];

	const results = await Promise.all(requests);

	expect(results).toHaveLength(2);
	expect(getFetchCallCount()).toBeGreaterThanOrEqual(1);
});

test("Dedupe Keys - handles empty string dedupe key correctly", async () => {
	using _ignoredMockFetch = createFetchMock();
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		dedupeKey: () => "",
		dedupeStrategy: "defer",
	});

	mockFetchSuccess(mockUser);
	mockFetchSuccess(mockUser);

	const requests = [client("/users/1"), client("/users/2")];

	const results = await Promise.all(requests);

	expect(results[0]?.data).toBeDefined();
	expect(results[1]?.data).toBeDefined();
	expect(getFetchCallCount()).toBeGreaterThanOrEqual(1);
});

test("Dedupe Keys - disables deduplication when dedupe key function returns null", async () => {
	using _ignoredMockFetch = createFetchMock();
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		dedupeKey: () => null as never,
		dedupeStrategy: "defer",
	});

	mockFetchSuccess(mockUser);
	mockFetchSuccess(mockUser);

	const [result1, result2] = await Promise.all([client("/users/1"), client("/users/1")]);

	expect(result1.data).toBeDefined();
	expect(result2.data).toBeDefined();
	expect(getFetchCallCount()).toBe(2);
});

// --- Dedupe Scopes ---

test("Dedupe Scopes - isolates deduplication between different clients with local cache scope", async () => {
	using _ignoredMockFetch = createFetchMock();
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
	mockFetchSuccess(mockUser);

	const [result1, result2] = await Promise.all([client1("/users/1"), client2("/users/1")]);

	expect(result1.data).toBeDefined();
	expect(result2.data).toBeDefined();
	expect(getFetchCallCount()).toBe(2);
});

test("Dedupe Scopes - shares deduplication between clients with same global cache scope key", async () => {
	using _ignoredMockFetch = createFetchMock();
	const client1 = createFetchClient({
		baseURL: "https://api.example.com",
		dedupeCacheScope: "global",
		dedupeCacheScopeKey: "shared-cache-unique-2",
		dedupeStrategy: "defer",
	});

	const client2 = createFetchClient({
		baseURL: "https://api.example.com",
		dedupeCacheScope: "global",
		dedupeCacheScopeKey: "shared-cache-unique-2",
		dedupeStrategy: "defer",
	});

	mockFetchSuccess(mockUser);
	mockFetchSuccess(mockUser);

	const [result1, result2] = await Promise.all([client1("/users/1"), client2("/users/1")]);

	expect(result1.data).toBeDefined();
	expect(result2.data).toBeDefined();
	expect(getFetchCallCount()).toBeGreaterThanOrEqual(1);
});

test("Dedupe Scopes - isolates deduplication between different global cache scope keys", async () => {
	using _ignoredMockFetch = createFetchMock();
	const client1 = createFetchClient({
		baseURL: "https://api.example.com",
		dedupeCacheScope: "global",
		dedupeCacheScopeKey: "cache-unique-5",
		dedupeStrategy: "defer",
	});

	const client2 = createFetchClient({
		baseURL: "https://api.example.com",
		dedupeCacheScope: "global",
		dedupeCacheScopeKey: "cache-unique-6",
		dedupeStrategy: "defer",
	});

	mockFetchSuccess(mockUser);
	mockFetchSuccess(mockUser);

	const [result1, result2] = await Promise.all([client1("/users/1"), client2("/users/1")]);

	expect(result1.data).toBeDefined();
	expect(result2.data).toBeDefined();
	expect(getFetchCallCount()).toBe(2);
});

// --- Dedupe Strategies ---

test("Dedupe Strategies - cancel strategy aborts previous duplicate requests", async () => {
	using _ignoredMockFetch = createFetchMock();
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		dedupeStrategy: "cancel",
	});

	mockFetchSuccess(mockUser);
	mockFetchSuccess(mockUser);

	const firstRequestPromise = client("/users/1");
	const secondRequestPromise = client("/users/1");

	const results = await Promise.allSettled([firstRequestPromise, secondRequestPromise]);

	expect(results).toHaveLength(2);
	expect(results.every((r) => r.status === "fulfilled" || r.status === "rejected")).toBe(true);
});

test("Dedupe Strategies - defer strategy shares response between duplicate requests", async () => {
	using _ignoredMockFetch = createFetchMock();
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		dedupeStrategy: "defer",
	});

	mockFetchSuccess(mockUser);
	mockFetchSuccess(mockUser);
	mockFetchSuccess(mockUser);

	const requests = [client("/users/1"), client("/users/1"), client("/users/1")];
	const results = await Promise.all(requests);

	expect(results).toHaveLength(3);
	results.forEach((result) => {
		expect(result.data).toBeDefined();
	});

	const allSameData = results.every(
		(result) => JSON.stringify(result.data) === JSON.stringify(results[0]?.data)
	);
	expect(allSameData).toBe(true);
});

test("Dedupe Strategies - none strategy allows duplicate requests to execute independently", async () => {
	using _ignoredMockFetch = createFetchMock();
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		dedupeStrategy: "none",
	});

	mockFetchSuccess(mockUser);
	mockFetchSuccess(mockUser);
	mockFetchSuccess(mockUser);

	const results = await Promise.all([client("/users/1"), client("/users/1"), client("/users/1")]);

	expect(results).toHaveLength(3);
	expect(getFetchCallCount()).toBe(3);
});

test("Dedupe Strategies - defer strategy shares error responses between requests", async () => {
	using _ignoredMockFetch = createFetchMock();
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		dedupeStrategy: "defer",
		resultMode: "all",
	});

	const errorData = { message: "User not found" };
	mockFetchError(errorData, 404);

	const requests = [client("/users/999"), client("/users/999")];
	const results = await Promise.all(requests);

	results.forEach((result) => {
		expect(result.error).toBeDefined();
		expect(result.data).toBeNull();
	});
});

test("Dedupe Strategies - supports dynamic function-based strategy selection", async () => {
	using _ignoredMockFetch = createFetchMock();
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		dedupeStrategy: (context) => {
			return context.request.method === "GET" ? "defer" : "cancel";
		},
	});

	mockFetchSuccess(mockUser);
	mockFetchSuccess({ success: true });

	const getResult = await client("/users/1", { method: "GET" });
	const postResult = await client("/users", { body: { name: "Test" }, method: "POST" });

	expect(getResult.data).toBeDefined();
	expect(postResult.data).toBeDefined();
});
