import { extraOptionDefaults } from "./constants/defaults";
import type { RetryManagerContext } from "./retry";
import type { CallApiExtraOptions, CallApiResultLoose } from "./types/options-types";

export interface RefetchOptions {
	/**
	 * Tracks the number of times the request has already been refetched internally
	 * @internal
	 * @deprecated **WARNING**: This property is used internally to track refetches. Please abstain from reading or modifying it.
	 */
	readonly ["~refetchAttemptCount"]?: number;

	/**
	 * Maximum number of times `refetch()` can re-run the original request.
	 *
	 * Guards against infinite loops, e.g. when a token refresh keeps failing with `401`.
	 * Once the limit is reached, `refetch()` does nothing.
	 * Can be overridden for a single call with `refetch({ maxAttempts })`.
	 *
	 * @default 1
	 */
	refetchAttempts?: number;
}

export type RefetchFnOptions = {
	/**
	 * Overrides the `refetchAttempts` option for this `refetch()` call.
	 */
	maxAttempts?: number;
};

export type RefetchFn = (refetchOptions?: RefetchFnOptions) => void;

export type RefetchManagerResult = {
	handleRefetch: () => Promise<CallApiResultLoose<unknown, unknown>> | null;
	refetch: RefetchFn;
};

export const createRefetchManager = (
	ctx: Pick<RetryManagerContext, "callApi" | "callApiArgs" | "removeDedupeCacheEntry"> & {
		options: CallApiExtraOptions;
	}
): RefetchManagerResult => {
	const { callApi, callApiArgs, options, removeDedupeCacheEntry } = ctx;

	// eslint-disable-next-line ts-eslint/no-deprecated -- Allowed for internal use
	const currentRefetchAttemptCount = options["~refetchAttemptCount"] ?? 0;

	let shouldAttemptRefetch = false;

	const refetch: RefetchManagerResult["refetch"] = (refetchOptions) => {
		const maxRefetchAttempts =
			refetchOptions?.maxAttempts ?? options.refetchAttempts ?? extraOptionDefaults.refetchAttempts;

		if (currentRefetchAttemptCount >= maxRefetchAttempts) return;

		shouldAttemptRefetch = true;
	};

	const handleRefetch: RefetchManagerResult["handleRefetch"] = () => {
		if (!shouldAttemptRefetch) {
			return null;
		}

		removeDedupeCacheEntry();

		return callApi(callApiArgs.initURL, {
			...callApiArgs.config,
			"~refetchAttemptCount": currentRefetchAttemptCount + 1,
		});
	};

	return {
		handleRefetch,
		refetch,
	};
};

export type RefetchFnOption = Pick<ReturnType<typeof createRefetchManager>, "refetch">;
