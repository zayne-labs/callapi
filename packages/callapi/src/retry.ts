import { extraOptionDefaults } from "./constants/default-options";
import type { ErrorContext, RequestContext } from "./hooks";
import type { MethodUnion } from "./types";
import { type AnyNumber, type Awaitable, defineEnum, type UnmaskType } from "./types/type-helpers";
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

type RetryCondition<TErrorData> = (context: ErrorContext<TErrorData>) => Awaitable<boolean>;

type InnerRetryKeys<TErrorData> = Exclude<keyof RetryOptions<TErrorData>, "~retryAttemptCount" | "retry">;

type InnerRetryOptions<TErrorData> = {
	[Key in InnerRetryKeys<TErrorData> as Key extends `retry${infer TRest}` ?
		Uncapitalize<TRest> extends "attempts" ?
			never
		:	Uncapitalize<TRest>
	:	Key]?: RetryOptions<TErrorData>[Key];
} & {
	attempts: NonNullable<RetryOptions<TErrorData>["retryAttempts"]>;
};

export interface RetryOptions<TErrorData> {
	/**
	 * Keeps track of the number of times the request has already been retried
	 *
	 * @deprecated **NOTE**: This property is used internally to track retries. Please abstain from modifying it.
	 */
	readonly ["~retryAttemptCount"]?: number;

	/**
	 * All retry options in a single object instead of separate properties
	 */
	retry?: InnerRetryOptions<TErrorData>;

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
	const retryDelay = options.retryDelay ?? options.retry?.delay;

	const resolveRetryDelay =
		(isFunction(retryDelay) ? retryDelay(currentAttemptCount) : retryDelay)
		?? extraOptionDefaults.retryDelay;

	return resolveRetryDelay;
};

const getExponentialDelay = (currentAttemptCount: number, options: RetryOptions<unknown>) => {
	const retryDelay = options.retryDelay ?? options.retry?.delay ?? extraOptionDefaults.retryDelay;

	const resolvedRetryDelay = isFunction(retryDelay) ? retryDelay(currentAttemptCount) : retryDelay;

	const maxDelay = options.retryMaxDelay ?? options.retry?.maxDelay ?? extraOptionDefaults.retryMaxDelay;

	const exponentialDelay = resolvedRetryDelay * 2 ** currentAttemptCount;

	return Math.min(exponentialDelay, maxDelay);
};

export const createRetryStrategy = (ctx: ErrorContext<unknown> & RequestContext) => {
	const { options, request } = ctx;

	// eslint-disable-next-line ts-eslint/no-deprecated -- Allowed for internal use
	const currentAttemptCount = options["~retryAttemptCount"] ?? 1;

	const retryStrategy =
		options.retryStrategy ?? options.retry?.strategy ?? extraOptionDefaults.retryStrategy;

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

		const retryCondition =
			options.retryCondition ?? options.retry?.condition ?? extraOptionDefaults.retryCondition;

		const maximumRetryAttempts =
			options.retryAttempts ?? options.retry?.attempts ?? extraOptionDefaults.retryAttempts;

		const customRetryCondition = await retryCondition(ctx);

		const baseShouldRetry = currentAttemptCount <= maximumRetryAttempts && customRetryCondition;

		if (!baseShouldRetry) {
			return false;
		}

		const retryMethods = new Set(
			options.retryMethods ?? options.retry?.methods ?? extraOptionDefaults.retryMethods
		);

		const includesMethod =
			isString(ctx.request.method) && retryMethods.size > 0 ?
				retryMethods.has(ctx.request.method)
			:	true;

		const retryStatusCodes = new Set(
			options.retryStatusCodes ?? options.retry?.statusCodes ?? extraOptionDefaults.retryStatusCodes
		);

		const includesStatusCodes =
			ctx.response != null && retryStatusCodes.size > 0 ?
				retryStatusCodes.has(ctx.response.status)
			:	true;

		const shouldRetry = includesMethod && includesStatusCodes;

		return shouldRetry;
	};

	return {
		currentAttemptCount,
		getDelay,
		shouldAttemptRetry,
	};
};
