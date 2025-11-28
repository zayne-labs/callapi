import {
	type CallApiResultErrorVariant,
	type CallApiResultSuccessVariant,
	type ErrorInfo,
	type PossibleHTTPError,
	type PossibleJavaScriptError,
	type PossibleJavaScriptOrValidationError,
	type PossibleValidationError,
	resolveErrorResult,
} from "./result";
import type { StreamProgressEvent } from "./stream";
import type {
	BaseCallApiConfig,
	CallApiConfig,
	CallApiContext,
	CallApiExtraOptionsForHooks,
	CallApiRequestOptionsForHooks,
} from "./types/common";
import type { DefaultCallApiContext } from "./types/default-types";
import type { AnyFunction, Awaitable, Prettify, UnmaskType } from "./types/type-helpers";

export interface Hooks<
	TCallApiContext extends Pick<
		CallApiContext,
		"Data" | "ErrorData" | "InferredPluginOptions" | "Meta"
	> = DefaultCallApiContext,
	TData = TCallApiContext["Data"],
	TErrorData = TCallApiContext["ErrorData"],
> {
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
	onError?: (context: ErrorContext<TCallApiContext, TErrorData>) => Awaitable<unknown>;

	/**
	 * Hook called before the HTTP request is sent and before any internal processing of the request object begins.
	 *
	 * This is the ideal place to modify request headers, add authentication,
	 * implement request logging, or perform any setup before the network call.
	 *
	 * @param context - Request context with mutable request object and configuration
	 * @returns Promise or void - Hook can be async or sync
	 *
	 */
	onRequest?: (context: RequestContext<TCallApiContext>) => Awaitable<unknown>;

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
	onRequestError?: (context: RequestErrorContext<TCallApiContext>) => Awaitable<unknown>;

	/**
	 * Hook called just before the HTTP request is sent and after the request has been processed.
	 *
	 * @param context - Request context with mutable request object and configuration
	 */
	onRequestReady?: (context: RequestContext<TCallApiContext>) => Awaitable<unknown>;

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
	onRequestStream?: (context: RequestStreamContext<TCallApiContext>) => Awaitable<unknown>;

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
	onResponse?: (context: ResponseContext<TCallApiContext, TData, TErrorData>) => Awaitable<unknown>;

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
	onResponseError?: (context: ResponseErrorContext<TCallApiContext, TErrorData>) => Awaitable<unknown>;

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
	onResponseStream?: (context: ResponseStreamContext<TCallApiContext>) => Awaitable<unknown>;

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
	onRetry?: (response: RetryContext<TCallApiContext, TErrorData>) => Awaitable<unknown>;

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
	onSuccess?: (context: SuccessContext<TCallApiContext, TData>) => Awaitable<unknown>;

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
	onValidationError?: (context: ValidationErrorContext<TCallApiContext>) => Awaitable<unknown>;
}

export type HooksOrHooksArray<
	TCallApiContext extends CallApiContext = DefaultCallApiContext,
	TData = TCallApiContext["Data"],
	TErrorData = TCallApiContext["ErrorData"],
> = {
	[Key in keyof Hooks<TCallApiContext, TData, TErrorData>]:
		| Hooks<TCallApiContext, TData, TErrorData>[Key]
		// eslint-disable-next-line perfectionist/sort-union-types -- I need arrays to be last
		| Array<Hooks<TCallApiContext, TData, TErrorData>[Key]>;
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
	 * @default "parallel"
	 */
	hooksExecutionMode?: "parallel" | "sequential";
}

export type RequestContext<
	TCallApiContext extends Pick<CallApiContext, "InferredPluginOptions" | "Meta"> = DefaultCallApiContext,
> = {
	/**
	 * Base configuration object passed to createFetchClient.
	 *
	 * Contains the foundational configuration that applies to all requests
	 * made by this client instance, such as baseURL, default headers, and
	 * global options.
	 */
	baseConfig: Exclude<BaseCallApiConfig, AnyFunction>;

	/**
	 * Instance-specific configuration object passed to the callApi instance.
	 *
	 * Contains configuration specific to this particular API call, which
	 * can override or extend the base configuration.
	 */
	config: CallApiConfig;

	/**
	 * Merged options combining base config, instance config, and default options.
	 *
	 * This is the final resolved configuration that will be used for the request,
	 * with proper precedence applied (instance > base > defaults).
	 */
	options: CallApiExtraOptionsForHooks<TCallApiContext>;

	/**
	 * Merged request object ready to be sent.
	 *
	 * Contains the final request configuration including URL, method, headers,
	 * body, and other fetch options. This object can be modified in onRequest
	 * hooks to customize the outgoing request.
	 */
	request: CallApiRequestOptionsForHooks;
};

export type ValidationErrorContext<
	TCallApiContext extends Pick<CallApiContext, "InferredPluginOptions" | "Meta"> = DefaultCallApiContext,
> = UnmaskType<
	RequestContext<TCallApiContext> & {
		error: PossibleValidationError;
		response: Response | null;
	}
