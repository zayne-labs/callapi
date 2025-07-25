import { requestOptionDefaults } from "./constants/default-options";
import type { CallApiExtraOptions, CallApiRequestOptions } from "./types/common";
import type { AnyString, UnmaskType } from "./types/type-helpers";
import { toQueryString } from "./utils";
import { isArray } from "./utils/guards";
import { type CallApiSchemaConfig, type RouteKeyMethodsURLUnion, routeKeyMethods } from "./validation";

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

/**
 * @description Extracts the HTTP method from method-prefixed route patterns.
 *
 * Analyzes URLs that start with method modifiers (e.g., "@get/", "@post/") and extracts
 * the HTTP method for use in API requests. This enables method specification directly
 * in route definitions.
 *
 * @param initURL - The URL string to analyze for method modifiers
 * @returns The extracted HTTP method (lowercase) if found, otherwise undefined
 *
 * @example
 * ```typescript
 * // Method extraction from prefixed routes
 * extractMethodFromURL("@get/users");        // Returns: "get"
 * extractMethodFromURL("@post/users");       // Returns: "post"
 * extractMethodFromURL("@put/users/:id");    // Returns: "put"
 * extractMethodFromURL("@delete/users/:id"); // Returns: "delete"
 * extractMethodFromURL("@patch/users/:id");  // Returns: "patch"
 *
 * // No method modifier
 * extractMethodFromURL("/users");            // Returns: undefined
 * extractMethodFromURL("users");             // Returns: undefined
 *
 * // Invalid or unsupported methods
 * extractMethodFromURL("@invalid/users");    // Returns: undefined
 * extractMethodFromURL("@/users");           // Returns: undefined
 *
 * // Edge cases
 * extractMethodFromURL(undefined);           // Returns: undefined
 * extractMethodFromURL("");                  // Returns: undefined
 * ```
 */
export const extractMethodFromURL = (initURL: string | undefined) => {
	if (!initURL || initURL.startsWith("@")) return;

	const method = initURL.split("@")[1]?.split("/")[0];

	if (!method || !routeKeyMethods.includes(method)) return;

	return method;
};

export type GetMethodOptions = {
	/** The URL string that may contain method modifiers like "@get/" or "@post/" */
	initURL: string | undefined;
	/** Explicitly specified HTTP method */
	method: CallApiRequestOptions["method"];
	/** Schema configuration that affects method resolution behavior */
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

const normalizeURL = (initURL: string) => {
	const methodFromURL = extractMethodFromURL(initURL);

	if (!methodFromURL) {
		return initURL;
	}

	const normalizedURL = initURL.replace(`@${methodFromURL}/`, "/");

	return normalizedURL;
};

type GetFullURLOptions = {
	/** Base URL to prepend to relative URLs */
	baseURL: string | undefined;
	/** Initial URL pattern that may contain parameters and method modifiers */
	initURL: string;
	/** Parameters to substitute into the URL path */
	params: CallApiExtraOptions["params"];
	/** Query parameters to append to the URL */
	query: CallApiExtraOptions["query"];
};

export const getFullAndNormalizedURL = (options: GetFullURLOptions) => {
	const { baseURL, initURL, params, query } = options;

	const normalizedInitURL = normalizeURL(initURL);

	const urlWithMergedParams = mergeUrlWithParams(normalizedInitURL, params);

	const urlWithMergedQueryAndParams = mergeUrlWithQuery(urlWithMergedParams, query);

	const shouldNotPrependBaseURL = urlWithMergedQueryAndParams.startsWith("http") || !baseURL;

	const fullURL =
		shouldNotPrependBaseURL ? urlWithMergedQueryAndParams : `${baseURL}${urlWithMergedQueryAndParams}`;

	return {
		fullURL,
		normalizedInitURL,
	};
};

export type AllowedQueryParamValues = UnmaskType<boolean | number | string>;

export type Params = UnmaskType<
	// eslint-disable-next-line perfectionist/sort-union-types -- I need the Record to be first
	Record<string, AllowedQueryParamValues> | AllowedQueryParamValues[]
>;

export type Query = UnmaskType<Record<string, AllowedQueryParamValues>>;

export type InitURLOrURLObject = AnyString | RouteKeyMethodsURLUnion | URL;

export interface URLOptions {
	/**
	 * Base URL to be prepended to all request URLs.
	 *
	 * When provided, this will be prepended to relative URLs. Absolute URLs (starting with http/https) will not be prepended by the baseURL.
	 *
	 */
	baseURL?: string;

	/**
	 * Resolved request URL after processing baseURL, parameters, and query strings.
	 *
	 * This is the final URL that will be used for the HTTP request, computed from
	 * baseURL, initURL, params, and query parameters.
	 *
	 * @readonly
	 */
	readonly fullURL?: string;

	/**
	 * The original URL string passed to the callApi instance.
	 *
	 * This preserves the original URL as provided, including any method modifiers like "@get/" or "@post/".
	 *
	 * @readonly
	 */
	readonly initURL?: string;

	/**
	 * The URL string after normalization, with method modifiers removed.
	 *
	 * Method modifiers like "@get/", "@post/" are stripped to create a clean URL
	 * for parameter substitution and final URL construction.
	 *
	 * @readonly
	 *
	 *
	 */
	readonly initURLNormalized?: string;

	/**
	 * Parameters to be substituted into URL path segments.
	 *
	 * Supports both object-style (named parameters) and array-style (positional parameters)
	 * for flexible URL parameter substitution.
	 *
	 * @example
	 * ```typescript
	 * // Object-style parameters (recommended)
	 * const namedParams: URLOptions = {
	 *   initURL: "/users/:userId/posts/:postId",
	 *   params: { userId: "123", postId: "456" }
	 * };
	 * // Results in: /users/123/posts/456
	 *
	 * // Array-style parameters (positional)
	 * const positionalParams: URLOptions = {
	 *   initURL: "/users/:userId/posts/:postId",
	 *   params: ["123", "456"]  // Maps in order: userId=123, postId=456
	 * };
	 * // Results in: /users/123/posts/456
	 *
	 * // Single parameter
	 * const singleParam: URLOptions = {
	 *   initURL: "/users/:id",
	 *   params: { id: "user-123" }
	 * };
	 * // Results in: /users/user-123
	 * ```
	 */
	params?: Params;

	/**
	 * Query parameters to append to the URL as search parameters.
	 *
	 * These will be serialized into the URL query string using standard
	 * URL encoding practices.
	 *
	 * @example
	 * ```typescript
	 * // Basic query parameters
	 * const queryOptions: URLOptions = {
	 *   initURL: "/users",
	 *   query: {
	 *     page: 1,
	 *     limit: 10,
	 *     search: "john doe",
	 *     active: true
	 *   }
	 * };
	 * // Results in: /users?page=1&limit=10&search=john%20doe&active=true
	 *
	 * // Filtering and sorting
	 * const filterOptions: URLOptions = {
	 *   initURL: "/products",
	 *   query: {
	 *     category: "electronics",
	 *     minPrice: 100,
	 *     maxPrice: 500,
	 *     sortBy: "price",
	 *     order: "asc"
	 *   }
	 * };
	 * // Results in: /products?category=electronics&minPrice=100&maxPrice=500&sortBy=price&order=asc
	 * ```
	 */
	query?: Query;
}
