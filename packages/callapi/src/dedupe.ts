import { extraOptionDefaults } from "./constants/defaults";
import type { RequestContext } from "./hooks";
import { toStreamableRequest, toStreamableResponse } from "./stream";
import type { AnyString, UnmaskType } from "./types/type-helpers";
import { waitFor } from "./utils/common";
import { isFunction } from "./utils/guards";

type RequestInfo = {
	controller: AbortController;
	responsePromise: Promise<Response>;
};

/**
 * Cache that stores active request information for deduplication within a specific scope.
 *
 * Maps deduplication keys to their corresponding request information, including the abort controller
 * and response promise. A `null` key represents requests that don't participate in deduplication.
 *
 * **Internal Usage:**
 * This type is primarily used internally by the deduplication system. You typically won't need to
 * interact with it directly unless you're building custom deduplication logic or debugging.
 *
 * @example
 * ```ts
 * // This is handled internally, but conceptually:
 * const cache: RequestInfoCache = new Map([
 *   ["user-123", { controller: abortController, responsePromise: fetchPromise }],
 *   ["config", { controller: abortController2, responsePromise: fetchPromise2 }],
 * ]);
 * ```
 */
export type RequestInfoCache = Map<string | null, RequestInfo>;

/**
 * Global cache that manages multiple request info caches, organized by scope keys.
 *
 * This enables the global deduplication feature by maintaining separate cache namespaces
 * for different scope keys. Each scope key gets its own `RequestInfoCache` instance.
 *
 * **Cache Lifecycle:**
 * - Caches are created on-demand when first accessed
 * - Automatic cleanup occurs when no references remain
 * - Each scope key maintains independent deduplication state
 *
 * **Memory Considerations:**
 * - Each scope key creates a separate cache instance
 * - Consider the number of different scope keys in your application
 * - Caches are cleaned up automatically when clients are garbage collected
 *
 * @example
 * ```ts
 * // This is managed internally, but conceptually:
 * const globalCache: GlobalRequestInfoCache = new Map([
 *   ["user-service", new Map([...])],    // Cache for user service requests
 *   ["analytics", new Map([...])],       // Cache for analytics requests
 *   ["default", new Map([...])]          // Default cache scope
 * ]);
 * ```
 */
export type GlobalRequestInfoCache = Map<DedupeOptions["dedupeCacheScopeKey"], RequestInfoCache>;

type DedupeContext = RequestContext & {
	$GlobalRequestInfoCache: GlobalRequestInfoCache;
	$LocalRequestInfoCache: RequestInfoCache;
	newFetchController: AbortController;
};

