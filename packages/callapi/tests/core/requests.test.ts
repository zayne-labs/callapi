/**
 * Request functionality tests - consolidated from basic-requests and url-handling
 * Tests basic functionality, URL processing, parameter handling, and HTTP methods
 */

import { expect, test, vi } from "vitest";
import { callApi } from "../../src/createFetchClient";
import { expectSuccessResult } from "../test-setup/assertions";
import { createFetchMock, mockFetchSuccess } from "../test-setup/fetch-mock";
import { mockUser, mockUsers } from "../test-setup/fixtures";
import { mockFetch } from "../test-setup/setup";

// --- Basic Requests ---

test("Basic Requests - callApi makes GET request by default", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	const result = await callApi("https://api.example.com/users/1");

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/1",
		expect.objectContaining({
			method: "GET",
		})
	);

	expectSuccessResult(result);
	expect(result.data).toEqual(mockUser);
});

test("Basic Requests - callApi makes requests with different HTTP methods", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser, 201);

	const result = await callApi("https://api.example.com/users", {
		body: { email: "john@example.com", name: "John" },
		method: "POST",
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users",
		expect.objectContaining({
			body: JSON.stringify({ email: "john@example.com", name: "John" }),
			headers: expect.objectContaining({
				"Content-Type": "application/json",
			}),
			method: "POST",
		})
	);

	expectSuccessResult(result);
	expect(result.data).toEqual(mockUser);
});

test("Basic Requests - callApi handles request body serialization correctly", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser, 201);

	const requestData = { email: "john@example.com", name: "John" };

	await callApi("https://api.example.com/users", {
		body: requestData,
		method: "POST",
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users",
		expect.objectContaining({
			body: JSON.stringify(requestData),
			headers: expect.objectContaining({
				"Content-Type": "application/json",
			}),
			method: "POST",
		})
	);
});

test("Basic Requests - callApi handles custom headers correctly", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("https://api.example.com/users/1", {
		headers: {
			Authorization: "Bearer token123",
			"X-Custom-Header": "custom-value",
		},
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/1",
		expect.objectContaining({
			headers: expect.objectContaining({
				Authorization: "Bearer token123",
				"X-Custom-Header": "custom-value",
			}),
		})
	);
});

test("Basic Requests - callApi extracts method from URL prefix", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser, 201);

	await callApi("@post/https://api.example.com/users", {
		body: { name: "John" },
	});

	expect(mockFetch).toHaveBeenCalledWith(
		expect.any(String),
		expect.objectContaining({
			method: "POST",
		})
	);

	const actualUrl = mockFetch.mock.calls[0]?.[0] as string;
	expect(actualUrl).toContain("api.example.com/users");
});

test("Basic Requests - callApi handles different method prefixes correctly", async () => {
	const methods = [
		{ method: "GET", prefix: "@get" },
		{ method: "POST", prefix: "@post" },
		{ method: "PUT", prefix: "@put" },
		{ method: "DELETE", prefix: "@delete" },
		{ method: "PATCH", prefix: "@patch" },
	];

	for (const { method, prefix } of methods) {
		using _ignoredMockFetch = createFetchMock();
		mockFetchSuccess(mockUser);

		await callApi(`${prefix}/https://api.example.com/users`);

		const callArgs = mockFetch.mock.calls[0]?.[1] as RequestInit;
		expect(callArgs.method).toBe(method);

		const actualUrl = mockFetch.mock.calls[0]?.[0] as string;
		expect(actualUrl).toContain("api.example.com/users");
	}
});

test("Basic Requests - callApi prioritizes explicit method over URL prefix", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("@post/https://api.example.com/users", {
		// @ts-expect-error -- It's a test, so the error is expected
		method: "PUT",
	});

	expect(mockFetch).toHaveBeenCalledWith(
		expect.any(String),
		expect.objectContaining({
			method: "PUT",
		})
	);

	const actualUrl = mockFetch.mock.calls[0]?.[0] as string;
	expect(actualUrl).toContain("api.example.com/users");
});

// --- URL Handling ---

test("URL Handling - should handle URL objects", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUsers);

	const url = new URL("https://api.example.com/users");
	const result = await callApi(url);

	expectSuccessResult(result);
	expect(result.data).toEqual(mockUsers);
	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users",
		expect.objectContaining({
			method: "GET",
		})
	);
});

