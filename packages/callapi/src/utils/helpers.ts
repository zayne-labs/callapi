import type { CallApiExtraOptions } from "../types";
import { isArray, isBlob, isObject } from "./guards";

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

type AllowedPrimitives = boolean | number | string | Blob;

type AllowedValues = AllowedPrimitives | AllowedPrimitives[] | Record<string, AllowedPrimitives>;

const toBlobOrString = (value: AllowedPrimitives): string | Blob => {
	return isBlob(value) ? value : String(value);
};

type ToFormDataFn = {
	(data: Record<string, AllowedValues>): FormData;

	<TData extends Record<string, AllowedValues>>(data: TData, options: { returnType: "inputType" }): TData;
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
 *
 * // Type-preserving usage with Zod
 * const schema = z.object({ name: z.string(), file: z.instanceof(Blob) });
 * const data = schema.parse({ name: "John", file: blob });
 * const typedFormData = toFormData(data, { returnType: "inputType" });
 * // Type is { name: string; file: Blob }, runtime is FormData
 * ```
 */
export const toFormData: ToFormDataFn = (data: Record<string, AllowedValues>) => {
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
