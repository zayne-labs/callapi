import type { ValidationError } from "./error";
import {
	type CallApiResultErrorVariant,
	type CallApiResultSuccessVariant,
	type ErrorInfo,
	type PossibleHTTPError,
	type PossibleJavaScriptOrValidationError,
	resolveErrorResult,
} from "./result";
import type { StreamProgressEvent } from "./stream";
import type {
	BaseCallApiExtraOptions,
	CallApiExtraOptions,
	CallApiExtraOptionsForHooks,
	CallApiRequestOptions,
	CallApiRequestOptionsForHooks,
} from "./types/common";
import type { DefaultDataType } from "./types/default-types";
import type { AnyFunction, Awaitable, Prettify, UnmaskType } from "./types/type-helpers";

export type PluginExtraOptions<TPluginOptions = unknown> = {
	/** Plugin-specific options passed to the plugin configuration */
	options: Partial<TPluginOptions>;
};

/* eslint-disable perfectionist/sort-intersection-types -- Plugin options should come last */
export interface Hooks<TData = DefaultDataType, TErrorData = DefaultDataType, TPluginOptions = unknown> {
	/**
	 * Hook called when any error occurs within the request/response lifecycle.
	 *
	 * This is a unified error handler that catches both request errors (network failures,
	 * timeouts, etc.) and response errors (HTTP error status codes). It's essentially
	 * a combination of `onRequestError` and `onResponseError` hooks.
	 *
	 * @param context - Error context containing error details, request info, and response (if available)
	 * @returns Promise or void - Hook can be async or sync
	 */
	onError?: (
		context: ErrorContext<TErrorData> & PluginExtraOptions<TPluginOptions>
	) => Awaitable<unknown>;

	/**
	 * Hook called just before the HTTP request is sent.
	 *
	 * This is the ideal place to modify request headers, add authentication,
	 * implement request logging, or perform any setup before the network call.
	 *
	 * @param context - Request context with mutable request object and configuration
	 * @returns Promise or void - Hook can be async or sync
	 *
	 */
	onRequest?: (context: RequestContext & PluginExtraOptions<TPluginOptions>) => Awaitable<unknown>;

	/**
	 * Hook called when an error occurs during the fetch request itself.
	 *
	 * This handles network-level errors like connection failures, timeouts,
	 * DNS resolution errors, or other issues that prevent getting an HTTP response.
	 * Note that HTTP error status codes (4xx, 5xx) are handled by `onResponseError`.
	 *
	 * @param context - Request error context with error details and null response
	 * @returns Promise or void - Hook can be async or sync
	 */
	onRequestError?: (
		context: RequestErrorContext & PluginExtraOptions<TPluginOptions>
	) => Awaitable<unknown>;

	/**
	 * Hook called during upload stream progress tracking.
	 *
	 * This hook is triggered when uploading data (like file uploads) and provides
	 * progress information about the upload. Useful for implementing progress bars
	 * or upload status indicators.
	 *
	 * @param context - Request stream context with progress event and request instance
	 * @returns Promise or void - Hook can be async or sync
	 *
	 */
	onRequestStream?: (
		context: RequestStreamContext & PluginExtraOptions<TPluginOptions>
	) => Awaitable<unknown>;

	/**
	 * Hook called when any HTTP response is received from the API.
	 *
	 * This hook is triggered for both successful (2xx) and error (4xx, 5xx) responses.
	 * It's useful for response logging, metrics collection, or any processing that
	 * should happen regardless of response status.
	 *
	 * @param context - Response context with either success data or error information
	 * @returns Promise or void - Hook can be async or sync
	 *
	 */
	onResponse?: (
		context: ResponseContext<TData, TErrorData> & PluginExtraOptions<TPluginOptions>
	) => Awaitable<unknown>;

	/**
	 * Hook called when an HTTP error response (4xx, 5xx) is received from the API.
	 *
	 * This handles server-side errors where an HTTP response was successfully received
	 * but indicates an error condition. Different from `onRequestError` which handles
	 * network-level failures.
	 *
	 * @param context - Response error context with HTTP error details and response
	 * @returns Promise or void - Hook can be async or sync
	 */
	onResponseError?: (
		context: ResponseErrorContext<TErrorData> & PluginExtraOptions<TPluginOptions>
	) => Awaitable<unknown>;

