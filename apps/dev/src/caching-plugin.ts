import { definePlugin, type CallApiPlugin } from "@zayne-labs/callapi";

type CacheConfigOptions = {
	/**
	 * How long cached responses should be considered valid (in milliseconds).
	 * @default 60000 (1 minute)
	 */
	cacheLifetime: number;

	/**
	 * Cache policy to use for requests.
	 * - 'cache-first': Check cache before making network request
	 * - 'no-cache': Always make network request, bypass cache
	 * @default 'cache-first'
	 */
	cachePolicy: "cache-first" | "no-cache";
};

/**
 * Response caching plugin that intercepts fetch requests at the network layer.
 *
 * This plugin demonstrates the fetchMiddleware pattern by wrapping the native fetch
 * implementation to provide transparent response caching. It maintains an in-memory
 * cache with configurable lifetime and supports both cache-first and no-cache policies.
 *
 * The cache is scoped per plugin instance, allowing different clients to maintain
 * separate caches with different configurations.
 *
 * @param configOptions - Configuration for cache behavior
 * @param configOptions.cachePolicy - Strategy for cache usage ('cache-first' or 'no-cache')
 * @param configOptions.cacheLifetime - Time in milliseconds before cached responses expire
 *
 * @example
 * ```ts
 * // Create a client with 1-minute cache
 * const client = createFetchClient({
 *   baseURL: 'https://api.example.com',
 *   plugins: [cachingPlugin({
 *     cachePolicy: 'cache-first',
 *     cacheLifetime: 60000
 *   })]
 * });
 *
 * // First call - fetches from network
 * const result1 = await client('/users');
 *
 * // Second call within 1 minute - returns cached response
 * const result2 = await client('/users');
 *
 * // Bypass cache for specific requests
 * const freshClient = createFetchClient({
 *   baseURL: 'https://api.example.com',
 *   plugins: [cachingPlugin({
 *     cachePolicy: 'no-cache',
 *     cacheLifetime: 60000
 *   })]
 * });
 * ```
 */
export const cachingPlugin = definePlugin((configOptions: CacheConfigOptions) => {
	const { cacheLifetime, cachePolicy } = configOptions;

	return {
		description: "Caching plugin for CallApi",
		id: "caching-plugin",
		name: "Caching Plugin",

		// eslint-disable-next-line perfectionist/sort-objects -- Ignore
		middlewares: () => {
			const cache = new Map<string, { data: Response; timestamp: number }>();

			return {
				fetchMiddleware: (fetchImpl) => async (input, init) => {
					if (cachePolicy === "no-cache") {
						return fetchImpl(input, init);
					}

					// Generate cache key from request
					const cacheKey =
						typeof input === "string" ? input
							// eslint-disable-next-line unicorn/no-nested-ternary -- Ignore
						: input instanceof Request ? input.url
						: input.toString();

					const cached = cache.get(cacheKey);

					// Check if we have a valid cached response
					if (cached && Date.now() - cached.timestamp < cacheLifetime) {
						console.info(`[Caching Plugin] Cache hit: ${cacheKey}`);
						// Clone the response since Response bodies can only be read once
						return cached.data.clone();
					}

					// Cache miss or expired - make network request
					console.info(`[Caching Plugin] Cache miss: ${cacheKey}`);
					const response = await fetchImpl(input, init);

					// Only cache successful responses
					if (response.ok) {
						cache.set(cacheKey, {
							data: response.clone(),
							timestamp: Date.now(),
						});
						console.info(`[Caching Plugin] Cached response for: ${cacheKey}`);
					}

					return response;
				},
			};
		},
	} satisfies CallApiPlugin;
});
