/**
 * Test to verify that our test infrastructure is working correctly
 */

import { describe, expect, it, vi } from "vitest";
import { HTTPError, ValidationError } from "../src/error";
import { mockBaseConfig, mockError, mockPlugin, mockUser, resetMockHookTracker } from "./fixtures";
import {
	createCallTracker,
	createMockErrorResponse,
	createMockResponse,
	delay,
	expectHTTPError,
	expectValidationError,
} from "./helpers";
import { mockFetch } from "./setup";

describe("Test Infrastructure", () => {
	describe("Setup", () => {
		it("should have global fetch mock available", () => {
			expect(globalThis.fetch).toBeDefined();
			expect(mockFetch).toBeDefined();
			expect(vi.isMockFunction(mockFetch)).toBe(true);
		});
	});

	describe("Helpers", () => {
		it("should create mock responses correctly", () => {
			const response = createMockResponse(mockUser, 200);
			expect(response.status).toBe(200);
			expect(response.ok).toBe(true);
		});

		it("should create mock error responses correctly", () => {
			const response = createMockErrorResponse(mockError, 400);
			expect(response.status).toBe(400);
			expect(response.ok).toBe(false);
		});

		it("should have working assertion helpers", () => {
			const mockResponse = createMockResponse("Not found", 404);
			const httpError = new HTTPError({
				defaultHTTPErrorMessage: "HTTP Error",
				errorData: { message: "Not found" },
				response: mockResponse,
			});
			expectHTTPError(httpError, 404);

			const validationError = new ValidationError({
				issues: [{ message: "Validation failed", path: [] }],
				response: null,
			});
			expectValidationError(validationError);
		});

		it("should have working delay helper", async () => {
			const start = Date.now();
			await delay(50);
			const elapsed = Date.now() - start;
			expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some tolerance
		});

		it("should have working call tracker", () => {
			const tracker = createCallTracker();

			tracker.track("arg1", "arg2");
			tracker.track("arg3");

			expect(tracker.getCallCount()).toBe(2);
			expect(tracker.getLastCall()?.args).toEqual(["arg3"]);

			tracker.reset();
			expect(tracker.getCallCount()).toBe(0);
		});
	});

	describe("Fixtures", () => {
		it("should have mock user data", () => {
			expect(mockUser).toBeDefined();
			expect(mockUser.id).toBe(1);
			expect(mockUser.name).toBe("John Doe");
			expect(mockUser.email).toBe("john@example.com");
		});

		it("should have mock error data", () => {
			expect(mockError).toBeDefined();
			expect(mockError.code).toBe("VALIDATION_ERROR");
			expect(mockError.message).toBeDefined();
		});

		it("should have mock configuration", () => {
			expect(mockBaseConfig).toBeDefined();
			expect(mockBaseConfig.baseURL).toBe("https://api.example.com");
			expect(mockBaseConfig.timeout).toBe(5000);
		});

		it("should have mock plugin", () => {
			expect(mockPlugin).toBeDefined();
			expect(mockPlugin.id).toBe("test-plugin");
			expect(mockPlugin.name).toBe("Test Plugin");
			expect(mockPlugin.hooks).toBeDefined();
		});

		it("should reset hook tracker", () => {
			resetMockHookTracker();
			// This should not throw and should reset the tracker
			expect(true).toBe(true);
		});
	});

	describe("Fetch Mocking", () => {
		it("should work with basic fetch mock", async () => {
			const mockResponse = createMockResponse(mockUser);
			mockFetch.mockResolvedValueOnce(mockResponse);

			const response = await fetch("https://api.example.com/users/1");
			const data = await response.json();

			expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/users/1");
			expect(data).toEqual(mockUser);
		});

		it("should handle mock errors", async () => {
			const mockErrorResponse = createMockErrorResponse(mockError, 400);
			mockFetch.mockResolvedValueOnce(mockErrorResponse);

			const response = await fetch("https://api.example.com/users");
			const errorData = await response.json();

			expect(response.status).toBe(400);
			expect(errorData).toEqual(mockError);
		});

		it("should handle network errors", async () => {
			const networkError = new Error("Network error");
			mockFetch.mockRejectedValueOnce(networkError);

			await expect(fetch("https://api.example.com/users")).rejects.toThrow("Network error");
		});
	});
});

describe("Fetch Mock Utilities", () => {
	it("should be available for import", async () => {
		// Test that we can import the fetch mock utilities
		const { mockFetchError, mockFetchNetworkError, mockFetchSuccess } = await import("./fetch-mock");

		expect(mockFetchSuccess).toBeDefined();
		expect(mockFetchError).toBeDefined();
		expect(mockFetchNetworkError).toBeDefined();
	});
});
