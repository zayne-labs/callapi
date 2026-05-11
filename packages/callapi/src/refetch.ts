import type { RetryManagerContext } from "./retry";
import type { CallApiExtraOptions, CallApiResultLoose } from "./types/options-types";

const shouldAttemptRefetchSymbol = Symbol("shouldAttemptRefetch");

export interface RefetchOptions {
	/**
	 * Tracks if the refetching of the request should be attempted
	 * @internal
	 * @deprecated **WARNING**: This property is used internally to track retries. Please abstain from reading or modifying it.
	 */
	[shouldAttemptRefetchSymbol]?: boolean;
}

export type RefetchFn = () => void;

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

	const shouldAttemptRefetch = () => {
		const baseShouldRefetch = options[shouldAttemptRefetchSymbol] ?? false;

		return baseShouldRefetch;
	};

	const refetch: RefetchManagerResult["refetch"] = () => {
		options[shouldAttemptRefetchSymbol] = true;
	};

	const handleRefetch: RefetchManagerResult["handleRefetch"] = () => {
		if (shouldAttemptRefetch()) {
			removeDedupeCacheEntry();

			return callApi(callApiArgs.initURL, {
				...callApiArgs.config,
				[shouldAttemptRefetchSymbol]: false,
			});
		}

		return null;
	};

	return {
		handleRefetch,
		refetch,
	};
};

export type RefetchFnOption = Pick<ReturnType<typeof createRefetchManager>, "refetch">;
