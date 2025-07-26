import { dedupeDefaults } from "./constants/default-options";
import type { RequestContext } from "./hooks";
import { toStreamableRequest, toStreamableResponse } from "./stream";
import type { AnyString } from "./types/type-helpers";
import { deterministicHashFn, getFetchImpl, waitFor } from "./utils/common";
import { isFunction } from "./utils/guards";

type RequestInfo = {
	controller: AbortController;
	responsePromise: Promise<Response>;
};

export type RequestInfoCache = Map<string | null, RequestInfo>;

export type GlobalRequestInfoCache = Map<DedupeOptions["dedupeCacheScopeKey"], RequestInfoCache>;

type DedupeContext = RequestContext & {
	$GlobalRequestInfoCache: GlobalRequestInfoCache;
	$LocalRequestInfoCache: RequestInfoCache;
	newFetchController: AbortController;
};

const resolveDedupeKey = (dedupeKey: DedupeOptions["dedupeKey"], context: RequestContext) => {
	if (isFunction(dedupeKey)) {
		return dedupeKey(context);
	}

	return dedupeKey ?? null;
};

export const getAbortErrorMessage = (dedupeKey: DedupeOptions["dedupeKey"], context: RequestContext) => {
	if (dedupeKey) {
		return `Duplicate request detected - Aborted previous request with key '${resolveDedupeKey(dedupeKey, context)}' as a new request was initiated`;
	}

	return `Duplicate request detected - Aborted previous request to '${context.options.fullURL}' as a new request with identical options was initiated`;
};

export const createDedupeStrategy = async (context: DedupeContext) => {
	const {
		$GlobalRequestInfoCache,
		$LocalRequestInfoCache,
		baseConfig,
		config,
		newFetchController,
		options: globalOptions,
		request: globalRequest,
	} = context;

	const dedupeStrategy = globalOptions.dedupeStrategy ?? dedupeDefaults.dedupeStrategy;

	const getDedupeKey = () => {
		const shouldHaveDedupeKey = dedupeStrategy === "cancel" || dedupeStrategy === "defer";

		if (!shouldHaveDedupeKey) {
			return null;
		}

		if (globalOptions.dedupeKey) {
			return resolveDedupeKey(globalOptions.dedupeKey, context);
		}

		return `${globalOptions.fullURL}-${deterministicHashFn({ options: globalOptions, request: globalRequest })}`;
	};

	const dedupeKey = getDedupeKey();

	const dedupeCacheScope = globalOptions.dedupeCacheScope ?? dedupeDefaults.dedupeCacheScope;

	const dedupeCacheScopeKey = globalOptions.dedupeCacheScopeKey ?? dedupeDefaults.dedupeCacheScopeKey;

	if (dedupeCacheScope === "global" && !$GlobalRequestInfoCache.has(dedupeCacheScopeKey)) {
		$GlobalRequestInfoCache.set(dedupeCacheScopeKey, new Map());
	}

	const $RequestInfoCache =
		dedupeCacheScope === "global" ?
			$GlobalRequestInfoCache.get(dedupeCacheScopeKey)
		:	$LocalRequestInfoCache;

	// == This is to ensure cache operations only occur when key is available
	const $RequestInfoCacheOrNull = dedupeKey !== null ? $RequestInfoCache : null;

	/******
	 * == Add a small delay to the execution to ensure proper request deduplication when multiple requests with the same key start simultaneously.
	 * == This gives time for the cache to be updated with the previous request info before the next request checks it.
	 ******/
	if (dedupeKey !== null) {
		await waitFor(0.1);
	}

	const prevRequestInfo = $RequestInfoCacheOrNull?.get(dedupeKey);

	const handleRequestCancelStrategy = () => {
		const shouldCancelRequest = prevRequestInfo && dedupeStrategy === "cancel";

		if (!shouldCancelRequest) return;

		const message = getAbortErrorMessage(globalOptions.dedupeKey, context);

		const reason = new DOMException(message, "AbortError");

		prevRequestInfo.controller.abort(reason);

		// == Adding this just so that eslint forces me put await when calling the function (it looks better that way tbh)
		return Promise.resolve();
	};

	const handleRequestDeferStrategy = async (deferContext: {
		options: DedupeContext["options"];
		request: DedupeContext["request"];
	}) => {
		// == Local options and request are needed so that transformations are applied can be applied to both from call site
		const { options: localOptions, request: localRequest } = deferContext;

		const fetchApi = getFetchImpl(localOptions.customFetchImpl);

		const shouldUsePromiseFromCache = prevRequestInfo && dedupeStrategy === "defer";

		const streamableContext = {
			baseConfig,
			config,
			options: localOptions,
			request: localRequest,
		} satisfies RequestContext;

		const streamableRequest = await toStreamableRequest(streamableContext);

		const responsePromise =
			shouldUsePromiseFromCache ?
				prevRequestInfo.responsePromise
			:	fetchApi(localOptions.fullURL as NonNullable<typeof localOptions.fullURL>, streamableRequest);

		$RequestInfoCacheOrNull?.set(dedupeKey, { controller: newFetchController, responsePromise });

		const streamableResponse = toStreamableResponse({
			...streamableContext,
			response: await responsePromise,
		});

		return streamableResponse;
	};

	const removeDedupeKeyFromCache = () => {
		$RequestInfoCacheOrNull?.delete(dedupeKey);
	};

	return {
		dedupeStrategy,
		handleRequestCancelStrategy,
		handleRequestDeferStrategy,
		removeDedupeKeyFromCache,
	};
};