	/**
	 * Hook called during download stream progress tracking.
	 *
	 * This hook is triggered when downloading data (like file downloads) and provides
	 * progress information about the download. Useful for implementing progress bars
	 * or download status indicators.
	 *
	 * @param context - Response stream context with progress event and response
	 * @returns Promise or void - Hook can be async or sync
	 *
	 */
	onResponseStream?: (
		context: ResponseStreamContext & PluginExtraOptions<TPluginOptions>
	) => Awaitable<unknown>;

	/**
	 * Hook called when a request is being retried.
	 *
	 * This hook is triggered before each retry attempt, providing information about
	 * the previous failure and the current retry attempt number. Useful for implementing
	 * custom retry logic, exponential backoff, or retry logging.
	 *
	 * @param context - Retry context with error details and retry attempt count
	 * @returns Promise or void - Hook can be async or sync
	 *
	 */
	onRetry?: (
		response: RetryContext<TErrorData> & PluginExtraOptions<TPluginOptions>
	) => Awaitable<unknown>;

	/**
	 * Hook called when a successful response (2xx status) is received from the API.
	 *
	 * This hook is triggered only for successful responses and provides access to
	 * the parsed response data. Ideal for success logging, caching, or post-processing
	 * of successful API responses.
	 *
	 * @param context - Success context with parsed response data and response object
	 * @returns Promise or void - Hook can be async or sync
	 *
	 */
	onSuccess?: (context: SuccessContext<TData> & PluginExtraOptions<TPluginOptions>) => Awaitable<unknown>;

	/**
	 * Hook called when a validation error occurs.
	 *
	 * This hook is triggered when request or response data fails validation against
	 * a defined schema. It provides access to the validation error details and can
	 * be used for custom error handling, logging, or fallback behavior.
	 *
	 * @param context - Validation error context with error details and response (if available)
	 * @returns Promise or void - Hook can be async or sync
	 *
	 */
	onValidationError?: (
		context: ValidationErrorContext & PluginExtraOptions<TPluginOptions>
	) => Awaitable<unknown>;
}
/* eslint-enable perfectionist/sort-intersection-types -- Plugin options should come last */

export type HooksOrHooksArray<
	TData = DefaultDataType,
	TErrorData = DefaultDataType,
	TMoreOptions = unknown,
> = {
	[Key in keyof Hooks<TData, TErrorData, TMoreOptions>]:
		| Hooks<TData, TErrorData, TMoreOptions>[Key]
		// eslint-disable-next-line perfectionist/sort-union-types -- I need arrays to be last
		| Array<Hooks<TData, TErrorData, TMoreOptions>[Key]>;
};

export interface HookConfigOptions {
	/**
	 * Controls the execution mode of all composed hooks (main + plugin hooks).
	 *
	 * - **"parallel"**: All hooks execute simultaneously via Promise.all() for better performance
	 * - **"sequential"**: All hooks execute one by one in registration order via await in a loop
	 *
	 * This affects how ALL hooks execute together, regardless of their source (main or plugin).
	 *
	 * Use `hookRegistrationOrder` to control the registration order of main vs plugin hooks.
	 *
	 * @default "parallel"
	 *
	 * @example
	 * ```ts
	 * // Parallel execution (default) - all hooks run simultaneously
	 * hooksExecutionMode: "parallel"
	 *
	 * // Sequential execution - hooks run one after another
	 * hooksExecutionMode: "sequential"
	 *
	 * // Use case: Hooks have dependencies and must run in order
	 * const client = callApi.create({
	 *   hooksExecutionMode: "sequential",
	 *   hookRegistrationOrder: "mainFirst",
	 *   plugins: [transformPlugin],
	 *   onRequest: (ctx) => {
	 *     // This runs first, then transform plugin runs
	 *     ctx.request.headers["x-request-id"] = generateId();
	 *   }
	 * });
	 *
	 * // Use case: Independent operations can run in parallel for speed
	 * const client = callApi.create({
	 *   hooksExecutionMode: "parallel", // Default
	 *   plugins: [metricsPlugin, cachePlugin, loggingPlugin],
	 *   onRequest: (ctx) => {
	 *     // All hooks (main + plugins) run simultaneously
	 *     addRequestTimestamp(ctx.request);
	 *   }
	 * });
	 *
	 * // Use case: Error handling hooks that need sequential processing
	 * const client = callApi.create({
	 *   hooksExecutionMode: "sequential",
	 *   onError: [
	 *     (ctx) => logError(ctx.error),      // Log first
	 *     (ctx) => reportError(ctx.error),   // Then report
	 *     (ctx) => cleanupResources(ctx)     // Finally cleanup
	 *   ]
	 * });
	 * ```
	 */
	hooksExecutionMode?: "parallel" | "sequential";

