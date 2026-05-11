import { extraOptionDefaults } from "./constants/defaults";
import { executeHooksInCatchBlock, type ErrorContext, type ExecuteHookInfo } from "./hooks";
import type { MethodUnion } from "./types/conditional-types";
import type { CallApiConfig, CallApiResultLoose } from "./types/options-types";
import { defineEnum, type AnyNumber, type Awaitable, type UnmaskType } from "./types/type-helpers";
import type { InitURLOrURLObject } from "./url";
import { waitFor } from "./utils/common";
import { isFunction } from "./utils/guards";

// eslint-disable-next-line ts-eslint/no-unused-vars -- Ignore
const defaultRetryStatusCodesLookup = () =>
	defineEnum({
		408: "Request Timeout",
		409: "Conflict",
		425: "Too Early",
		429: "Too Many Requests",
		500: "Internal Server Error",
		502: "Bad Gateway",
		503: "Service Unavailable",
		504: "Gateway Timeout",
	});

type RetryStatusCodes = UnmaskType<AnyNumber | keyof ReturnType<typeof defaultRetryStatusCodesLookup>>;

type RetryCondition<TErrorData> = (context: ErrorContext<{ ErrorData: TErrorData }>) => Awaitable<boolean>;

export const retryAttemptCountSymbol = Symbol("retryAttemptCount");

export type CallApiLooseImpl = (
	initURL: InitURLOrURLObject,
	init?: CallApiConfig
) => Promise<CallApiResultLoose<unknown, unknown>>;

export interface RetryOptions<TErrorData> {
	/**
	 * Tracks the number of times the request has already been retried internally
	 * @internal
	 * @deprecated **WARNING**: This property is used internally to track retries. Please abstain from reading or modifying it.
	 */
	readonly ["~retryAttemptCount"]?: number;

	/**
	 * Number of allowed retry attempts on HTTP errors
	 * @default 0
	 */
	retryAttempts?: number;

	/**
	 * Callback whose return value determines if a request should be retried or not
	 */
	retryCondition?: RetryCondition<TErrorData>;

	/**
	 * Delay between retries in milliseconds
	 * @default 1000
	 */
	retryDelay?: number | ((currentAttemptCount: number) => number);

	/**
	 * Maximum delay in milliseconds. Only applies to exponential strategy
	 * @default 10000
	 */
	retryMaxDelay?: number;

	/**
	 * HTTP methods that are allowed to retry
	 * @default ["GET", "POST"]
	 */
	retryMethods?: MethodUnion[];

	/**
	 * HTTP status codes that trigger a retry
	 */
	retryStatusCodes?: RetryStatusCodes[];

	/**
	 * Strategy to use when retrying
	 * @default "linear"
	 */
	retryStrategy?: "exponential" | "linear";
}

export type RetryManagerContext = {
	callApi: CallApiLooseImpl;
	callApiArgs: {
		config: CallApiConfig;
		initURL: InitURLOrURLObject;
	};
	error: unknown;
	errorContext: ErrorContext;
	hookInfo: ExecuteHookInfo;
	removeDedupeCacheEntry: () => void;
};

export const createRetryManager = (ctx: RetryManagerContext) => {
	const { callApi, callApiArgs, error, errorContext, hookInfo, removeDedupeCacheEntry } = ctx;

	const { options, request } = errorContext;

	// eslint-disable-next-line ts-eslint/no-deprecated -- Allowed for internal use
	const currentRetryAttemptCount = options["~retryAttemptCount"] ?? 1;

	const shouldAttemptRetry = async () => {
		if (request.signal?.aborted) {
			return false;
		}

		const maxRetryAttempts = options.retryAttempts ?? extraOptionDefaults.retryAttempts;

		const retryCondition = options.retryCondition ?? extraOptionDefaults.retryCondition;

		const baseShouldAttemptRetry =
			currentRetryAttemptCount <= maxRetryAttempts && (await retryCondition(errorContext));

		if (!baseShouldAttemptRetry) {
			return false;
		}

		const retryMethods = options.retryMethods ?? extraOptionDefaults.retryMethods;

		const includesMethod =
			request.method != null && retryMethods.length > 0 ? retryMethods.includes(request.method) : true;

		const retryStatusCodes = options.retryStatusCodes ?? extraOptionDefaults.retryStatusCodes;

		const includesStatusCodes =
			errorContext.response != null && retryStatusCodes.length > 0 ?
				retryStatusCodes.includes(errorContext.response.status)
			:	true;

		const finalShouldAttemptRetry = includesMethod && includesStatusCodes;

		return finalShouldAttemptRetry;
	};

	const getDelay = () => {
		const retryStrategy = options.retryStrategy ?? extraOptionDefaults.retryStrategy;

		switch (retryStrategy) {
			case "exponential": {
				const retryDelay = options.retryDelay ?? extraOptionDefaults.retryDelay;

				const resolvedRetryDelay =
					isFunction(retryDelay) ? retryDelay(currentRetryAttemptCount) : retryDelay;

				const maxDelay = options.retryMaxDelay ?? extraOptionDefaults.retryMaxDelay;

				const exponentialDelay = resolvedRetryDelay * 2 ** (currentRetryAttemptCount - 1);

				return Math.min(exponentialDelay, maxDelay);
			}
			case "linear": {
				const retryDelay = options.retryDelay ?? extraOptionDefaults.retryDelay;

				const resolveRetryDelay =
					isFunction(retryDelay) ? retryDelay(currentRetryAttemptCount) : retryDelay;

				return resolveRetryDelay;
			}
			default: {
				throw new Error(`Invalid retry strategy: ${String(retryStrategy)}`);
			}
		}
	};

	const handleRetry = async () => {
		if (await shouldAttemptRetry()) {
			const hookError = await executeHooksInCatchBlock(
				[options.onRetry?.({ ...errorContext, retryAttemptCount: currentRetryAttemptCount })],
				hookInfo
			);

			if (hookError) {
				return hookError;
			}

			await waitFor(getDelay());

			removeDedupeCacheEntry();

			return callApi(callApiArgs.initURL, {
				...callApiArgs.config,
				"~retryAttemptCount": currentRetryAttemptCount + 1,
			});
		}

		if (hookInfo.shouldThrowOnError) {
			throw error;
		}

		return null;
	};

	return {
		handleRetry,
	};
};