export type DedupeOptions = {
	/**
	 * Controls the scope of request deduplication caching.
	 *
	 * - `"global"`: Shares deduplication cache across all `createFetchClient` instances with the same `dedupeCacheScopeKey`
	 * - `"local"`: Limits deduplication to requests within the same `createFetchClient` instance
	 *
	 * @example
	 * ```ts
	 * // Share cache across all instances with the same scope key
	 * const userClient = createFetchClient({
	 *   dedupeCacheScope: "global",
	 * });
	 * ```
	 *
	 * @default "local"
	 */
	dedupeCacheScope?: "global" | "local";

	/**
	 * Unique namespace for the global deduplication cache when using `dedupeCacheScope: "global"`.
	 *
	 * Use this to create logical groupings of deduplication caches. All instances with the same key will share the same cache namespace.
	 *
	 * @example
	 * ```ts
	 * // Group related API clients together
	 * const userClient = createFetchClient({
	 *   dedupeCacheScope: "global",
	 *   dedupeCacheScopeKey: "user-service"
	 * });
	 * ```
	 *
	 * @default "default"
	 */
	dedupeCacheScopeKey?: "default" | AnyString;

	/**
	 * Custom key generator function for request deduplication.
	 *
	 * Override the default key generation strategy to control exactly which requests
	 * are considered duplicates. The default combines:
	 * - Request URL
	 * - Method (GET, POST, etc.)
	 * - Request body
	 * - Headers (excluding common volatile ones like 'Date' or 'Authorization')
	 *
	 * @example
	 * ```ts
	 * import { callApi } from "@zayne-labs/callapi";
	 *
	 * // Simple static key
	 * const result = callApi("https://api.example.com/data", {
	 *   dedupeKey: "some-key",
	 * });
	 *
	 * // Custom key that only considers URL and method
	 * const result = callApi("https://api.example.com/data", {
	 *   dedupeKey: (context) => `${context.options.method}:${context.options.fullURL}`,
	 * });
	 * ```
	 *
	 * @default Auto-generated from request details
	 */
	dedupeKey?: string | ((context: RequestContext) => string);

	/**
	 * Strategy for handling duplicate requests.
	 *
	 * - `"cancel"`: (Default) Cancels any in-flight request with the same key and processes the new one
	 * - `"defer"`: Returns the pending promise for duplicate requests, sharing the same response
	 * - `"none"`: Disables request deduplication entirely
	 *
	 * @example
	 * ```ts
	 * // Share responses for identical requests
	 * const callNewApi = createFetchClient({
	 *   dedupeStrategy: "defer"
	 * });
	 * ```
	 *
	 * @default "cancel"
	 */
	dedupeStrategy?: "cancel" | "defer" | "none";
};
