import { dedupeDefaults } from "./constants/default-options";
import type { RequestContext } from "./hooks";
import { toStreamableRequest, toStreamableResponse } from "./stream";
import type { AnyString } from "./types/type-helpers";
import { deterministicHashFn, getFetchImpl, waitFor } from "./utils/common";

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

export const getAbortErrorMessage = (
	dedupeKey: DedupeOptions["dedupeKey"],
	fullURL: DedupeContext["options"]["fullURL"]
) => {
	return dedupeKey ?
			`Duplicate request detected - Aborted previous request with key '${dedupeKey}' as a new request was initiated`
		:	`Duplicate request detected - Aborted previous request to '${fullURL}' as a new request with identical options was initiated`;
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

	const generateDedupeKey = () => {
		const shouldHaveDedupeKey = dedupeStrategy === "cancel" || dedupeStrategy === "defer";

		if (!shouldHaveDedupeKey) {
			return null;
		}

		return `${globalOptions.fullURL}-${deterministicHashFn({ options: globalOptions, request: globalRequest })}`;
	};

	const dedupeKey = globalOptions.dedupeKey ?? generateDedupeKey();

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

		const message = getAbortErrorMessage(globalOptions.dedupeKey, globalOptions.fullURL);

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
	 * Defines the scope of the deduplication cache, can be set to "global" | "local".
	 * - If set to "global", the deduplication cache will be shared across all requests, regardless of whether they shared the same `createFetchClient` or not.
	 * - If set to "local", the deduplication cache will be scoped to the current request.
	 * @default "local"
	 */
	dedupeCacheScope?: "global" | "local";

	/**
	 * Unique key to namespace the deduplication cache when `dedupeCacheScope` is set to `"global"`.
	 *
	 * CallApi instances sharing this key will use the same cache for deduplication.
	 * @default "default"
	 */
	dedupeCacheScopeKey?: "default" | AnyString;

	/**
	 * Custom request key to be used to identify a request within the selected deduplication cache.
	 * @default the full request url + string formed from the request options
	 */
	dedupeKey?: string;

	/**
	 * Defines the deduplication strategy for the request, can be set to "none" | "defer" | "cancel".
	 * - If set to "cancel", the previous pending request with the same request key will be cancelled and lets the new request through.
	 * - If set to "defer", all new request with the same request key will be share the same response, until the previous one is completed.
	 * - If set to "none", deduplication is disabled.
	 * @default "cancel"
	 */
	dedupeStrategy?: "cancel" | "defer" | "none";
};