	/**
	 * Controls the registration order of main hooks relative to plugin hooks.
	 *
	 * - **"pluginsFirst"**: Plugin hooks register first, then main hooks (default)
	 * - **"mainFirst"**: Main hooks register first, then plugin hooks
	 *
	 * This determines the order hooks are added to the registry, which affects
	 * their execution sequence when using sequential execution mode.
	 *
	 * @default "pluginsFirst"
	 *
	 * @example
	 * ```ts
	 * // Plugin hooks register first (default behavior)
	 * hookRegistrationOrder: "pluginsFirst"
	 *
	 * // Main hooks register first
	 * hookRegistrationOrder: "mainFirst"
	 *
	 * // Use case: Main validation before plugin processing
	 * const client = callApi.create({
	 *   hookRegistrationOrder: "mainFirst",
	 *   hooksExecutionMode: "sequential",
	 *   plugins: [transformPlugin],
	 *   onRequest: (ctx) => {
	 *     // This main hook runs first in sequential mode
	 *     if (!ctx.request.headers.authorization) {
	 *       throw new Error("Authorization required");
	 *     }
	 *   }
	 * });
	 *
	 * // Use case: Plugin setup before main logic (default)
	 * const client = callApi.create({
	 *   hookRegistrationOrder: "pluginsFirst", // Default
	 *   hooksExecutionMode: "sequential",
	 *   plugins: [setupPlugin],
	 *   onRequest: (ctx) => {
	 *     // Plugin runs first, then this main hook
	 *     console.log("Request prepared:", ctx.request.url);
	 *   }
	 * });
	 *
	 * // Use case: Parallel mode (registration order less important)
	 * const client = callApi.create({
	 *   hookRegistrationOrder: "pluginsFirst",
	 *   hooksExecutionMode: "parallel", // All run simultaneously
	 *   plugins: [metricsPlugin, cachePlugin],
	 *   onRequest: (ctx) => {
	 *     // All hooks run in parallel regardless of registration order
	 *     addRequestId(ctx.request);
	 *   }
	 * });
	 * ```
	 */
	hooksRegistrationOrder?: "mainFirst" | "pluginsFirst";
}

export type RequestContext = {
	/**
	 * Base configuration object passed to createFetchClient.
	 *
	 * Contains the foundational configuration that applies to all requests
	 * made by this client instance, such as baseURL, default headers, and
	 * global options.
	 */
	baseConfig: BaseCallApiExtraOptions & CallApiRequestOptions;

	/**
	 * Instance-specific configuration object passed to the callApi instance.
	 *
	 * Contains configuration specific to this particular API call, which
	 * can override or extend the base configuration.
	 */
	config: CallApiExtraOptions & CallApiRequestOptions;

	/**
	 * Merged options combining base config, instance config, and default options.
	 *
	 * This is the final resolved configuration that will be used for the request,
	 * with proper precedence applied (instance > base > defaults).
	 */
	options: CallApiExtraOptionsForHooks;

	/**
	 * Merged request object ready to be sent.
	 *
	 * Contains the final request configuration including URL, method, headers,
	 * body, and other fetch options. This object can be modified in onRequest
	 * hooks to customize the outgoing request.
	 */
	request: CallApiRequestOptionsForHooks;
};

export type ValidationErrorContext = UnmaskType<
	RequestContext & {
		/** Validation error containing details about what failed validation */
		error: ValidationError;
		/** HTTP response object if validation failed on response, null if on request */
		response: Response | null;
	}
>;

