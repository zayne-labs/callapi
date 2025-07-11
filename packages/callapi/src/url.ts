import { requestOptionDefaults } from "./constants/default-options";
import type { CallApiExtraOptions, CallApiRequestOptions } from "./types/common";
import type { UnmaskType } from "./types/type-helpers";
import { toQueryString } from "./utils";
import { isArray } from "./utils/guards";
import { type CallApiSchemaConfig, routeKeyMethods } from "./validation";

const slash = "/";
const column = ":";
const mergeUrlWithParams = (url: string, params: CallApiExtraOptions["params"]) => {
	if (!params) {
		return url;
	}

	let newUrl = url;

	if (isArray(params)) {
		const matchedParamArray = newUrl.split(slash).filter((param) => param.startsWith(column));

		for (const [index, matchedParam] of matchedParamArray.entries()) {
			const realParam = params[index] as string;
			newUrl = newUrl.replace(matchedParam, realParam);
		}

		return newUrl;
	}

	for (const [key, value] of Object.entries(params)) {
		newUrl = newUrl.replace(`${column}${key}`, String(value));
	}

	return newUrl;
};

const questionMark = "?";
const ampersand = "&";
const mergeUrlWithQuery = (url: string, query: CallApiExtraOptions["query"]): string => {
	if (!query) {
		return url;
	}

	const queryString = toQueryString(query);

	if (queryString?.length === 0) {
		return url;
	}

	if (url.endsWith(questionMark)) {
		return `${url}${queryString}`;
	}

	if (url.includes(questionMark)) {
		return `${url}${ampersand}${queryString}`;
	}

	return `${url}${questionMark}${queryString}`;
};

export const getCurrentRouteKey = (url: string, schemaConfig: CallApiSchemaConfig | undefined) => {
	let currentRouteKey = url;

	if (schemaConfig?.baseURL && currentRouteKey.startsWith(schemaConfig.baseURL)) {
		currentRouteKey = currentRouteKey.replace(schemaConfig.baseURL, "");
	}

	return currentRouteKey;
};

/**
 * @description
 * Extracts the method from the URL if it is a schema modifier.
 *
 * @param initURL - The URL to extract the method from.
 * @returns The method if it is a schema modifier, otherwise undefined.
 */
export const extractMethodFromURL = (initURL: string | undefined) => {
	if (!initURL?.startsWith("@")) return;

	const method = initURL.split("@")[1]?.split("/")[0];

	if (!method || !routeKeyMethods.includes(method)) return;

	return method;
};

export type GetMethodOptions = {
	initURL: string | undefined;
	method: CallApiRequestOptions["method"];
	schemaConfig?: CallApiSchemaConfig;
};

export const getMethod = (options: GetMethodOptions) => {
	const { initURL, method, schemaConfig } = options;

	if (schemaConfig?.requireMethodProvision === true) {
		return method?.toUpperCase() ?? requestOptionDefaults.method;
	}

	return (
		method?.toUpperCase() ?? extractMethodFromURL(initURL)?.toUpperCase() ?? requestOptionDefaults.method
	);
};

export const normalizeURL = (initURL: string) => {
	const methodFromURL = extractMethodFromURL(initURL);

	if (!methodFromURL) {
		return initURL;
	}

	const normalizedURL = initURL.replace(`@${methodFromURL}/`, "/");

	return normalizedURL;
};

type GetFullURLOptions = {
	baseURL: string | undefined;
	initURL: string;
	params: CallApiExtraOptions["params"];
	query: CallApiExtraOptions["query"];
};

export const getFullURL = (options: GetFullURLOptions) => {
	const { baseURL, initURL, params, query } = options;

	const normalizedURL = normalizeURL(initURL);

	const urlWithMergedParams = mergeUrlWithParams(normalizedURL, params);

	const urlWithMergedQueryAndParams = mergeUrlWithQuery(urlWithMergedParams, query);

	if (urlWithMergedQueryAndParams.startsWith("http") || !baseURL) {
		return urlWithMergedQueryAndParams;
	}

	return `${baseURL}${urlWithMergedQueryAndParams}`;
};

export type AllowedQueryParamValues = UnmaskType<boolean | number | string>;

export type Params = UnmaskType<
	// eslint-disable-next-line perfectionist/sort-union-types -- I need the Record to be first
	Record<string, AllowedQueryParamValues> | AllowedQueryParamValues[]
>;

export type Query = UnmaskType<Record<string, AllowedQueryParamValues>>;

export type InitURLOrURLObject = string | URL;

export interface URLOptions {
	/**
	 * Base URL to be prepended to all request URLs
	 */
	baseURL?: string;

	/**
	 * Resolved request URL
	 */
	readonly fullURL?: string;

	/**
	 * The url string passed to the callApi instance
	 */
	readonly initURL?: string;

	/**
	 * The URL string passed to the callApi instance, but normalized (removed any method modifiers etc)
	 */
	readonly initURLNormalized?: string;

	/**
	 * Parameters to be appended to the URL (i.e: /:id)
	 *
	 * If url is defined as `/path/:id`, params will be `{ id: string }`
	 */
	params?: Params;

	/**
	 * Query parameters to append to the URL.
	 */
	query?: Query;
}
