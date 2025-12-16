import type { CallApiRequestOptions } from "../../types/common";
import { isArray, isBlob, isObject, isString } from "../guards";

const toStringOrStringify = (value: unknown): string => {
	return isString(value) ? value : JSON.stringify(value);
};

export const toQueryString = (data: NonNullable<CallApiRequestOptions["body"]>) => {
	const queryString = new URLSearchParams();

	for (const [key, value] of Object.entries(data)) {
		if (value == null) continue;

		if (isArray(value)) {
			// eslint-disable-next-line max-depth -- Allow
			for (const innerValue of value) {
				queryString.append(key, toStringOrStringify(innerValue));
			}
			continue;
		}

		queryString.set(key, toStringOrStringify(value));
	}

	return queryString.toString();
};

const toBlobOrString = (value: unknown): string | Blob => {
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
export const toFormData = (data: NonNullable<CallApiRequestOptions["body"]>) => {
	const formData = new FormData();

	for (const [key, value] of Object.entries(data)) {
		if (isArray(value)) {
			// eslint-disable-next-line max-depth -- Allow for now
			for (const innerValue of value) {
				formData.append(key, toBlobOrString(innerValue));
			}
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
