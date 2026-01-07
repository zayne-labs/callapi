/**
 * Simple fetch mocking utilities
 * Provides easy-to-use functions for common mocking scenarios
 */

import { expect } from "vitest";
import { mockFetch } from "./setup";

// Mock fetch to resolve with a successful response
export function mockFetchSuccess(data: unknown, status = 200, headers: Record<string, string> = {}) {
	const response = new Response(JSON.stringify(data), {
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
		status,
	});

	mockFetch.mockResolvedValueOnce(response);
	return response;
}

// Mock fetch to resolve with an error response
export function mockFetchError(errorData: unknown, status = 400, headers: Record<string, string> = {}) {
	const response = new Response(JSON.stringify(errorData), {
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
		status,
	});

	mockFetch.mockResolvedValueOnce(response);
	return response;
}

// Mock fetch to reject with a network error
export function mockFetchNetworkError(message = "Network error") {
	const error = new Error(message);
	error.name = "TypeError";
	mockFetch.mockRejectedValueOnce(error);
	return error;
}

// Mock multiple fetch calls in sequence
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
			const response = new Response(JSON.stringify(data), {
				headers: {
					"Content-Type": "application/json",
					...headers,
				},
				status,
			});
			mockFetch.mockResolvedValueOnce(response);
		}
	});
}

export function getFetchCallCount() {
	return mockFetch.mock.calls.length;
}

// Reset fetch mock
export function resetFetchMock() {
	mockFetch.mockReset();
}

// Verify fetch was called a specific number of times
export function expectFetchCallCount(count: number) {
	expect(mockFetch).toHaveBeenCalledTimes(count);
}
