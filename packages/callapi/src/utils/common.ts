import { getAuthHeader } from "../auth";
import { fetchSpecificKeys } from "../constants/common";
import { extraOptionDefaults, requestOptionDefaults } from "../constants/defaults";
import type { RequestContext } from "../hooks";
import type { Middlewares } from "../middlewares";
import type { BaseCallApiExtraOptions, CallApiExtraOptions, CallApiRequestOptions } from "../types/common";
import type { InferHeadersOption } from "../types/conditional-types";
import type { DistributiveOmit } from "../types/type-helpers";
import { extractMethodFromURL } from "../url";
import type { CallApiSchema } from "../validation";
import { toQueryString } from "./external";
import {
	isArray,
	isFunction,
	isPlainObject,
	isQueryString,
	isSerializableObject,
	isValidJsonString,
} from "./guards";
import { createCombinedSignalPolyfill, createTimeoutSignalPolyfill } from "./polyfills";

export const omitKeys = <
	TObject extends Record<string, unknown>,
	const TOmitArray extends Array<keyof TObject> | ReadonlyArray<keyof TObject>,
>(
	initialObject: TObject,
	keysToOmit: TOmitArray
) => {
	const updatedObject = {} as Record<string, unknown>;

	const keysToOmitSet = new Set(keysToOmit);

	for (const [key, value] of Object.entries(initialObject)) {
		if (!keysToOmitSet.has(key)) {
			updatedObject[key] = value;
		}
	}

	return updatedObject as DistributiveOmit<TObject, TOmitArray[number]>;
};

export const pickKeys = <
	TObject extends Record<string, unknown>,
	const TPickArray extends Array<keyof TObject> | ReadonlyArray<keyof TObject>,
>(
	initialObject: TObject,
	keysToPick: TPickArray
) => {
	const updatedObject = {} as Record<string, unknown>;

	const keysToPickSet = new Set(keysToPick);

	for (const [key, value] of Object.entries(initialObject)) {
		if (keysToPickSet.has(key)) {
			updatedObject[key] = value;
		}
	}

	return updatedObject as Pick<TObject, TPickArray[number]>;
};

// eslint-disable-next-line ts-eslint/no-explicit-any -- Any is required here so that one can pass custom function type without type errors
export const splitBaseConfig = (baseConfig: Record<string, any>) =>
	[
		pickKeys(baseConfig, fetchSpecificKeys) as CallApiRequestOptions,
		omitKeys(baseConfig, fetchSpecificKeys) as BaseCallApiExtraOptions,
	] as const;

// eslint-disable-next-line ts-eslint/no-explicit-any -- Any is required here so that one can pass custom function type without type errors
export const splitConfig = (config: Record<string, any>) =>
	[
		pickKeys(config, fetchSpecificKeys) as CallApiRequestOptions,
		omitKeys(config, fetchSpecificKeys) as CallApiExtraOptions,
	] as const;

export const objectifyHeaders = (headers: CallApiRequestOptions["headers"]) => {
	if (!headers) {
		return {};
	}

	if (isPlainObject(headers)) {
		return headers as Record<string, string>;
	}

	return Object.fromEntries(headers);
};

export type GetResolvedHeadersOptions = {
	baseHeaders: CallApiRequestOptions["headers"];
	headers: InferHeadersOption<CallApiSchema>["headers"];
};

export const getResolvedHeaders = (options: GetResolvedHeadersOptions) => {
	const { baseHeaders, headers } = options;

	const resolvedHeaders =
		isFunction(headers) ?
			headers({ baseHeaders: objectifyHeaders(baseHeaders) })
		:	(headers ?? baseHeaders);

	return objectifyHeaders(resolvedHeaders);
};

const detectContentTypeHeader = (body: CallApiRequestOptions["body"]) => {
	if (isQueryString(body)) {
		return { "Content-Type": "application/x-www-form-urlencoded" };
	}

	if (isSerializableObject(body) || isValidJsonString(body)) {
		return { Accept: "application/json", "Content-Type": "application/json" };
	}

	return null;
};

export type GetHeadersOptions = {
	auth: CallApiExtraOptions["auth"];
	body: CallApiRequestOptions["body"];
	resolvedHeaders: CallApiRequestOptions["headers"];
};

