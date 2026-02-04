/**
 * Common assertion helpers and test utilities
 * Centralized from helpers.ts and test-helpers.ts
 */

import { expect } from "vitest";
import type {
	CallApiResultErrorVariant,
	CallApiResultSuccessOrErrorVariant,
	CallApiResultSuccessVariant,
} from "../../src/result";
import { HTTPError, ValidationError } from "../../src/utils/external/error";

/**
 * Assertion helper to check if result is successful (for "all" result mode)
 */
export function expectSuccessResult<TData, TError>(
	result: CallApiResultSuccessOrErrorVariant<TData, TError>
): asserts result is CallApiResultSuccessVariant<TData> {
	expect(result.error).toBeNull();
	expect(result.data).toBeDefined();
	expect(result.response).toBeDefined();
}

/**
 * Assertion helper to check if result is error (for "all" result mode)
 */
export function expectErrorResult<TData, TError>(
	result: CallApiResultSuccessOrErrorVariant<TData, TError>
): asserts result is CallApiResultErrorVariant<TError> {
	expect(result.data).toBeNull();
	expect(result.error).toBeDefined();
}

/**
 * Assertion helper for HTTP errors
 */
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

/**
 * Assertion helper for validation errors
 */
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
