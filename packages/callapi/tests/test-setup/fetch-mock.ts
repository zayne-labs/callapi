/**
 * Simple fetch mocking utilities
 * Provides easy-to-use functions for common mocking scenarios
 */

import { expect } from "vitest";
import { mockFetch } from "./setup";

/**
 * Helper to get standard HTTP status text
 */
export function getStatusText(status: number): string {
	const statusTexts: Record<number, string> = {
		200: "OK",
		201: "Created",
		204: "No Content",
		400: "Bad Request",
		401: "Unauthorized",
		403: "Forbidden",
		404: "Not Found",
		422: "Unprocessable Entity",
		500: "Internal Server Error",
		502: "Bad Gateway",
		503: "Service Unavailable",
	};

	return statusTexts[status] ?? "Unknown";
}

/**
 * Creates a simple mock Response object
 */
export function createMockResponse(
	data: unknown,
	status = 200,
	headers: Record<string, string> = {}
): Response {
	return new Response(JSON.stringify(data), {
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
		status,
		statusText: getStatusText(status),
	});
}

/**
 * Creates a mock error response
 */
export function createMockErrorResponse(
	errorData: unknown,
	status = 400,
	headers: Record<string, string> = {}
): Response {
	return createMockResponse(errorData, status, headers);
}

/**
 * Mock fetch to resolve with a successful response
 */
export function mockFetchSuccess(data: unknown, status = 200, headers: Record<string, string> = {}) {
	const response = createMockResponse(data, status, headers);
	mockFetch.mockResolvedValueOnce(response);
	return response;
}

/**
 * Mock fetch to resolve with an error response
 */
export function mockFetchError(errorData: unknown, status = 400, headers: Record<string, string> = {}) {
	const response = createMockErrorResponse(errorData, status, headers);
	mockFetch.mockResolvedValueOnce(response);
	return response;
}

/**
 * Mock fetch to reject with a network error
 */
export function mockFetchNetworkError(message = "Network error") {
	const error = new Error(message);
	error.name = "TypeError";
	mockFetch.mockRejectedValueOnce(error);
	return error;
}

/**
 * Mock multiple fetch calls in sequence
 */
export function mockFetchSequence(
	responses: Array<{
		data?: unknown;
		error?: Error;
		headers?: Record<string, string>;
		status?: number;
	}>
) {
	responses.forEach(({ data, error, headers = {}, status = 200 }) => {
		if (error) {
			mockFetch.mockRejectedValueOnce(error);
		} else {
			mockFetch.mockResolvedValueOnce(createMockResponse(data, status, headers));
		}
	});
}

export function getFetchCallCount() {
	return mockFetch.mock.calls.length;
}

/**
 * Reset fetch mock
 */
export function resetFetchMock() {
	mockFetch.mockReset();
}

/**
 * Disposable fetch mock setup
 */
export function createFetchMock() {
	globalThis.fetch = mockFetch;

	return Object.assign(mockFetch, {
		[Symbol.dispose]: () => {
			resetFetchMock();
		},
	});
}

/**
 * Verify fetch was called a specific number of times
 */
export function expectFetchCallCount(count: number) {
	expect(mockFetch).toHaveBeenCalledTimes(count);
}