export const getHeaders = async (options: GetHeadersOptions) => {
	const { auth, body, resolvedHeaders } = options;

	const authHeaderObject = await getAuthHeader(auth);

	const resolvedHeadersObject = objectifyHeaders(resolvedHeaders);

	const hasExistingContentType =
		Object.hasOwn(resolvedHeadersObject, "Content-Type")
		|| Object.hasOwn(resolvedHeadersObject, "content-type");

	if (!hasExistingContentType) {
		const contentTypeHeader = detectContentTypeHeader(body);
		contentTypeHeader && Object.assign(resolvedHeadersObject, contentTypeHeader);
	}

	const headersObject: Record<string, string> = {
		...authHeaderObject,
		...resolvedHeadersObject,
	};

	return headersObject;
};

export type GetMethodContext = {
	/** The URL string that may contain method modifiers like "@get/" or "@post/" */
	initURL: string | undefined;
	/** Explicitly specified HTTP method */
	method: CallApiRequestOptions["method"];
};

export const getMethod = (ctx: GetMethodContext) => {
	const { initURL, method } = ctx;

	return (
		method?.toUpperCase() ?? extractMethodFromURL(initURL)?.toUpperCase() ?? requestOptionDefaults.method
	);
};

export type GetBodyOptions = Pick<GetHeadersOptions, "body" | "resolvedHeaders"> & {
	bodySerializer: CallApiExtraOptions["bodySerializer"];
};

export const getBody = (options: GetBodyOptions) => {
	const { body, bodySerializer, resolvedHeaders } = options;

	const headers = new Headers(resolvedHeaders as Record<string, string>);

	const existingContentType = headers.get("content-type");

	if (!existingContentType && isSerializableObject(body)) {
		const selectedBodySerializer = bodySerializer ?? extraOptionDefaults.bodySerializer;

		return selectedBodySerializer(body);
	}

	if (existingContentType === "application/x-www-form-urlencoded" && isSerializableObject(body)) {
		return toQueryString(body as Record<string, string>);
	}

	return body;
};

export const getInitFetchImpl = (customFetchImpl: CallApiExtraOptions["customFetchImpl"]) => {
	if (customFetchImpl) {
		return customFetchImpl;
	}

	if (typeof globalThis !== "undefined" && isFunction(globalThis.fetch)) {
		return globalThis.fetch;
	}

	throw new Error("No fetch implementation found");
};

export const getFetchImpl = (context: {
	customFetchImpl: CallApiExtraOptions["customFetchImpl"];
	fetchMiddleware: Middlewares["fetchMiddleware"];
	requestContext: RequestContext;
}) => {
	const { customFetchImpl, fetchMiddleware, requestContext } = context;

	const initFetchImpl = getInitFetchImpl(customFetchImpl);

	const resolvedFetchImpl =
		fetchMiddleware ? fetchMiddleware({ ...requestContext, fetchImpl: initFetchImpl }) : initFetchImpl;

	return resolvedFetchImpl;
};

export const waitFor = (delay: number) => {
	if (delay === 0) return;

	const promise = new Promise((resolve) => setTimeout(resolve, delay));

	return promise;
};

export const createCombinedSignal = (...signals: Array<AbortSignal | null | undefined>) => {
	const cleanedSignals = signals.filter((signal) => signal != null);

	if (!("any" in AbortSignal)) {
		return createCombinedSignalPolyfill(cleanedSignals);
	}

	const combinedSignal = AbortSignal.any(cleanedSignals);

	return combinedSignal;
};

export const createTimeoutSignal = (milliseconds: number | null | undefined) => {
	if (milliseconds == null) {
		return null;
	}

	if (!("timeout" in AbortSignal)) {
		return createTimeoutSignalPolyfill(milliseconds);
	}

	return AbortSignal.timeout(milliseconds);
};

export const deterministicHashFn = (value: unknown): string => {
	return JSON.stringify(value, (_, val: unknown) => {
		if (!isPlainObject(val)) {
			return val;
		}

		const sortedKeys = Object.keys(val).toSorted();

		const result: Record<string, unknown> = {};

		for (const key of sortedKeys) {
			result[key] = val[key];
		}

		return result;
	});
};

export const toArray = (value: unknown) => (isArray(value) ? value : [value]);
