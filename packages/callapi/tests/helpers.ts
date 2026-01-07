/**
 * Simple test helper functions and assertion utilities
 */

import { expect } from "vitest";
import type {
	CallApiResultErrorVariant,
	CallApiResultSuccessOrErrorVariant,
	CallApiResultSuccessVariant,
} from "../src/result";
import { HTTPError, ValidationError } from "../src/utils/external/error";

// Simple mock response creator
export function createMockResponse(
	data: unknown,
	status = 200,
	headers: Record<string, string> = {}
): Response {
	const defaultHeaders = {
		"Content-Type": "application/json",
		...headers,
	};

	return new Response(JSON.stringify(data), {
		headers: defaultHeaders,
		status,
		statusText: getStatusText(status),
	});
}

// Helper to get status text from status code
function getStatusText(status: number): string {
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

// Helper to create mock error responses
export function createMockErrorResponse(
	errorData: unknown,
	status = 400,
	headers: Record<string, string> = {}
): Response {
	return createMockResponse(errorData, status, headers);
}

// Helper to mock network errors
export function mockNetworkError(message = "Network error"): Error {
	return new Error(message);
}

// Helper to mock timeout errors
export function mockTimeoutError(): Error {
	const error = new Error("The operation was aborted");
	error.name = "AbortError";
	return error;
}

// Simple assertion helpers
export function expectHTTPError(
	error: unknown,
	expectedStatus?: number,
	expectedMessage?: string
): asserts error is HTTPError {
	expect(error).toBeInstanceOf(HTTPError);

	const httpError = error as HTTPError;

	if (expectedStatus !== undefined) {
		expect(httpError.response.status).toBe(expectedStatus);
	}

	if (expectedMessage !== undefined) {
		expect(httpError.message).toContain(expectedMessage);
	}
}

export function expectValidationError(
	error: unknown,
	expectedMessage?: string
): asserts error is ValidationError {
	expect(error).toBeInstanceOf(ValidationError);

	const validationError = error as ValidationError;

	if (expectedMessage !== undefined) {
		expect(validationError.message).toContain(expectedMessage);
	}
}

// Helper to check if result is successful (for "all" result mode)
export function expectSuccessResult<TData, TError>(
	result: CallApiResultSuccessOrErrorVariant<TData, TError>
): asserts result is CallApiResultSuccessVariant<TData> {
	expect(result.error).toBeNull();
	expect(result.data).toBeDefined();
	expect(result.response).toBeDefined();
}

// Helper to check if result is error (for "all" result mode)
export function expectErrorResult<TData, TError>(
	result: CallApiResultSuccessOrErrorVariant<TData, TError>
): asserts result is CallApiResultErrorVariant<TError> {
	expect(result.data).toBeNull();
	expect(result.error).toBeDefined();
}

// Helper to wait for a specified time (useful for testing delays)
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to create a promise that can be resolved/rejected externally
export function createDeferredPromise<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;

	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, reject, resolve };
}

// Helper to track function calls
export function createCallTracker() {
	const calls: Array<{ args: unknown[]; timestamp: number }> = [];

	const track = (...args: unknown[]) => {
		calls.push({ args, timestamp: Date.now() });
	};

	const getCalls = () => calls;
	const getCallCount = () => calls.length;
	const getLastCall = () => calls.at(-1);
	const reset = () => (calls.length = 0);

	return { getCallCount, getCalls, getLastCall, reset, track };
}
