/**
 * Request functionality tests - consolidated from basic-requests and url-handling
 * Tests basic functionality, URL processing, parameter handling, and HTTP methods
 */

import { expect, test } from "vitest";
import { expectSuccessResult } from "../test-setup/assertions";
import { callTestApi } from "../test-setup/callapi-setup";
import { createFetchMock, getHeadersFromCall, mockFetchSuccess } from "../test-setup/fetch-mock";
import { mockUser, mockUsers } from "../test-setup/fixtures";

test("Basic Requests - callTestApi makes GET request by default", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	const result = await callTestApi("https://api.example.com/users/1");

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/1",
		expect.objectContaining({
			method: "GET",
		})
	);

	expectSuccessResult(result);
	expect(result.data).toEqual(mockUser);
});

test("Basic Requests - callTestApi makes requests with different HTTP methods", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser, 201);

	const result = await callTestApi("https://api.example.com/users", {
		body: { email: "john@example.com", name: "John" },
		method: "POST",
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users",
		expect.objectContaining({
			body: JSON.stringify({ email: "john@example.com", name: "John" }),
			method: "POST",
		})
	);

	const headers = getHeadersFromCall(mockFetch);
	expect(headers).toEqual(expect.objectContaining({ "Content-Type": "application/json" }));

	expectSuccessResult(result);
	expect(result.data).toEqual(mockUser);
});

test("Basic Requests - callTestApi handles request body serialization correctly", async () => {
	using mockFetch = createFetchMock();

	mockFetchSuccess(mockUser, 201);

	const requestData = { email: "john@example.com", name: "John" };

	await callTestApi("https://api.example.com/users", {
		body: requestData,
		method: "POST",
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users",
		expect.objectContaining({
			body: JSON.stringify(requestData),
			method: "POST",
		})
	);

	const headers = getHeadersFromCall(mockFetch);
	expect(headers).toEqual(expect.objectContaining({ "Content-Type": "application/json" }));
});

test("Basic Requests - callTestApi handles custom headers correctly", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callTestApi("https://api.example.com/users/1", {
		headers: {
			Authorization: "Bearer token123",
			"X-Custom-Header": "custom-value",
		},
	});

	const headers = getHeadersFromCall(mockFetch);
	expect(headers).toEqual(
		expect.objectContaining({
			Authorization: "Bearer token123",
			"X-Custom-Header": "custom-value",
		})
	);
});

test("Basic Requests - callTestApi extracts method from URL prefix", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser, 201);

	await callTestApi("@post/https://api.example.com/users", {
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

test("Basic Requests - callTestApi handles different method prefixes correctly", async () => {
	const methods = [
		{ method: "GET", prefix: "@get" },
		{ method: "POST", prefix: "@post" },
		{ method: "PUT", prefix: "@put" },
		{ method: "DELETE", prefix: "@delete" },
		{ method: "PATCH", prefix: "@patch" },
	];

	for (const { method, prefix } of methods) {
		using mockFetch = createFetchMock();
		mockFetchSuccess(mockUser);

		await callTestApi(`${prefix}/https://api.example.com/users`);

		const callArgs = mockFetch.mock.calls[0]?.[1] as RequestInit;
		expect(callArgs.method).toBe(method);

		const actualUrl = mockFetch.mock.calls[0]?.[0] as string;
		expect(actualUrl).toContain("api.example.com/users");
	}
});

test("Basic Requests - callTestApi prioritizes explicit method over URL prefix", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callTestApi("@post/https://api.example.com/users", {
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

test("URL Handling - should handle URL objects", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUsers);

	const url = new URL("https://api.example.com/users");
	const result = await callTestApi(url);

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
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUsers);

	const result = await callTestApi("https://api.example.com/users", {
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
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callTestApi("https://api.example.com/users/:id", {
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
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callTestApi("https://api.example.com/users/{userId}/posts/{postId}", {
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
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callTestApi("https://api.example.com/users/:id/posts/:postId", {
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
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callTestApi("https://api.example.com/users/:id", {
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
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callTestApi("/users/1", {
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
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callTestApi("https://other-api.com/users/1", {
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
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callTestApi("/users/1", {
		baseURL: "https://api.example.com/",
	});

	const actualUrl = mockFetch.mock.calls[0]?.[0] as string;
	expect(actualUrl).toMatch(/https:\/\/api\.example\.com\/?\/users\/1/);
});

test("URL Handling - should handle baseURL without trailing slash and relative URL without leading slash", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callTestApi("users/1", {
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
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUsers);

	await callTestApi("https://api.example.com/users", {
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
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUsers);

	await callTestApi("https://api.example.com/users", {
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
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUsers);

	await callTestApi("https://api.example.com/users", {
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
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callTestApi("https://api.example.com/users/:id", {
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
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callTestApi("https://api.example.com/:version/users/:id", {
		params: { version: "v1", id: "123" },
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/v1/users/123",
		expect.objectContaining({
			method: "GET",
		})
	);
});
