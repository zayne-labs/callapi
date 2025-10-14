import type { RequestContext } from "./hooks";
import type { UnmaskType } from "./types/type-helpers";

export type FetchImpl = UnmaskType<
	(input: string | Request | URL, init?: RequestInit) => Promise<Response>
>;

export interface Middlewares {
	/**
	 * Wraps the fetch implementation to intercept requests at the network layer.
	 *
	 * Takes a context object containing the current fetch function and returns a new fetch function.
	 * Use it to cache responses, add logging, handle offline mode, or short-circuit requests etc.
	 * Multiple middleware compose in order: plugins → base config → per-request.
	 *
	 * Unlike `customFetchImpl`, middleware can call through to the original fetch.
	 *
	 * @example
	 * ```ts
	 * // Cache responses
	 * const cache = new Map();
	 * fetchMiddleware: (ctx) => async (input, init) => {
	 *   const key = input.toString();
	 *   if (cache.has(key)) return cache.get(key).clone();
	 *
	 *   const response = await ctx.fetchImpl(input, init);
	 *   cache.set(key, response.clone());
	 *   return response;
	 * }
	 *
	 * // Handle offline
	 * fetchMiddleware: (ctx) => async (input, init) => {
	 *   if (!navigator.onLine) {
	 *     return new Response('{"error": "offline"}', { status: 503 });
	 *   }
	 *   return ctx.fetchImpl(input, init);
	 * }
	 * ```
	 */
	fetchMiddleware?: (context: RequestContext & { fetchImpl: FetchImpl }) => FetchImpl;
}

type MiddlewareRegistries = Required<{
	[Key in keyof Middlewares]: Set<Middlewares[Key]>;
}>;

export const getMiddlewareRegistriesAndKeys = () => {
	const middlewareRegistries: MiddlewareRegistries = {
		fetchMiddleware: new Set(),
	};

	const middlewareRegistryKeys = Object.keys(middlewareRegistries) as Array<keyof Middlewares>;

	return { middlewareRegistries, middlewareRegistryKeys };
};

export const composeMiddlewaresFromArray = (
	middlewareArray: Array<Middlewares[keyof Middlewares] | undefined>
) => {
	let composedMiddleware: Middlewares[keyof Middlewares];

	for (const currentMiddleware of middlewareArray) {
		if (!currentMiddleware) continue;

		const previousMiddleware = composedMiddleware;

		if (!previousMiddleware) {
			composedMiddleware = currentMiddleware;
			continue;
		}

		composedMiddleware = (context) => {
			const prevFetchImpl = previousMiddleware(context);
			const fetchImpl = currentMiddleware({ ...context, fetchImpl: prevFetchImpl });

			return fetchImpl;
		};
	}

	return composedMiddleware;
};
