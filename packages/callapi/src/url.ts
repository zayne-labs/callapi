import { extraOptionDefaults } from "./constants";
import type { CallApiExtraOptions } from "./types/options-types";
import type { AnyString, UnmaskType } from "./types/type-helpers";
import { toSearchParams } from "./utils/external";
import { isArray } from "./utils/guards";
import { routeKeyMethods, type RouteKeyMethodsURLUnion } from "./validation";

const isReservedPathSegment = (value: string) => value === "." || value === "..";

const encodeParamValue = (value: unknown) => {
	const stringValue = String(value);

	if (isReservedPathSegment(stringValue)) {
		throw new TypeError("Path parameters cannot be reserved path segments");
	}

	return encodeURIComponent(stringValue);
};

const isColonPathParam = (segment: string | undefined) => Boolean(segment?.startsWith(":"));

const isBracePathParam = (segment: string | undefined) => {
	return Boolean(segment?.startsWith("{") && segment.endsWith("}"));
};

const handleArrayParams = (url: string, params: Extract<CallApiExtraOptions["params"], unknown[]>) => {
	const placeholders: string[] = [];

	const urlSegments = url.split("/");

	for (const segment of urlSegments) {
		if (!isColonPathParam(segment) && !isBracePathParam(segment)) continue;

		placeholders.push(segment);
	}

	let resolvedURL = url;

	for (const index of placeholders.keys()) {
		const placeholder = placeholders[index];

		if (placeholder === undefined) continue;

		const paramValue = params[index];

		resolvedURL = resolvedURL.replace(placeholder, encodeParamValue(paramValue));
	}

	return resolvedURL;
};

const getPathParamKey = (segment: string) => {
	if (isColonPathParam(segment)) {
		return segment.slice(1);
	}

	if (isBracePathParam(segment)) {
		return segment.slice(1, -1);
	}

	return null;
};

const handleObjectParams = (
	url: string,
	params: Extract<CallApiExtraOptions["params"], Record<string, unknown>>
) => {
	const urlSegments = url.split("/");

	for (const segmentIndex of urlSegments.keys()) {
		const segment = urlSegments[segmentIndex];

		if (segment === undefined) continue;

		const paramKey = getPathParamKey(segment);

		if (paramKey === null || !Object.hasOwn(params, paramKey)) continue;

		const paramValue = params[paramKey];

		urlSegments[segmentIndex] = encodeParamValue(paramValue);
	}

	return urlSegments.join("/");
};

const mergeUrlWithParams = (url: string, params: CallApiExtraOptions["params"]) => {
	if (!params) {
		return url;
	}

	const newUrl = isArray(params) ? handleArrayParams(url, params) : handleObjectParams(url, params);

	return newUrl;
};

const mergeUrlWithQuery = (url: string, query: CallApiExtraOptions["query"]): string => {
	if (!query) {
		return url;
	}

	const incomingSearchParams = toSearchParams(query);

	if (incomingSearchParams.size === 0) {
		return url;
	}

	if (!url.includes("?")) {
		return `${url}?${incomingSearchParams}`;
	}

	if (url.endsWith("?")) {
		return `${url}${incomingSearchParams}`;
	}

	const [mainUrl, existingQueryString] = url.split("?");

	const searchParams = new URLSearchParams(existingQueryString);

	for (const key of incomingSearchParams.keys()) {
		searchParams.delete(key);
	}

	for (const entry of incomingSearchParams) {
		searchParams.append(...entry);
	}

	return `${mainUrl}?${searchParams}`;
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

	const methodFromURL = routeKeyMethods.find((method) => initURL.startsWith(`@${method}/`));

	if (!methodFromURL) return;

	return methodFromURL;
};

const isAbsoluteHTTPURL = (value: string) => {
	return value.startsWith("http://") || value.startsWith("https://");
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

	const initURLWithoutMethod = initURL.replace(`@${methodFromURL}/`, "");

	const normalizedURL =
		retainLeadingSlashForRelativeURLs && !isAbsoluteHTTPURL(initURLWithoutMethod) ?
			`/${initURLWithoutMethod}`
		:	initURLWithoutMethod;

	return normalizedURL;
};

type GetFullURLOptions = {
	baseURL: string | undefined;
	initURL: string;
	params: CallApiExtraOptions["params"];
	query: CallApiExtraOptions["query"];
};

const getFullURL = (initURL: string, baseURL: string | undefined) => {
	if (!baseURL || isAbsoluteHTTPURL(initURL)) {
		return initURL;
	}

	// Remove all trailing slashes from the base URL.
	const normalizedBaseURL = baseURL.replace(/\/+$/, "");
	// Remove all leading slashes from the request URL.
	const normalizedInitURL = initURL.replace(/^\/+/, "");

	return normalizedInitURL ? `${normalizedBaseURL}/${normalizedInitURL}` : normalizedBaseURL;
};

export const getFullAndNormalizedURL = (
	options: GetFullURLOptions & {
		debugMode: CallApiExtraOptions["debugMode"];
	}
) => {
	const { baseURL, debugMode, initURL, params, query } = options;

	const normalizedInitURL = normalizeURL(initURL);

	const fullURL = getFullURL(
		mergeUrlWithQuery(mergeUrlWithParams(normalizedInitURL, params), query),
		baseURL
	);

	if (
		(debugMode ?? extraOptionDefaults.debugMode)
		&& !isAbsoluteHTTPURL(fullURL)
		&& !URL.canParse(fullURL)
	) {
		console.error(
			`Relative URL '${fullURL}' may fail during SSR. Set an absolute 'baseURL' for server-side requests.`
		);
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

type StructuredQueryValues = Record<string, unknown> | unknown[] | null | undefined;

export type Query = UnmaskType<
	Record<string, AllowedQueryParamValues | StructuredQueryValues> | URLSearchParams
>;

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
