import type { CallApiExtraOptions } from "./types/common";
import type { AnyString, UnmaskType } from "./types/type-helpers";
import { toQueryString } from "./utils/external/body";
import { isArray } from "./utils/guards";
import { routeKeyMethods, type RouteKeyMethodsURLUnion } from "./validation";

export const slash = "/";
const colon = ":";
const openBrace = "{";
const closeBrace = "}";

const mergeUrlWithParams = (url: string, params: CallApiExtraOptions["params"]) => {
	if (!params) {
		return url;
	}

	let newUrl = url;

	if (isArray(params)) {
		const urlParts = newUrl.split(slash);

		// == Find all parameters in order (both :param and {param} patterns)
		const matchedParamsArray = urlParts.filter(
			(part) => part.startsWith(colon) || (part.startsWith(openBrace) && part.endsWith(closeBrace))
		);

		for (const [paramIndex, matchedParam] of matchedParamsArray.entries()) {
			const stringParamValue = String(params[paramIndex]);
			newUrl = newUrl.replace(matchedParam, stringParamValue);
		}

		return newUrl;
	}

	// == Handle object params - replace both :param and {param} patterns
	for (const [paramKey, paramValue] of Object.entries(params)) {
		const colonPattern = `${colon}${paramKey}` as const;
		const bracePattern = `${openBrace}${paramKey}${closeBrace}` as const;
		const stringValue = String(paramValue);

		newUrl = newUrl.replace(colonPattern, stringValue);
		newUrl = newUrl.replace(bracePattern, stringValue);
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

	if (queryString.length === 0) {
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
 * extractMethodFromURL("@get/users");        // Returns: "get"
 * extractMethodFromURL("@post/users");       // Returns: "post"
 * ```
 */
export const extractMethodFromURL = (initURL: string | undefined) => {
	if (!initURL?.startsWith("@")) return;

	const methodFromURL = routeKeyMethods.find((method) =>
		initURL.startsWith(`${atSymbol}${method}${slash}`)
	);

	if (!methodFromURL) return;

	return methodFromURL;
};

type NormalizeURLOptions = {
	retainLeadingSlashForRelativeURLs?: boolean;
};

export const atSymbol = "@";
export type AtSymbol = typeof atSymbol;

export const normalizeURL = (initURL: string, options: NormalizeURLOptions = {}) => {
	const { retainLeadingSlashForRelativeURLs = true } = options;

	const methodFromURL = extractMethodFromURL(initURL);

	if (!methodFromURL) {
		return initURL;
	}

	const normalizedURL =
		retainLeadingSlashForRelativeURLs && !initURL.includes("http") ?
			initURL.replace(`${atSymbol}${methodFromURL}`, "")
		:	initURL.replace(`${atSymbol}${methodFromURL}${slash}`, "");

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

const getFullURL = (initURL: string, baseURL: string | undefined) => {
	if (!baseURL || initURL.startsWith("http")) {
		return initURL;
	}

	const shouldAddSlash = initURL.length > 0 && !initURL.startsWith(slash) && !baseURL.endsWith(slash);

	return shouldAddSlash ? `${baseURL}${slash}${initURL}` : `${baseURL}${initURL}`;
};

export const getFullAndNormalizedURL = (options: GetFullURLOptions) => {
	const { baseURL, initURL, params, query } = options;

	const normalizedInitURL = normalizeURL(initURL);

	const initURLWithParams = mergeUrlWithParams(normalizedInitURL, params);

	const initURLWithParamsAndQuery = mergeUrlWithQuery(initURLWithParams, query);

	const fullURL = getFullURL(initURLWithParamsAndQuery, baseURL);

	if (!URL.canParse(fullURL)) {
		const errorMessage =
			!baseURL ?
				`Invalid URL '${initURL}'. Are you passing a relative url to CallApi without setting the 'baseURL' option?`
			:	`Invalid URL '${fullURL}'. Please validate that you are passing the correct url.`;

		console.error(errorMessage);
	}

	return {
		fullURL,
		normalizedInitURL,
	};
};

export type AllowedQueryParamValues = UnmaskType<boolean | number | string>;

export type RecordStyleParams = UnmaskType<Record<string, AllowedQueryParamValues>>;

export type TupleStyleParams = UnmaskType<AllowedQueryParamValues[]>;

export type Params = UnmaskType<RecordStyleParams | TupleStyleParams>;

export type Query = UnmaskType<Record<string, AllowedQueryParamValues>>;

export type InitURLOrURLObject = AnyString | RouteKeyMethodsURLUnion | URL;

export interface URLOptions {
	/**
	 * Base URL for all API requests. Will only be prepended to relative URLs.
	 *
	 * Absolute URLs (starting with http/https) will not be prepended by the baseURL.
	 *
	 * @example
	 * ```ts
	 * // Set base URL for all requests
	 * baseURL: "https://api.example.com/v1"
	 *
	 * // Then use relative URLs in requests
	 * callApi("/users") // → https://api.example.com/v1/users
	 * callApi("/posts/123") // → https://api.example.com/v1/posts/123
	 *
	 * // Environment-specific base URLs
	 * baseURL: process.env.NODE_ENV === "production"
	 *   ? "https://api.example.com"
	 *   : "http://localhost:3000/api"
	 * ```
	 */
	baseURL?: string;

	/**
	 * Resolved request URL after processing baseURL, parameters, and query strings (readonly)
	 *
	 * This is the final URL that will be used for the HTTP request, computed from
	 * baseURL, initURL, params, and query parameters.
	 *
	 */
	readonly fullURL?: string;

	/**
	 * The original URL string passed to the callApi instance (readonly)
	 *
	 * This preserves the original URL as provided, including any method modifiers like "@get/" or "@post/".
	 *
	 */
	readonly initURL?: string;

	/**
	 * The URL string after normalization, with method modifiers removed(readonly)
	 *
	 * Method modifiers like "@get/", "@post/" are stripped to create a clean URL
	 * for parameter substitution and final URL construction.
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
