import { HTTPError, ValidationError } from "../error";
import type {
	CallApiResultErrorVariant,
	PossibleHTTPError,
	PossibleJavaScriptError,
	PossibleValidationError,
} from "../result";
import type { AnyFunction } from "../types/type-helpers";

export const isHTTPError = <TErrorData>(
	error: CallApiResultErrorVariant<TErrorData>["error"] | null
): error is PossibleHTTPError<TErrorData> => {
	return isObject(error) && error.name === "HTTPError";
};

export const isHTTPErrorInstance = <TErrorData>(error: unknown) => {
	return HTTPError.isError<TErrorData>(error);
};

export const isValidationError = (
	error: CallApiResultErrorVariant<unknown>["error"] | null
): error is PossibleValidationError => {
	return isObject(error) && error.name === "ValidationError";
};

export const isValidationErrorInstance = (error: unknown): error is ValidationError => {
	return ValidationError.isError(error);
};

export const isJavascriptError = (
	error: CallApiResultErrorVariant<unknown>["error"] | null
): error is PossibleJavaScriptError => {
	return isObject(error) && !isHTTPError(error) && !isValidationError(error);
};

export const isArray = <TArrayItem>(value: unknown): value is TArrayItem[] => Array.isArray(value);

export const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

export const isObject = <TObject extends object>(value: unknown): value is TObject => {
	return typeof value === "object" && value !== null;
};

const hasObjectPrototype = (value: unknown) => {
	return Object.prototype.toString.call(value) === "[object Object]";
};

/**
 * @description Copied from TanStack Query's isPlainObject
 * @see https://github.com/TanStack/query/blob/main/packages/query-core/src/utils.ts#L321
 */
export const isPlainObject = <TPlainObject extends Record<string, unknown>>(
	value: unknown
): value is TPlainObject => {
	if (!hasObjectPrototype(value)) {
		return false;
	}

	// If has no constructor
	const constructor = (value as object | undefined)?.constructor;
	if (constructor === undefined) {
		return true;
	}

	// If has modified prototype
	const prototype = constructor.prototype as object;
	if (!hasObjectPrototype(prototype)) {
		return false;
	}

	// If constructor does not have an Object-specific method
	if (!Object.hasOwn(prototype, "isPrototypeOf")) {
		return false;
	}

	// Handles Objects created by Object.create(<arbitrary prototype>)
	if (Object.getPrototypeOf(value) !== Object.prototype) {
		return false;
	}

	// It's probably a plain object at this point
	return true;
};

export const isValidJsonString = (value: unknown): value is string => {
	if (!isString(value)) {
		return false;
	}

	try {
		JSON.parse(value);
		return true;
	} catch {
		return false;
	}
};

export const isSerializable = (value: unknown) => {
	return (
		isPlainObject(value)
		|| isArray(value)
		|| typeof (value as { toJSON: unknown } | undefined)?.toJSON === "function"
	);
};

export const isFunction = <TFunction extends AnyFunction>(value: unknown): value is TFunction =>
	typeof value === "function";

export const isQueryString = (value: unknown): value is string => isString(value) && value.includes("=");

export const isString = (value: unknown) => typeof value === "string";

export const isPromise = (value: unknown) => value instanceof Promise;

export const isReadableStream = (value: unknown): value is ReadableStream<unknown> => {
	return value instanceof ReadableStream;
};

// https://github.com/unjs/ofetch/blob/main/src/utils.ts
export const isJSONSerializable = (value: unknown) => {
	if (value === undefined) {
		return false;
	}
	const t = typeof value;
	// eslint-disable-next-line ts-eslint/no-unnecessary-condition -- No time to make this more type-safe
	if (t === "string" || t === "number" || t === "boolean" || t === null) {
		return true;
	}
	if (t !== "object") {
		return false;
	}
	if (isArray(value)) {
		return true;
	}
	if ((value as Buffer | null)?.buffer) {
		return false;
	}

	return (
		(value?.constructor && value.constructor.name === "Object")
		// eslint-disable-next-line ts-eslint/prefer-nullish-coalescing -- Nullish coalescing makes no sense in this boolean context
		|| typeof (value as { toJSON: () => unknown } | null)?.toJSON === "function"
	);
};
