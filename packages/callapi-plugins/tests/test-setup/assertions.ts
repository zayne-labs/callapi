import type {
	CallApiResultErrorVariant,
	CallApiResultSuccessOrErrorVariant,
	CallApiResultSuccessVariant,
} from "@zayne-labs/callapi";
import { expect } from "vitest";

/**
 * @description Assertion helper to check if result is successful (for "all" result mode)
 */
export function expectSuccessResult<TData, TError>(
	result: CallApiResultSuccessOrErrorVariant<TData, TError>
): asserts result is CallApiResultSuccessVariant<TData> {
	expect(result.error).toBeNull();
	expect(result.data).toBeDefined();
	expect(result.response).toBeDefined();
}

/**
 * @description Assertion helper to check if result is error (for "all" result mode)
 */
export function expectErrorResult<TData, TError>(
	result: CallApiResultSuccessOrErrorVariant<TData, TError>
): asserts result is CallApiResultErrorVariant<TError> {
	expect(result.data).toBeNull();
	expect(result.error).toBeDefined();
}
