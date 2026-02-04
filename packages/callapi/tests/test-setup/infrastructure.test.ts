/**
 * Test to verify that our test infrastructure is working correctly - flat structure
 */

import { expect, test, vi } from "vitest";
import { HTTPError, ValidationError } from "../../src/utils/external/error";
import { expectHTTPError, expectValidationError } from "./assertions";
import { createCallTracker, delay } from "./common";
import { createFetchMock, createMockErrorResponse, createMockResponse } from "./fetch-mock";
import { mockBaseConfig, mockError, mockPlugin, mockUser, resetMockHookTracker } from "./fixtures";
import { mockFetch } from "./setup";

// Setup
test("should have global fetch mock available", () => {
	expect(globalThis.fetch).toBeDefined();
	expect(mockFetch).toBeDefined();
	expect(vi.isMockFunction(mockFetch)).toBe(true);
});

// Helpers
test("should create mock responses correctly", () => {
	const response = createMockResponse(mockUser, 200);
	expect(response.status).toBe(200);
	expect(response.ok).toBe(true);
});

test("should create mock error responses correctly", () => {
	const response = createMockErrorResponse(mockError, 400);
	expect(response.status).toBe(400);
	expect(response.ok).toBe(false);
});

test("should have working assertion helpers", () => {
	const mockResponse = createMockResponse("Not found", 404);
	const httpError = new HTTPError({
		defaultHTTPErrorMessage: "HTTP Error",
		errorData: { message: "Not found" },
		response: mockResponse,
	});
	expectHTTPError(httpError, 404);

	const validationError = new ValidationError({
		issueCause: "unknown",
		issues: [{ message: "Validation failed", path: [] }],
		response: null,
	});
	expectValidationError(validationError);
});

test("should have working delay helper", async () => {
	const start = Date.now();
	await delay(50);
	const elapsed = Date.now() - start;
	expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some tolerance
});

test("should have working call tracker", () => {
	const tracker = createCallTracker();

	tracker.track("arg1", "arg2");
	tracker.track("arg3");

	expect(tracker.getCallCount()).toBe(2);
	expect(tracker.getLastCall()?.args).toEqual(["arg3"]);

	tracker.reset();
	expect(tracker.getCallCount()).toBe(0);
});

// Fixtures
test("should have mock user data", () => {
	expect(mockUser).toBeDefined();
	expect(mockUser.id).toBe(1);
	expect(mockUser.name).toBe("John Doe");
	expect(mockUser.email).toBe("john@example.com");
});

test("should have mock error data", () => {
	expect(mockError).toBeDefined();
	expect(mockError.code).toBe("VALIDATION_ERROR");
	expect(mockError.message).toBeDefined();
});

test("should have mock configuration", () => {
	expect(mockBaseConfig).toBeDefined();
	expect(mockBaseConfig.baseURL).toBe("https://api.example.com");
	expect(mockBaseConfig.timeout).toBe(5000);
});

test("should have mock plugin", () => {
	expect(mockPlugin).toBeDefined();
	expect(mockPlugin.id).toBe("test-plugin");
	expect(mockPlugin.name).toBe("Test Plugin");
	expect(mockPlugin.hooks).toBeDefined();
});

test("should reset hook tracker", () => {
	resetMockHookTracker();
	// This should not throw and should reset the tracker
	expect(true).toBe(true);
});

// Fetch Mocking
test("should work with basic fetch mock", async () => {
	using _ignoredMockFetch = createFetchMock();
	const mockResponse = createMockResponse(mockUser);
	mockFetch.mockResolvedValueOnce(mockResponse);

	const response = await fetch("https://api.example.com/users/1");
	const data = await response.json();

	expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/users/1");
	expect(data).toEqual(mockUser);
});

test("should handle mock errors", async () => {
	using _ignoredMockFetch = createFetchMock();
	const mockErrorResponse = createMockErrorResponse(mockError, 400);
	mockFetch.mockResolvedValueOnce(mockErrorResponse);

	const response = await fetch("https://api.example.com/users");
	const errorData = await response.json();

	expect(response.status).toBe(400);
	expect(errorData).toEqual(mockError);
});

test("should handle network errors", async () => {
	using _ignoredMockFetch = createFetchMock();
	const networkError = new Error("Network error");
	mockFetch.mockRejectedValueOnce(networkError);

	await expect(fetch("https://api.example.com/users")).rejects.toThrow("Network error");
});

test("fetch mock utilities should be available for import", async () => {
	const { mockFetchError, mockFetchNetworkError, mockFetchSuccess } = await import("./fetch-mock");

	expect(mockFetchSuccess).toBeDefined();
	expect(mockFetchError).toBeDefined();
	expect(mockFetchNetworkError).toBeDefined();
});
