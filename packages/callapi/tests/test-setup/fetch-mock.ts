/**
 * Simple fetch mocking utilities
 * Provides easy-to-use functions for common mocking scenarios
 */

import { expect } from "vitest";
import { mockFetch } from "./setup";

/**
 * Helper to get standard HTTP status text
 */
export const getStatusText = (status: number): string => {
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
};

/**
 * Creates a simple mock Response object
 */
export const createMockResponse = (
	data: unknown,
	status = 200,
	headers: Record<string, string> = {}
): Response => {
	return new Response(JSON.stringify(data), {
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
		status,
		statusText: getStatusText(status),
	});
};

/**
 * Creates a mock error response
 */
export const createMockErrorResponse = (
	errorData: unknown,
	status = 400,
	headers: Record<string, string> = {}
): Response => {
	return createMockResponse(errorData, status, headers);
};

/**
 * Mock fetch to resolve with a successful response
 */
export const mockFetchSuccess = (data: unknown, status = 200, headers: Record<string, string> = {}) => {
	const response = createMockResponse(data, status, headers);
	mockFetch.mockResolvedValueOnce(response);
	return response;
};

/**
 * Mock fetch to resolve with an error response
 */
export const mockFetchError = (errorData: unknown, status = 400, headers: Record<string, string> = {}) => {
	const response = createMockErrorResponse(errorData, status, headers);
	mockFetch.mockResolvedValueOnce(response);
	return response;
};

/**
 * Mock fetch to reject with a network error
 */
export const mockFetchNetworkError = (message = "Network error") => {
	const error = new Error(message);
	error.name = "TypeError";
	mockFetch.mockRejectedValueOnce(error);
	return error;
};

/**
 * Mock multiple fetch calls in sequence
 */
export const mockFetchSequence = (
	responses: Array<{
		data?: unknown;
		error?: Error;
		headers?: Record<string, string>;
		status?: number;
	}>
) => {
	for (const response of responses) {
		const { data, error, headers = {}, status = 200 } = response;

		if (error) {
			mockFetch.mockRejectedValueOnce(error);
		} else {
			mockFetch.mockResolvedValueOnce(createMockResponse(data, status, headers));
		}
	}
};

export const getFetchCallCount = () => {
	return mockFetch.mock.calls.length;
};

/**
 * Reset fetch mock
 */
export const resetFetchMock = () => {
	mockFetch.mockReset();
};

/**
 * Disposable fetch mock setup
 */
export const createFetchMock = () => {
	globalThis.fetch = mockFetch;

	return Object.assign(mockFetch, {
		[Symbol.dispose]: () => {
			resetFetchMock();
		},
	});
};

/**
 * Verify fetch was called a specific number of times
 */
export const expectFetchCallCount = (count: number) => {
	expect(mockFetch).toHaveBeenCalledTimes(count);
};

/**
 * Helper to extract headers from mock fetch call
 */
export const getHeadersFromCall = (mockFetch: any, callIndex = 0) => {
	const request = mockFetch.mock.calls[callIndex]?.[1] as Request;
	return request.headers;
};
