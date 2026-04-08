import { extraOptionDefaults } from "./constants/defaults";
import type { CallApiImpl } from "./retry";
import type { CallApiConfig, CallApiExtraOptions, CallApiResultLoose } from "./types/common";
import type { InitURLOrURLObject } from "./url";

export interface RefetchOptions {
	/**
	 * Tracks the number of times refetch has been called
	 * @internal
	 * @deprecated **NOTE**: This property is used internally to track refetch calls. Please abstain from modifying it.
	 */
	readonly ["~refetchCount"]?: number;

	/**
	 * Maximum number of times refetch can be called from error hooks.
	 *
	 * Prevents infinite loops when refetch is called repeatedly in error hooks.
	 * When the limit is reached, refetch will throw an error instead of retrying.
	 *
	 * @default 1
	 *
	 * @example
	 * ```ts
	 * // Allow up to 5 refetch attempts
	 * refetchAttempts: 5
	 *
	 * // Disable refetch limit
	 * refetchAttempts: Infinity
	 *
	 * // Strict limit of 1 refetch
	 * refetchAttempts: 1
	 * ```
	 */
	refetchAttempts?: number;
}

export type RefetchFn = (
	overrides?: Pick<RefetchOptions, "refetchAttempts">
) => Promise<CallApiResultLoose<unknown, unknown> | null>;

export interface RefetchFnOption {
	refetch: RefetchFn;
}

export const createRefetchManager = <TCallApi extends CallApiImpl>(ctx: {
	callApi: TCallApi;
	callApiArgs: { config: CallApiConfig; initURL: InitURLOrURLObject };
	options: CallApiExtraOptions;
}): RefetchFnOption => {
	const { callApi, callApiArgs, options } = ctx;

	// eslint-disable-next-line ts-eslint/no-deprecated -- Allowed for internal use
	const currentRefetchCount = options["~refetchCount"] ?? 1;

	const refetch: RefetchFnOption["refetch"] = async (refetchOptionOverrides) => {
		const maxRefetchAttempts =
			refetchOptionOverrides?.refetchAttempts
			?? options.refetchAttempts
			?? extraOptionDefaults.refetchAttempts;

		const shouldRefetch = currentRefetchCount <= maxRefetchAttempts;

		if (!shouldRefetch) {
			const message = `Maximum refetch attempts (${maxRefetchAttempts}) exceeded. This prevents infinite loops. Increase 'maxRefetchAttempts' if needed.`;

			console.error(message);

			return null;
		}

		const updatedConfig = {
			...callApiArgs.config,
			...refetchOptionOverrides,
			"~refetchCount": currentRefetchCount + 1,
		} satisfies CallApiConfig;

		return callApi(callApiArgs.initURL as never, updatedConfig);
	};

	return {
		refetch,
	};
};
