import { extraOptionDefaults } from "./constants/defaults";
import {
	executeHooksInCatchBlock,
	type ErrorContext,
	type ExecuteHookInfo,
	type RetryContext,
} from "./hooks";
import type { CallApiResultErrorVariant } from "./result";
import type { CallApiConfig } from "./types/common";
import type { MethodUnion } from "./types/conditional-types";
import { defineEnum, type AnyNumber, type Awaitable, type UnmaskType } from "./types/type-helpers";
import type { InitURLOrURLObject } from "./url";
import { waitFor } from "./utils/common";
import { isBoolean, isFunction, isString } from "./utils/guards";

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

export interface RetryOptions<TErrorData> {
	/**
	 * Keeps track of the number of times the request has already been retried
	 * @internal
	 * @deprecated **NOTE**: This property is used internally to track retries. Please abstain from modifying it.
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

const getLinearDelay = (currentAttemptCount: number, options: RetryOptions<unknown>) => {
	const retryDelay = options.retryDelay ?? extraOptionDefaults.retryDelay;

	const resolveRetryDelay = isFunction(retryDelay) ? retryDelay(currentAttemptCount) : retryDelay;

	return resolveRetryDelay;
};

const getExponentialDelay = (currentAttemptCount: number, options: RetryOptions<unknown>) => {
	const retryDelay = options.retryDelay ?? extraOptionDefaults.retryDelay;

	const resolvedRetryDelay = isFunction(retryDelay) ? retryDelay(currentAttemptCount) : retryDelay;

	const maxDelay = options.retryMaxDelay ?? extraOptionDefaults.retryMaxDelay;

	const exponentialDelay = resolvedRetryDelay * 2 ** currentAttemptCount;

	return Math.min(exponentialDelay, maxDelay);
};

type CallApiImpl = (initURL: never, init?: CallApiConfig) => Promise<CallApiResultErrorVariant<unknown>>;

export const createRetryManager = <TCallApi extends CallApiImpl>(ctx: {
	callApi: TCallApi;
	callApiArgs: { config: CallApiConfig; initURL: InitURLOrURLObject };
	error: unknown;
	errorContext: ErrorContext;
	errorResult: CallApiResultErrorVariant<unknown> | null;
	hookInfo: ExecuteHookInfo;
}) => {
	const { callApi, callApiArgs, error, errorContext, errorResult, hookInfo } = ctx;

	const { options, request } = errorContext;

	// eslint-disable-next-line ts-eslint/no-deprecated -- Allowed for internal use
	const currentAttemptCount = options["~retryAttemptCount"] ?? 1;

	const retryStrategy = options.retryStrategy ?? extraOptionDefaults.retryStrategy;

	const getDelay = () => {
		switch (retryStrategy) {
			case "exponential": {
				return getExponentialDelay(currentAttemptCount, options);
			}
			case "linear": {
				return getLinearDelay(currentAttemptCount, options);
			}
			default: {
				throw new Error(`Invalid retry strategy: ${String(retryStrategy)}`);
			}
		}
	};

	const shouldAttemptRetry = async () => {
		if (isBoolean(request.signal) && request.signal.aborted) {
			return false;
		}

		const retryCondition = options.retryCondition ?? extraOptionDefaults.retryCondition;

		const maximumRetryAttempts = options.retryAttempts ?? extraOptionDefaults.retryAttempts;

		const customRetryCondition = await retryCondition(errorContext);

		const baseShouldRetry = currentAttemptCount <= maximumRetryAttempts && customRetryCondition;

		if (!baseShouldRetry) {
			return false;
		}

		const retryMethods = new Set(options.retryMethods ?? extraOptionDefaults.retryMethods);

		const includesMethod =
			isString(request.method) && retryMethods.size > 0 ? retryMethods.has(request.method) : true;

		const retryStatusCodes = new Set(options.retryStatusCodes ?? extraOptionDefaults.retryStatusCodes);

		const includesStatusCodes =
			errorContext.response != null && retryStatusCodes.size > 0 ?
				retryStatusCodes.has(errorContext.response.status)
			:	true;

		const shouldRetry = includesMethod && includesStatusCodes;

		return shouldRetry;
	};

	const handleRetry = async () => {
		const retryContext = {
			...errorContext,
			retryAttemptCount: currentAttemptCount,
		} satisfies RetryContext<{ ErrorData: unknown }>;

		const hookError = await executeHooksInCatchBlock([options.onRetry?.(retryContext)], hookInfo);

		if (hookError) {
			return hookError;
		}

		await waitFor(getDelay());

		const updatedConfig = {
			...callApiArgs.config,
			"~retryAttemptCount": currentAttemptCount + 1,
		} satisfies CallApiConfig;

		return callApi(callApiArgs.initURL as never, updatedConfig);
	};

	const handleRetryOrGetErrorResult = async () => {
		const shouldRetry = await shouldAttemptRetry();

		if (shouldRetry) {
			const callApiRetryResult = handleRetry();

			return callApiRetryResult;
		}

		if (hookInfo.shouldThrowOnError) {
			throw error;
		}

		return errorResult;
	};

	return {
		handleRetryOrGetErrorResult,
	};
};
