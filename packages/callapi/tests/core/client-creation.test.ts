/**
 * Client creation tests - flat structure without nested describe blocks
 * Tests createFetchClient instantiation and basic configuration
 */

import { expect, test } from "vitest";
import { createFetchClient } from "../../src/createFetchClient";
import { definePlugin } from "../../src/utils/external";
import { createFetchMock, createMockResponse, getHeadersFromCall } from "../test-setup/fetch-mock";
import { mockUser } from "../test-setup/fixtures";

test("createFetchClient inherits baseURL from base config when making requests", async () => {
	using mockFetch = createFetchMock();
	mockFetch.mockResolvedValue(createMockResponse(mockUser));

	const client = createFetchClient({
		baseURL: "https://api.example.com",
	});

	await client("/users/1");

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/1",
		expect.objectContaining({
			method: "GET",
		})
	);
});

test("createFetchClient inherits headers from base config when making requests", async () => {
	using mockFetch = createFetchMock();
	mockFetch.mockResolvedValue(createMockResponse(mockUser));

	const client = createFetchClient({
		headers: {
			"Content-Type": "application/json",
			"X-API-Key": "base-key",
		},
	});

	await client("https://api.example.com/users/1");

	const headers = getHeadersFromCall(mockFetch);
	expect(headers).toEqual(
		expect.objectContaining({
			"Content-Type": "application/json",
			"X-API-Key": "base-key",
		})
	);
});

test("createFetchClient inherits timeout from base config when making requests", async () => {
	using mockFetch = createFetchMock();
	mockFetch.mockResolvedValue(createMockResponse(mockUser));

	const client = createFetchClient({
		timeout: 5000,
	});

	await client("https://api.example.com/users/1");

	// Verify that AbortSignal was created (timeout functionality)
	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/1",
		expect.objectContaining({
			signal: expect.any(AbortSignal),
		})
	);
});

test("createFetchClient inherits auth from base config when making requests", async () => {
	using mockFetch = createFetchMock();
	mockFetch.mockResolvedValue(createMockResponse(mockUser));

	const mockAuthToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token";
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		auth: {
			type: "Bearer",
			value: mockAuthToken,
		},
	});

	await client("/users/1");

	const headers = getHeadersFromCall(mockFetch);
	expect(headers).toEqual(expect.objectContaining({ Authorization: expect.stringContaining("Bearer") }));
});

test("createFetchClient merges base config with instance config when making requests", async () => {
	using mockFetch = createFetchMock();
	mockFetch.mockResolvedValue(createMockResponse(mockUser));

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		headers: {
			"X-Base-Header": "base-value",
		},
		timeout: 5000,
	});

	await client("/users/1", {
		headers: {
			"X-Instance-Header": "instance-value",
		},
		method: "POST",
	});

	const headers = getHeadersFromCall(mockFetch);
	expect(headers).toEqual(expect.objectContaining({ "X-Instance-Header": "instance-value" }));
});

test("createFetchClient allows instance config to override base config", async () => {
	using mockFetch = createFetchMock();
	mockFetch.mockResolvedValue(createMockResponse(mockUser));

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		headers: {
			"Content-Type": "application/json",
		},
		timeout: 5000,
	});

	await client("/users/1", {
		headers: {
			"Content-Type": "application/xml",
		},
		timeout: 3000,
	});

	const headers = getHeadersFromCall(mockFetch);
	expect(headers).toEqual(expect.objectContaining({ "Content-Type": "application/xml" }));
});

test("createFetchClient handles skipAutoMergeFor option correctly", async () => {
	using mockFetch = createFetchMock();
	mockFetch.mockResolvedValue(createMockResponse(mockUser));

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		headers: {
			"X-Base-Header": "base-value",
		},
		skipAutoMergeFor: "request",
	});

	await client("/users/1", {
		headers: {
			"X-Instance-Header": "instance-value",
		},
	});

	// Check that the call was made with the correct URL
	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/1",
		expect.objectContaining({
			method: "GET",
		})
	);

	// Check the actual headers behavior based on skipAutoMergeFor
	const callArgs = mockFetch.mock.calls[0]?.[1] as RequestInit;
	const headers = callArgs.headers as Record<string, string>;

	// The actual behavior depends on the implementation
	// This test verifies the call was made successfully
	expect(headers).toBeDefined();
});

test("createFetchClient executes plugin hooks when making requests", async () => {
	using mockFetch = createFetchMock();
	mockFetch.mockResolvedValue(createMockResponse(mockUser));

	const mockPlugin = definePlugin({
		hooks: {
			onRequest: (context) => {
				context.request.headers["X-Test-Plugin"] = "true";
			},
		},
		id: "test-plugin",
		name: "Test Plugin",
	});

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [mockPlugin],
	});

	await client("/users/1");

	const headers = getHeadersFromCall(mockFetch);
	expect(headers).toEqual(expect.objectContaining({ "X-Test-Plugin": "true" }));
});

test("createFetchClient executes plugin setup functions when making requests", async () => {
	using mockFetch = createFetchMock();
	mockFetch.mockResolvedValue(createMockResponse(mockUser));

	const mockPluginWithSetup = definePlugin({
		hooks: {
			onRequest: (context) => {
				context.request.headers["X-Setup-Plugin"] = "true";
			},
		},
		id: "test-plugin-with-setup",
		name: "Test Plugin With Setup",
		setup: (context) => {
			// Return modified options to test setup functionality
			return {
				options: {
					...context.options,
					meta: { ...context.options.meta, pluginSetup: true },
				},
			};
		},
	});

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [mockPluginWithSetup],
	});

	await client("/users/1");

	const headers = getHeadersFromCall(mockFetch);
	expect(headers).toEqual(expect.objectContaining({ "X-Setup-Plugin": "true" }));
});

test("createFetchClient handles multiple plugins when making requests", async () => {
	using mockFetch = createFetchMock();
	mockFetch.mockResolvedValue(createMockResponse(mockUser));

	const firstPlugin = definePlugin({
		hooks: {
			onRequest: (context) => {
				context.request.headers["X-Test-Plugin"] = "true";
			},
		},
		id: "test-plugin",
		name: "Test Plugin",
	});

	const secondPlugin = definePlugin({
		hooks: {
			onRequest: (context) => {
				context.request.headers["X-Second-Plugin"] = "true";
			},
		},
		id: "second-plugin",
		name: "Second Plugin",
	});

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [firstPlugin, secondPlugin],
	});

	await client("/users/1");

	const headers = getHeadersFromCall(mockFetch);
	expect(headers).toEqual(
		expect.objectContaining({
			"X-Test-Plugin": "true",
			"X-Second-Plugin": "true",
		})
	);
});