export const createDedupeStrategy = async (context: DedupeContext) => {
	const {
		$GlobalRequestInfoCache,
		$LocalRequestInfoCache,
		baseConfig,
		config,
		newFetchController,
		options: globalOptions,
	} = context;

	const dedupeStrategy = globalOptions.dedupeStrategy ?? extraOptionDefaults.dedupeStrategy;

	const resolvedDedupeStrategy = isFunction(dedupeStrategy) ? dedupeStrategy(context) : dedupeStrategy;

	const getDedupeKey = () => {
		const shouldHaveDedupeKey =
			resolvedDedupeStrategy === "cancel" || resolvedDedupeStrategy === "defer";

		if (!shouldHaveDedupeKey) {
			return null;
		}

		const dedupeKey = globalOptions.dedupeKey ?? extraOptionDefaults.dedupeKey;

		const resolvedDedupeKey = isFunction(dedupeKey) ? dedupeKey(context) : dedupeKey;

		return resolvedDedupeKey;
	};

	const getDedupeCacheScopeKey = () => {
		const dedupeCacheScopeKey =
			globalOptions.dedupeCacheScopeKey ?? extraOptionDefaults.dedupeCacheScopeKey;

		const resolvedDedupeCacheScopeKey =
			isFunction(dedupeCacheScopeKey) ? dedupeCacheScopeKey(context) : dedupeCacheScopeKey;

		return resolvedDedupeCacheScopeKey;
	};

	const dedupeKey = getDedupeKey();

	const getRequestInfoCache = () => {
		if (!dedupeKey) return;

		const dedupeCacheScope = globalOptions.dedupeCacheScope ?? extraOptionDefaults.dedupeCacheScope;

		const dedupeCacheScopeKey = getDedupeCacheScopeKey();

		if (dedupeCacheScope === "global" && !$GlobalRequestInfoCache.has(dedupeCacheScopeKey)) {
			$GlobalRequestInfoCache.set(dedupeCacheScopeKey, new Map());
		}

		const $RequestInfoCache =
			dedupeCacheScope === "global" ?
				$GlobalRequestInfoCache.get(dedupeCacheScopeKey)
			:	$LocalRequestInfoCache;

		return {
			delete: () => $RequestInfoCache?.delete(dedupeKey),
			get: () => $RequestInfoCache?.get(dedupeKey),
			set: (value: RequestInfo) => $RequestInfoCache?.set(dedupeKey, value),
		};
	};

	const $RequestInfoCache = getRequestInfoCache();

	/**
	 * Force sequential execution of parallel requests to enable proper cache-based deduplication.
	 *
	 * Problem: When Promise.all([callApi(url), callApi(url)]) executes, both requests
	 * start synchronously and reach this point before either can populate the cache.
	 *
	 * Why `await Promise.resolve()` fails:
	 * - All microtasks in a batch resolve together at the next microtask checkpoint
	 * - Both requests resume execution simultaneously after the await
	 * - Both check `prevRequestInfo` at the same time → both see empty cache
	 * - Both proceed to populate cache → deduplication fails
	 *
	 * Why `wait new Promise(()=> setTimeout(resolve, number))` works:
	 * - Each setTimeout creates a separate task in the task queue
	 * - Tasks execute sequentially, not simultaneously
	 * - Request 1's task runs first: checks cache (empty) → continues → populates cache
	 * - Request 2's task runs after: checks cache (populated) → uses cached promise
	 * - Deduplication succeeds
	 *
	 * IMPORTANT: The delay must be non-zero. setTimeout(fn, 0) fails because JavaScript engines
	 * may optimize zero-delay timers by batching them together, causing all requests to resume
	 * simultaneously (same problem as microtasks). Any non-zero value (even 0.0000000001) forces
	 * proper sequential task queue scheduling, ensuring each request gets its own task slot.
	 */
	if (dedupeKey !== null) {
		await waitFor(0.001);
	}

	const prevRequestInfo = $RequestInfoCache?.get();

	const getAbortErrorMessage = () => {
		if (globalOptions.dedupeKey) {
			return `Duplicate request detected - Aborted previous request with key '${dedupeKey}'`;
		}

		return `Duplicate request detected - Aborted previous request to '${globalOptions.fullURL}'`;
	};

	const handleRequestCancelStrategy = () => {
		const shouldCancelRequest = prevRequestInfo && resolvedDedupeStrategy === "cancel";

		if (!shouldCancelRequest) return;

		const message = getAbortErrorMessage();

		const reason = new DOMException(message, "AbortError");

		prevRequestInfo.controller.abort(reason);
	};

	const handleRequestDeferStrategy = async (deferContext: {
		fetchApi: NonNullable<DedupeContext["options"]["customFetchImpl"]>;
		options: DedupeContext["options"];
		request: DedupeContext["request"];
	}) => {
		// == Local options and request are needed so that transformations are applied can be applied to both from call site
		const { fetchApi, options: localOptions, request: localRequest } = deferContext;

		const shouldUsePromiseFromCache = prevRequestInfo && resolvedDedupeStrategy === "defer";

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

		$RequestInfoCache?.set({ controller: newFetchController, responsePromise });

		return toStreamableResponse({ ...streamableContext, response: await responsePromise });
	};

	const removeDedupeKeyFromCache = () => {
		$RequestInfoCache?.delete();
	};

	return {
		getAbortErrorMessage,
		handleRequestCancelStrategy,
		handleRequestDeferStrategy,
		removeDedupeKeyFromCache,
		resolvedDedupeStrategy,
	};
};