>;

export type SuccessContext<
	TCallApiContext extends Pick<
		CallApiContext,
		"Data" | "InferredPluginOptions" | "Meta"
	> = DefaultCallApiContext,
	TData = TCallApiContext["Data"],
> = UnmaskType<
	RequestContext<TCallApiContext> & {
		data: NoInfer<TData>;
		response: Response;
	}
>;

export type ResponseContext<
	TCallApiContext extends Pick<
		CallApiContext,
		"Data" | "ErrorData" | "InferredPluginOptions" | "Meta"
	> = DefaultCallApiContext,
	TData = TCallApiContext["Data"],
	TErrorData = TCallApiContext["ErrorData"],
> = UnmaskType<
	RequestContext<TCallApiContext>
		& (
			| Prettify<CallApiResultSuccessVariant<TData>>
			| Prettify<
					Extract<CallApiResultErrorVariant<TErrorData>, { error: PossibleHTTPError<TErrorData> }>
			  >
		)
>;

export type RequestErrorContext<
	TCallApiContext extends Pick<CallApiContext, "InferredPluginOptions" | "Meta"> = DefaultCallApiContext,
> = RequestContext<TCallApiContext> & {
	error: PossibleJavaScriptError;
	response: null;
};

export type ErrorContext<
	TCallApiContext extends Pick<
		CallApiContext,
		"ErrorData" | "InferredPluginOptions" | "Meta"
	> = DefaultCallApiContext,
	TErrorData = TCallApiContext["ErrorData"],
> = UnmaskType<
	RequestContext<TCallApiContext>
		& (
			| {
					error: PossibleHTTPError<TErrorData>;
					response: Response;
			  }
			| {
					error: PossibleJavaScriptOrValidationError;
					response: Response | null;
			  }
		)
>;

export type ResponseErrorContext<
	TCallApiContext extends Pick<
		CallApiContext,
		"ErrorData" | "InferredPluginOptions" | "Meta"
	> = DefaultCallApiContext,
	TErrorData = TCallApiContext["ErrorData"],
> = UnmaskType<
	Extract<ErrorContext<TCallApiContext, TErrorData>, { error: PossibleHTTPError<TErrorData> }>
		& RequestContext<TCallApiContext>
>;

export type RetryContext<
	TCallApiContext extends Pick<
		CallApiContext,
		"ErrorData" | "InferredPluginOptions" | "Meta"
	> = DefaultCallApiContext,
	TErrorData = TCallApiContext["ErrorData"],
> = UnmaskType<
	ErrorContext<TCallApiContext, TErrorData> & {
		retryAttemptCount: number;
	}
>;

export type RequestStreamContext<
	TCallApiContext extends Pick<CallApiContext, "InferredPluginOptions" | "Meta"> = DefaultCallApiContext,
> = UnmaskType<
	RequestContext<TCallApiContext> & {
		event: StreamProgressEvent;
		requestInstance: Request;
	}
>;

export type ResponseStreamContext<
	TCallApiContext extends Pick<CallApiContext, "InferredPluginOptions" | "Meta"> = DefaultCallApiContext,
> = UnmaskType<
	RequestContext<TCallApiContext> & {
		event: StreamProgressEvent;
		response: Response;
	}
>;

type HookRegistries = Required<{
	[Key in keyof Hooks]: Set<Hooks[Key]>;
}>;

export const getHookRegistriesAndKeys = () => {
	const hookRegistries: HookRegistries = {
		onError: new Set(),
		onRequest: new Set(),
		onRequestError: new Set(),
		onRequestReady: new Set(),
		onRequestStream: new Set(),
		onResponse: new Set(),
		onResponseError: new Set(),
		onResponseStream: new Set(),
		onRetry: new Set(),
		onSuccess: new Set(),
		onValidationError: new Set(),
	};

	const hookRegistryKeys = Object.keys(hookRegistries) as Array<keyof Hooks>;

	return { hookRegistries, hookRegistryKeys };
};

export const composeHooksFromArray = (
	hooksArray: Array<Hooks[keyof Hooks] | undefined>,
	hooksExecutionMode: CallApiExtraOptionsForHooks["hooksExecutionMode"]
) => {
	const composedHook = async (ctx: unknown) => {
		switch (hooksExecutionMode) {
			case "parallel": {
				await Promise.all(hooksArray.map((uniqueHook) => uniqueHook?.(ctx as never)));
				break;
			}

			case "sequential": {
				for (const hook of hooksArray) {
					// eslint-disable-next-line no-await-in-loop -- This is necessary in this case
					await hook?.(ctx as never);
				}
				break;
			}

			default: {
				hooksExecutionMode satisfies undefined;
			}
		}
	};

	return composedHook;
};

export const executeHooks = async (...hookResultsOrPromise: Array<Awaitable<unknown>>) => {
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
		if (shouldThrowOnError) {
			throw hookError;
		}

		const { errorResult } = resolveErrorResult(hookError, errorInfo);

		return errorResult;
	}
};
