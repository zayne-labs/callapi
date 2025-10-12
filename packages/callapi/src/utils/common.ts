import { getAuthHeader } from "../auth";
import { fetchSpecificKeys } from "../constants/common";
import { extraOptionDefaults, requestOptionDefaults } from "../constants/default-options";
import type { Middlewares } from "../middlewares";
import type { BaseCallApiExtraOptions, CallApiExtraOptions, CallApiRequestOptions } from "../types/common";
import { extractMethodFromURL } from "../url";
import {
	isArray,
	isFunction,
	isPlainObject,
	isQueryString,
	isSerializable,
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

	return updatedObject as Omit<TObject, TOmitArray[number]>;
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

type ToQueryStringFn = {
	(params: CallApiExtraOptions["query"]): string | null;
	(params: Required<CallApiExtraOptions>["query"]): string;
};

export const toQueryString: ToQueryStringFn = (params) => {
	if (!params) {
		console.error("toQueryString:", "No query params provided!");

		return null as never;
	}

	return new URLSearchParams(params as Record<string, string>).toString();
};

export const objectifyHeaders = (headers: CallApiRequestOptions["headers"]) => {
	if (!headers || isPlainObject(headers)) {
		return headers;
	}

	return Object.fromEntries(headers);
};

export type GetHeadersOptions = {
	auth: CallApiExtraOptions["auth"];
	body: CallApiRequestOptions["body"];
	headers: CallApiRequestOptions["headers"];
};

export const getHeaders = async (options: GetHeadersOptions) => {
	const { auth, body, headers } = options;

	// == Return early if any of the following conditions are not met (so that native fetch would auto set the correct headers):
	const shouldResolveHeaders = Boolean(headers) || Boolean(body) || Boolean(auth);

	if (!shouldResolveHeaders) return;

	const headersObject: Record<string, string | undefined> = {
		...(await getAuthHeader(auth)),
		...objectifyHeaders(headers),
	};

	if (isQueryString(body)) {
		headersObject["Content-Type"] = "application/x-www-form-urlencoded";

		return headersObject;
	}

	if (isSerializable(body) || isValidJsonString(body)) {
		headersObject["Content-Type"] = "application/json";
		headersObject.Accept = "application/json";
	}

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

export type GetBodyOptions = {
	body: CallApiRequestOptions["body"];
	bodySerializer: CallApiExtraOptions["bodySerializer"];
};

export const getBody = (options: GetBodyOptions) => {
	const { body, bodySerializer } = options;

	if (isSerializable(body)) {
		const selectedBodySerializer = bodySerializer ?? extraOptionDefaults.bodySerializer;

		return selectedBodySerializer(body);
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

export const getFetchImpl = (
	customFetchImpl: CallApiExtraOptions["customFetchImpl"],
	fetchMiddleware: Middlewares["fetchMiddleware"]
) => {
	const initFetchApi = getInitFetchImpl(customFetchImpl);

	const fetchImpl = fetchMiddleware ? fetchMiddleware(initFetchApi) : initFetchApi;

	return fetchImpl;
};

const PromiseWithResolvers = () => {
	let reject!: (reason?: unknown) => void;
	let resolve!: (value: unknown) => void;

	const promise = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, reject, resolve };
};

export const waitFor = (delay: number) => {
	if (delay === 0) return;

	const { promise, resolve } = PromiseWithResolvers();

	setTimeout(resolve, delay);

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

export const createTimeoutSignal = (milliseconds: number) => {
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
