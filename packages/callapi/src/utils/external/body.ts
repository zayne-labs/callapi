import type { CallApiExtraOptions } from "../../types/common";
import { isArray, isBlob, isObject } from "../guards";

type ToQueryStringFn = {
	(query: CallApiExtraOptions["query"]): string | null;
	(query: Required<CallApiExtraOptions>["query"]): string;
};

export const toQueryString: ToQueryStringFn = (query) => {
	if (!query) {
		console.error("toQueryString:", "No query params provided!");

		return null as never;
	}

	return new URLSearchParams(query as Record<string, string>).toString();
};

type AllowedPrimitives = boolean | number | string | Blob | null | undefined;

type AllowedValues = AllowedPrimitives | AllowedPrimitives[] | Record<string, AllowedPrimitives>;

const toBlobOrString = (value: AllowedPrimitives): string | Blob => {
	return isBlob(value) ? value : String(value);
};

/**
 * @description Converts a plain object to FormData.
 *
 * Handles various data types:
 * - **Primitives** (string, number, boolean): Converted to strings
 * - **Blobs/Files**: Added directly to FormData
 * - **Arrays**: Each item is appended (allows multiple values for same key)
 * - **Objects**: JSON stringified before adding to FormData
 *
 * @example
 * ```ts
 * // Basic usage
 * const formData = toFormData({
 *   name: "John",
 *   age: 30,
 *   active: true
 * });
 *
 * // With arrays
 * const formData = toFormData({
 *   tags: ["javascript", "typescript"],
 *   name: "John"
 * });
 *
 * // With files
 * const formData = toFormData({
 *   avatar: fileBlob,
 *   name: "John"
 * });
 *
 * // With nested objects (one level only)
 * const formData = toFormData({
 *   user: { name: "John", age: 30 },
 *   settings: { theme: "dark" }
 * });
 */
export const toFormData = (data: Record<string, AllowedValues>) => {
	const formData = new FormData();

	for (const [key, value] of Object.entries(data)) {
		if (isArray(value)) {
			value.forEach((innerValue) => formData.append(key, toBlobOrString(innerValue)));
			continue;
		}

		if (isObject(value) && !isBlob(value)) {
			formData.set(key, JSON.stringify(value));
			continue;
		}

		formData.set(key, toBlobOrString(value));
	}

	return formData;
};
