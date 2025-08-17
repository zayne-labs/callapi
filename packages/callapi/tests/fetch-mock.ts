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

// Mock fetch to reject with a timeout error
export function mockFetchTimeout() {
	const error = new Error("The operation was aborted");
	error.name = "AbortError";
	mockFetch.mockRejectedValueOnce(error);
	return error;
}

// Mock fetch with a custom implementation
export function mockFetchCustom(implementation: (...args: unknown[]) => unknown) {
	mockFetch.mockImplementationOnce(implementation);
}

// Mock fetch to resolve after a delay
export function mockFetchWithDelay(data: unknown, delay = 100, status = 200) {
	mockFetch.mockImplementationOnce(async () => {
		await new Promise((resolve) => setTimeout(resolve, delay));
		return new Response(JSON.stringify(data), { status });
	});
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

// Get information about fetch calls
export function getFetchCalls() {
	return mockFetch.mock.calls;
}

export function getLastFetchCall() {
	const calls = mockFetch.mock.calls;
	return calls.at(-1);
}

export function getFetchCallCount() {
	return mockFetch.mock.calls.length;
}

// Reset fetch mock
export function resetFetchMock() {
	mockFetch.mockReset();
}

// Verify fetch was called with specific arguments
export function expectFetchCalledWith(url: string, options?: RequestInit) {
	if (options) {
		expect(mockFetch).toHaveBeenCalledWith(url, expect.objectContaining(options));
	} else {
		expect(mockFetch).toHaveBeenCalledWith(url);
	}
}

// Verify fetch was called a specific number of times
export function expectFetchCallCount(count: number) {
	expect(mockFetch).toHaveBeenCalledTimes(count);
}