type DedupeStrategyUnion = UnmaskType<"cancel" | "defer" | "none">;

export type DedupeOptions = {
	/**
	 * Controls the scope of request deduplication caching.
	 *
	 * - `"global"`: Shares deduplication cache across all `createFetchClient` instances with the same `dedupeCacheScopeKey`.
	 *   Useful for applications with multiple API clients that should share deduplication state.
	 * - `"local"`: Limits deduplication to requests within the same `createFetchClient` instance.
	 *   Provides better isolation and is recommended for most use cases.
	 *
	 *
	 * **Real-world Scenarios:**
	 * - Use `"global"` when you have multiple API clients (user service, auth service, etc.) that might make overlapping requests
	 * - Use `"local"` (default) for single-purpose clients or when you want strict isolation between different parts of your app
	 *
	 * @example
	 * ```ts
	 * // Local scope - each client has its own deduplication cache
	 * const userClient = createFetchClient({ baseURL: "/api/users" });
	 * const postClient = createFetchClient({ baseURL: "/api/posts" });
	 * // These clients won't share deduplication state
	 *
	 * // Global scope - share cache across related clients
	 * const userClient = createFetchClient({
	 *   baseURL: "/api/users",
	 *   dedupeCacheScope: "global",
	 * });
	 * const postClient = createFetchClient({
	 *   baseURL: "/api/posts",
	 *   dedupeCacheScope: "global",
	 * });
	 * // These clients will share deduplication state
	 * ```
	 *
	 * @default "local"
	 */
	dedupeCacheScope?: "global" | "local";

	/**
	 * Unique namespace for the global deduplication cache when using `dedupeCacheScope: "global"`.
	 *
	 * This creates logical groupings of deduplication caches. All instances with the same key
	 * will share the same cache namespace, allowing fine-grained control over which clients
	 * share deduplication state.
	 *
	 * **Best Practices:**
	 * - Use descriptive names that reflect the logical grouping (e.g., "user-service", "analytics-api")
	 * - Keep scope keys consistent across related API clients
	 * - Consider using different scope keys for different environments (dev, staging, prod)
	 * - Avoid overly broad scope keys that might cause unintended cache sharing
	 *
	 * **Cache Management:**
	 * - Each scope key maintains its own independent cache
	 * - Caches are automatically cleaned up when no references remain
	 * - Consider the memory implications of multiple global scopes
	 *
	 * @example
	 * ```ts
	 * // Group related API clients together
	 * const userClient = createFetchClient({
	 *   baseURL: "/api/users",
	 *   dedupeCacheScope: "global",
	 *   dedupeCacheScopeKey: "user-service"
	 * });
	 * const profileClient = createFetchClient({
	 *   baseURL: "/api/profiles",
	 *   dedupeCacheScope: "global",
	 *   dedupeCacheScopeKey: "user-service" // Same scope - will share cache
	 * });
	 *
	 * // Separate analytics client with its own cache
	 * const analyticsClient = createFetchClient({
	 *   baseURL: "/api/analytics",
	 *   dedupeCacheScope: "global",
	 *   dedupeCacheScopeKey: "analytics-service" // Different scope
	 * });
	 *
	 * // Environment-specific scoping
	 * const apiClient = createFetchClient({
	 *   dedupeCacheScope: "global",
	 *   dedupeCacheScopeKey: `api-${process.env.NODE_ENV}` // "api-development", "api-production", etc.
	 * });
	 * ```
	 *
	 * @default "default"
	 */
	dedupeCacheScopeKey?: "default" | AnyString | ((context: RequestContext) => string | undefined);

	/**
	 * Custom key generator for request deduplication.
	 *
	 * Override the default key generation strategy to control exactly which requests
	 * are considered duplicates. The default key combines URL, method, body, and
	 * relevant headers (excluding volatile ones like 'Date', 'Authorization', etc.).
	 *
	 * **Default Key Generation:**
	 * The auto-generated key includes:
	 * - Full request URL (including query parameters)
	 * - HTTP method (GET, POST, etc.)
	 * - Request body (for POST/PUT/PATCH requests)
	 * - Stable headers (excludes Date, Authorization, User-Agent, etc.)
	 *
	 * **Custom Key Best Practices:**
	 * - Include only the parts of the request that should affect deduplication
	 * - Avoid including volatile data (timestamps, random IDs, etc.)
	 * - Consider performance - simpler keys are faster to compute and compare
	 * - Ensure keys are deterministic for the same logical request
	 * - Use consistent key formats across your application
	 *
	 * **Performance Considerations:**
	 * - Function-based keys are computed on every request - keep them lightweight
	 * - String keys are fastest but least flexible
	 * - Consider caching expensive key computations if needed
	 *
	 * @example
	 * ```ts
	 * import { callApi } from "@zayne-labs/callapi";
	 *
	 * // Simple static key - useful for singleton requests
	 * const config = callApi("/api/config", {
	 *   dedupeKey: "app-config",
	 *   dedupeStrategy: "defer" // Share the same config across all requests
	 * });
	 *
	 * // URL and method only - ignore headers and body
	 * const userData = callApi("/api/user/123", {
	 *   dedupeKey: (context) => `${context.options.method}:${context.options.fullURL}`
	 * });
	 *
	 * // Include specific headers in deduplication
	 * const apiCall = callApi("/api/data", {
	 *   dedupeKey: (context) => {
	 *     const authHeader = context.request.headers.get("Authorization");
	 *     return `${context.options.fullURL}-${authHeader}`;
	 *   }
	 * });
	 *
	 * // User-specific deduplication
	 * const userSpecificCall = callApi("/api/dashboard", {
	 *   dedupeKey: (context) => {
	 *     const userId = context.options.fullURL.match(/user\/(\d+)/)?.[1];
	 *     return `dashboard-${userId}`;
	 *   }
	 * });
	 *
	 * // Ignore certain query parameters
	 * const searchCall = callApi("/api/search?q=test&timestamp=123456", {
	 *   dedupeKey: (context) => {
	 *     const url = new URL(context.options.fullURL);
	 *     url.searchParams.delete("timestamp"); // Remove volatile param
	 *     return `search:${url.toString()}`;
	 *   }
	 * });
	 * ```
	 *
	 * @default Auto-generated from request details
	 */
	dedupeKey?: string | ((context: RequestContext) => string | undefined);

	/**
	 * Strategy for handling duplicate requests. Can be a static string or callback function.
	 *
	 * **Available Strategies:**
	 * - `"cancel"`: Cancel previous request when new one starts (good for search)
	 * - `"defer"`: Share response between duplicate requests (good for config loading)
	 * - `"none"`: No deduplication, all requests execute independently
	 *
	 * @example
	 * ```ts
	 * // Static strategies
	 * const searchClient = createFetchClient({
	 *   dedupeStrategy: "cancel" // Cancel previous searches
	 * });
	 *
	 * const configClient = createFetchClient({
	 *   dedupeStrategy: "defer" // Share config across components
	 * });
	 *
	 * // Dynamic strategy based on request
	 * const smartClient = createFetchClient({
	 *   dedupeStrategy: (context) => {
	 *     return context.options.method === "GET" ? "defer" : "cancel";
	 *   }
	 * });
	 *
	 * // Search-as-you-type with cancel strategy
	 * const handleSearch = async (query: string) => {
	 *   try {
	 *     const { data } = await callApi("/api/search", {
	 *       method: "POST",
	 *       body: { query },
	 *       dedupeStrategy: "cancel",
	 *       dedupeKey: "search" // Cancel previous searches, only latest one goes through
	 *     });
	 *
	 *     updateSearchResults(data);
	 *   } catch (error) {
	 *     if (error.name === "AbortError") {
	 *       // Previous search cancelled - (expected behavior)
	 *       return;
	 *     }
	 *     console.error("Search failed:", error);
	 *   }
	 * };
	 *
	 * ```
	 *
	 * @default "cancel"
	 */
	dedupeStrategy?: DedupeStrategyUnion | ((context: RequestContext) => DedupeStrategyUnion);
};
