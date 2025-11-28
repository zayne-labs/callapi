import type { PluginSetupContext } from "@zayne-labs/callapi";
import { definePlugin } from "@zayne-labs/callapi/utils";
import { z } from "zod";

const CacheConfigSchema = z.object({
	cacheLifetime: z.int().positive().optional(),
	cachePolicy: z.literal(["cache-first", "no-cache"]).optional(),
});

type CacheConfig = z.infer<typeof CacheConfigSchema>;

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

export const cachingPlugin = (cacheConfig: CacheConfig) => {
	const cache = new Map<string, { data: Response; timestamp: number }>();

	const {
		cacheLifetime: initCacheLifeTime = 1 * 60 * 1000,
		cachePolicy: initCachePolicy = "cache-first",
	} = cacheConfig;

	return definePlugin({
		id: "caching-plugin",
		name: "Caching Plugin",

		// eslint-disable-next-line perfectionist/sort-objects -- Ignore
		defineExtraOptions: () => CacheConfigSchema,

		middlewares: ({ options }: PluginSetupContext<{ InferredPluginOptions: CacheConfig }>) => {
			const { cacheLifetime = initCacheLifeTime, cachePolicy = initCachePolicy } = options;

			return {
				fetchMiddleware: (ctx) => async (input, init) => {
					if (cachePolicy === "no-cache") {
						return ctx.fetchImpl(input, init);
					}

					const cacheKey = input instanceof Request ? input.url : input.toString();
					const cachedEntry = cache.get(cacheKey);

					const fetchAndCache = async () => {
						const response = await ctx.fetchImpl(input, init);

						cache.set(cacheKey, { data: response.clone(), timestamp: Date.now() });

						return response;
					};

					if (!cachedEntry) {
						console.info(`[Caching Plugin] Cache miss: ${cacheKey}`);
						return fetchAndCache();
					}

					const isCacheExpired = Date.now() - cachedEntry.timestamp > cacheLifetime;

					if (isCacheExpired) {
						console.info(`[Caching Plugin] Cache miss (expired): ${cacheKey}`);
						cache.delete(cacheKey);

						return fetchAndCache();
					}

					console.info(`[Caching Plugin] Cache hit: ${cacheKey}`);
					return cachedEntry.data.clone();
				},
			};
		},
	});
};