export type SuccessContext<TData> = UnmaskType<
	RequestContext & {
		/** Parsed response data with the expected success type */
		data: TData;
		/** HTTP response object for the successful request */
		response: Response;
	}
>;

export type ResponseContext<TData, TErrorData> = UnmaskType<
	RequestContext
		& (
			| Prettify<CallApiResultSuccessVariant<TData>>
			| Prettify<
					Extract<CallApiResultErrorVariant<TErrorData>, { error: PossibleHTTPError<TErrorData> }>
			  >
		)
>;

export type RequestErrorContext = RequestContext & {
	/** Error that occurred during the request (network, timeout, etc.) */
	error: PossibleJavaScriptOrValidationError;
	/** Always null for request errors since no response was received */
	response: null;
};

export type ErrorContext<TErrorData> = UnmaskType<
	RequestContext
		& (
			| {
					/** HTTP error with response data */
					error: PossibleHTTPError<TErrorData>;
					/** HTTP response object containing error status */
					response: Response;
			  }
			| {
					/** Request-level error (network, timeout, validation, etc.) */
					error: PossibleJavaScriptOrValidationError;
					/** Response object if available, null for request errors */
					response: Response | null;
			  }
		)
>;

export type ResponseErrorContext<TErrorData> = UnmaskType<
	Extract<ErrorContext<TErrorData>, { error: PossibleHTTPError<TErrorData> }> & RequestContext
>;

export type RetryContext<TErrorData> = UnmaskType<
	ErrorContext<TErrorData> & {
		/** Current retry attempt number (1-based, so 1 = first retry) */
		retryAttemptCount: number;
	}
>;

export type RequestStreamContext = UnmaskType<
	RequestContext & {
		/** Progress event containing loaded/total bytes information */
		event: StreamProgressEvent;
		/** The actual Request instance being uploaded */
		requestInstance: Request;
	}
>;

export type ResponseStreamContext = UnmaskType<
	RequestContext & {
		/** Progress event containing loaded/total bytes information */
		event: StreamProgressEvent;
		/** HTTP response object being downloaded */
		response: Response;
	}
>;

type HookRegistries = Required<{
	[Key in keyof Hooks]: Set<Hooks[Key]>;
}>;

export const getHookRegistries = (): HookRegistries => {
	return {
		onError: new Set(),
		onRequest: new Set(),
		onRequestError: new Set(),
		onRequestStream: new Set(),
		onResponse: new Set(),
		onResponseError: new Set(),
		onResponseStream: new Set(),
		onRetry: new Set(),
		onSuccess: new Set(),
		onValidationError: new Set(),
	};
};

export const composeAllHooks = (
	hooksArray: Array<AnyFunction | undefined>,
	hooksExecutionMode: CallApiExtraOptionsForHooks["hooksExecutionMode"]
) => {
	const mergedHook = async (ctx: unknown) => {
		switch (hooksExecutionMode) {
			case "parallel": {
				await Promise.all(hooksArray.map((uniqueHook) => uniqueHook?.(ctx)));
				break;
			}

			case "sequential": {
				for (const hook of hooksArray) {
					// eslint-disable-next-line no-await-in-loop -- This is necessary in this case
					await hook?.(ctx);
				}
				break;
			}

			default: {
				hooksExecutionMode satisfies undefined;
			}
		}
	};

	return mergedHook;
};

export const executeHooksInTryBlock = async (...hookResultsOrPromise: Array<Awaitable<unknown>>) => {
	await Promise.all(hookResultsOrPromise);
};

export type ExecuteHookInfo = {
	errorInfo: ErrorInfo;
	shouldThrowOnError: boolean | undefined;
};

export const executeHooksInCatchBlock = async (
	hookResultsOrPromise: Array<Awaitable<unknown>>,
	hookInfo: ExecuteHookInfo
) => {
	const { errorInfo, shouldThrowOnError } = hookInfo;

	try {
		await Promise.all(hookResultsOrPromise);

		return null;
	} catch (hookError) {
		const { generalErrorResult: hookErrorResult } = resolveErrorResult(hookError, errorInfo);

		if (shouldThrowOnError) {
			throw hookError;
		}

		return hookErrorResult;
	}
};
