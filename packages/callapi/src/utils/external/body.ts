import type { CallApiRequestOptions } from "../../types/common";
import { getValidatedValue, type CallApiSchemaType, type InferSchemaOutput } from "../../validation";
import { isArray, isBlob, isObject, isString } from "../guards";
import { ValidationError } from "./error";

const toStringOrStringify = (value: unknown): string => {
	return isString(value) ? value : JSON.stringify(value);
};

type BodyType = NonNullable<CallApiRequestOptions["body"]>;

export const toSearchParams = <TSchema extends CallApiSchemaType<BodyType>>(
	data: InferSchemaOutput<TSchema>,
	schema?: TSchema
) => {
	const result = getValidatedValue(data, schema, { variant: "sync" });

	if (result.issues) {
		throw new ValidationError({
			issueCause: "toQueryString",
			issues: result.issues,
			response: null,
		});
	}

	const searchParams = new URLSearchParams();

	for (const [key, value] of Object.entries(result.value as Record<string, unknown>)) {
		if (value == null) continue;

		if (isArray(value)) {
			// eslint-disable-next-line max-depth -- Allow
			for (const innerValue of value) {
				searchParams.append(key, toStringOrStringify(innerValue));
			}
			continue;
		}

		searchParams.set(key, toStringOrStringify(value));
	}

	return searchParams;
};

export const toQueryString = <TSchema extends CallApiSchemaType<BodyType>>(
	...parameters: Parameters<typeof toSearchParams<TSchema>>
) => {
	const searchParams = toSearchParams(...parameters);

	return searchParams.toString();
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
export const toFormData = <TSchema extends CallApiSchemaType<BodyType>>(
	data: InferSchemaOutput<TSchema>,
	schema?: TSchema
) => {
	const formData = new FormData();

	const result = getValidatedValue(data, schema, { variant: "sync" });

	if (result.issues) {
		throw new ValidationError({
			issueCause: "toFormData",
			issues: result.issues,
			response: null,
		});
	}

	for (const [key, value] of Object.entries(result.value as Record<string, unknown>)) {
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