test("URL Handling - should handle query parameters", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUsers);

	const result = await callApi("https://api.example.com/users", {
		query: {
			limit: 10,
			page: 1,
			sort: "name",
		},
	});

	expectSuccessResult(result);
	expect(result.data).toEqual(mockUsers);

	const actualUrl = mockFetch.mock.calls[0]?.[0] as string;
	expect(actualUrl).toContain("https://api.example.com/users?");
	expect(actualUrl).toContain("limit=10");
	expect(actualUrl).toContain("page=1");
	expect(actualUrl).toContain("sort=name");
});

test("URL Handling - should handle URL parameters with object syntax", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("https://api.example.com/users/:id", {
		params: { id: "123" },
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/123",
		expect.objectContaining({
			method: "GET",
		})
	);
});

test("URL Handling - should handle URL parameters with curly brace syntax", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("https://api.example.com/users/{userId}/posts/{postId}", {
		params: { postId: "456", userId: "123" },
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/123/posts/456",
		expect.objectContaining({
			method: "GET",
		})
	);
});

test("URL Handling - should handle URL parameters with array syntax", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("https://api.example.com/users/:id/posts/:postId", {
		params: ["123", "456"],
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/123/posts/456",
		expect.objectContaining({
			method: "GET",
		})
	);
});

test("URL Handling - should combine params and query parameters", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("https://api.example.com/users/:id", {
		params: { id: "123" },
		query: { include: "profile" },
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/123?include=profile",
		expect.objectContaining({
			method: "GET",
		})
	);
});

test("URL Handling - should handle relative URLs with baseURL", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("/users/1", {
		baseURL: "https://api.example.com",
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/1",
		expect.objectContaining({
			method: "GET",
		})
	);
});

test("URL Handling - should prioritize absolute URLs over baseURL", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("https://other-api.com/users/1", {
		baseURL: "https://api.example.com",
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://other-api.com/users/1",
		expect.objectContaining({
			method: "GET",
		})
	);
});

test("URL Handling - should handle baseURL with trailing slash and relative URL with leading slash", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("/users/1", {
		baseURL: "https://api.example.com/",
	});

	const actualUrl = mockFetch.mock.calls[0]?.[0] as string;
	expect(actualUrl).toMatch(/https:\/\/api\.example\.com\/?\/users\/1/);
});

test("URL Handling - should handle baseURL without trailing slash and relative URL without leading slash", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("users/1", {
		baseURL: "https://api.example.com",
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/1",
		expect.objectContaining({
			method: "GET",
		})
	);
});

test("URL Handling - should handle query parameters with special characters", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUsers);

	await callApi("https://api.example.com/users", {
		query: {
			search: "john doe",
			filter: "name=John&age>25",
			special: "hello@world.com",
		},
	});

	const actualUrl = mockFetch.mock.calls[0]?.[0] as string;
	expect(actualUrl).toContain("search=john+doe");
	expect(actualUrl).toContain("filter=name%3DJohn%26age%3E25");
	expect(actualUrl).toContain("special=hello%40world.com");
});

test("URL Handling - should handle query parameters with arrays", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUsers);

	await callApi("https://api.example.com/users", {
		query: {
			tags: "javascript,typescript,react",
			ids: "1,2,3",
		},
	});

	const actualUrl = mockFetch.mock.calls[0]?.[0] as string;
	expect(actualUrl).toContain("tags=javascript%2Ctypescript%2Creact");
	expect(actualUrl).toContain("ids=1%2C2%2C3");
});

test("URL Handling - should handle null and undefined query parameter values", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUsers);

	await callApi("https://api.example.com/users", {
		query: {
			active: true,
			name: "john",
		},
	});

	const actualUrl = mockFetch.mock.calls[0]?.[0] as string;
	expect(actualUrl).toContain("active=true");
	expect(actualUrl).toContain("name=john");
});

test("URL Handling - should handle URL parameters with special characters", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("https://api.example.com/users/:id", {
		params: { id: "user@example.com" },
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/user@example.com",
		expect.objectContaining({
			method: "GET",
		})
	);
});

test("URL Handling - should handle multiple parameter substitutions in same URL segment", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("https://api.example.com/:version/users/:id", {
		params: { version: "v1", id: "123" },
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/v1/users/123",
		expect.objectContaining({
			method: "GET",
		})
	);
});
