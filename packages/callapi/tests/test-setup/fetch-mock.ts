/**
 * Simple fetch mocking utilities
 * Provides easy-to-use functions for common mocking scenarios
 */

import { expect } from "vitest";
import type { CallApiRequestOptionsForHooks } from "../../src";
import { mockFetch } from "./setup";

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

export const createMockResponse = (
	data: unknown,
	status = 200,
	headers: Record<string, string> = {}
): Response => {
	return Response.json(data, {
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
		status,
		statusText: getStatusText(status),
	});
};

export const createMockErrorResponse = (
	errorData: unknown,
	status = 400,
	headers: Record<string, string> = {}
): Response => {
	return createMockResponse(errorData, status, headers);
};

export const mockFetchSuccess = (data: unknown, status = 200, headers: Record<string, string> = {}) => {
	const response = createMockResponse(data, status, headers);
	mockFetch.mockResolvedValueOnce(response);
	return response;
};

export const mockFetchError = (errorData: unknown, status = 400, headers: Record<string, string> = {}) => {
	const response = createMockErrorResponse(errorData, status, headers);
	mockFetch.mockResolvedValueOnce(response);
	return response;
};

export const mockFetchNetworkError = (message = "Network error") => {
	const error = new Error(message);
	error.name = "TypeError";
	mockFetch.mockRejectedValueOnce(error);
	return error;
};

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

export const resetFetchMock = () => {
	mockFetch.mockReset();
};

export const createFetchMock = () => {
	globalThis.fetch = mockFetch;

	return Object.assign(mockFetch, {
		[Symbol.dispose]: () => {
			resetFetchMock();
		},
	});
};

export const expectFetchCallCount = (count: number) => {
	expect(mockFetch).toHaveBeenCalledTimes(count);
};

export const getHeadersFromCall = (fetch: typeof mockFetch, callIndex = 0) => {
	const request = fetch.mock.calls[callIndex]?.[1] as CallApiRequestOptionsForHooks;
	return request.headers;
};
