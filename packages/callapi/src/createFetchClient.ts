import { createDedupeStrategy, type GlobalRequestInfoCache, type RequestInfoCache } from "./dedupe";
import {
	executeHooks,
	executeHooksInCatchBlock,
	type ErrorContext,
	type ExecuteHookInfo,
	type RequestContext,
	type SuccessContext,
} from "./hooks";
import { initializePlugins, type CallApiPlugin } from "./plugins";
import {
	getCustomizedErrorResult,
	resolveErrorResult,
	resolveResponseData,
	resolveSuccessResult,
	type ErrorInfo,
	type GetResponseType,
	type ResponseTypeType,
	type ResultModeType,
} from "./result";
import { createRetryManager } from "./retry";
import type {
	BaseCallApiConfig,
	CallApiConfig,
	CallApiContext,
	CallApiExtraOptionsForHooks,
	CallApiRequestOptions,
	CallApiRequestOptionsForHooks,
	CallApiResult,
	GetBaseSchemaConfig,
	GetBaseSchemaRoutes,
} from "./types/common";
import type {
	GetCurrentRouteSchema,
	GetCurrentRouteSchemaKey,
	InferInitURL,
	ThrowOnErrorUnion,
} from "./types/conditional-types";
import type {
	DefaultCallApiContext,
	DefaultPluginArray,
	DefaultThrowOnError,
} from "./types/default-types";
import type { AnyFunction } from "./types/type-helpers";
import { getFullAndNormalizedURL } from "./url";
import {
	createCombinedSignal,
	createTimeoutSignal,
	getBody,
	getFetchImpl,
	getHeaders,
	getMethod,
	splitBaseConfig,
	splitConfig,
} from "./utils/common";
import { HTTPError } from "./utils/external/error";
import { isHTTPErrorInstance, isValidationErrorInstance } from "./utils/external/guards";
import { isFunction } from "./utils/guards";
import {
	handleConfigValidation,
	handleSchemaValidation,
	type BaseCallApiSchemaAndConfig,
	type BaseCallApiSchemaRoutes,
	type CallApiSchema,
	type CallApiSchemaConfig,
	type InferSchemaOutput,
} from "./validation";

const $GlobalRequestInfoCache: GlobalRequestInfoCache = new Map();

export const createFetchClientWithContext = <
	TOuterCallApiContext extends CallApiContext = DefaultCallApiContext,
>() => {
	const createFetchClient = <
		TBaseCallApiContext extends CallApiContext = TOuterCallApiContext,
		TBaseData = TBaseCallApiContext["Data"],
		TBaseErrorData = TBaseCallApiContext["ErrorData"],
		TBaseResultMode extends ResultModeType = TBaseCallApiContext["ResultMode"] extends ResultModeType ?
			TBaseCallApiContext["ResultMode"]
		:	DefaultCallApiContext["ResultMode"],
		TBaseThrowOnError extends ThrowOnErrorUnion = DefaultThrowOnError,
		TBaseResponseType extends ResponseTypeType = ResponseTypeType,
		const TBaseSchemaAndConfig extends BaseCallApiSchemaAndConfig = BaseCallApiSchemaAndConfig,
		const TBasePluginArray extends CallApiPlugin[] = DefaultPluginArray,
		TComputedBaseSchemaConfig extends CallApiSchemaConfig = GetBaseSchemaConfig<TBaseSchemaAndConfig>,
		TComputedBaseSchemaRoutes extends BaseCallApiSchemaRoutes =
			GetBaseSchemaRoutes<TBaseSchemaAndConfig>,
	>(
		initBaseConfig: BaseCallApiConfig<
			TBaseCallApiContext,
			TBaseData,
			TBaseErrorData,
			TBaseResultMode,
			TBaseThrowOnError,
			TBaseResponseType,
			TBaseSchemaAndConfig,
			TBasePluginArray
		> = {} as never
	) => {
		const $LocalRequestInfoCache: RequestInfoCache = new Map();

		const callApi = async <
			TData = TBaseData,
			TErrorData = TBaseErrorData,
			TResultMode extends ResultModeType = TBaseResultMode,
			TCallApiContext extends CallApiContext = TBaseCallApiContext,
			TThrowOnError extends ThrowOnErrorUnion = TBaseThrowOnError,
			TResponseType extends ResponseTypeType = TBaseResponseType,
			const TSchemaConfig extends CallApiSchemaConfig = TComputedBaseSchemaConfig,
			TInitURL extends InferInitURL<TComputedBaseSchemaRoutes, TSchemaConfig> = InferInitURL<
				TComputedBaseSchemaRoutes,
				TSchemaConfig
			>,
			TCurrentRouteSchemaKey extends GetCurrentRouteSchemaKey<TSchemaConfig, TInitURL> =
				GetCurrentRouteSchemaKey<TSchemaConfig, TInitURL>,
			const TSchema extends CallApiSchema = GetCurrentRouteSchema<
				TComputedBaseSchemaRoutes,
				TCurrentRouteSchemaKey
			>,
			const TPluginArray extends CallApiPlugin[] = TBasePluginArray,
			TComputedData = InferSchemaOutput<TSchema["data"], GetResponseType<TData, TResponseType>>,
			TComputedErrorData = InferSchemaOutput<
				TSchema["errorData"],
				GetResponseType<TErrorData, TResponseType>
			>,
			TComputedResult = CallApiResult<TComputedData, TComputedErrorData, TResultMode, TThrowOnError>,
		>(
			initURL: TInitURL,
			initConfig: CallApiConfig<
				TCallApiContext,
				TComputedData,
				TComputedErrorData,
				TResultMode,
				TThrowOnError,
				TResponseType,
				TComputedBaseSchemaRoutes,
				TSchema,
				TComputedBaseSchemaConfig,
				TSchemaConfig,
				TInitURL,
				TCurrentRouteSchemaKey,
				TBasePluginArray,
				TPluginArray
			> = {} as never
		): Promise<TComputedResult> => {
			const [fetchOptions, extraOptions] = splitConfig(initConfig);

			const resolvedBaseConfig =
				isFunction(initBaseConfig) ?
					initBaseConfig({
						initURL: initURL.toString(),
						options: extraOptions,
						request: fetchOptions,
					})
				:	initBaseConfig;

			const baseConfig = resolvedBaseConfig as Exclude<BaseCallApiConfig, AnyFunction>;
			const config = initConfig as CallApiConfig;

			const [baseFetchOptions, baseExtraOptions] = splitBaseConfig(baseConfig);

			const shouldSkipAutoMergeForOptions =
				baseExtraOptions.skipAutoMergeFor === "all" || baseExtraOptions.skipAutoMergeFor === "options";

			const shouldSkipAutoMergeForRequest =
				baseExtraOptions.skipAutoMergeFor === "all" || baseExtraOptions.skipAutoMergeFor === "request";

			// == Merged Extra Options
			const mergedExtraOptions = {
				...baseExtraOptions,
				...(!shouldSkipAutoMergeForOptions && extraOptions),
			};

			// == Merged Request Options
			const mergedRequestOptions = {
				...baseFetchOptions,
				...(!shouldSkipAutoMergeForRequest && fetchOptions),
			} satisfies CallApiRequestOptions;

			const {
				resolvedCurrentRouteSchemaKey,
				resolvedHooks,
				resolvedInitURL,
				resolvedMiddlewares,
				resolvedOptions,
				resolvedRequest,
			} = await initializePlugins({
				baseConfig,
				config,
				initURL: initURL.toString(),
				options: mergedExtraOptions as CallApiExtraOptionsForHooks,
				request: mergedRequestOptions as CallApiRequestOptionsForHooks,
			});

			const { fullURL, normalizedInitURL } = getFullAndNormalizedURL({
				baseURL: resolvedOptions.baseURL,
				initURL: resolvedInitURL,
				params: resolvedOptions.params,
				query: resolvedOptions.query,
			});

			const options = {
				...resolvedOptions,
				...resolvedHooks,
				...resolvedMiddlewares,

				fullURL,
				initURL: resolvedInitURL,
				initURLNormalized: normalizedInitURL,
			} satisfies CallApiExtraOptionsForHooks;

			const newFetchController = new AbortController();

			const timeoutSignal = createTimeoutSignal(options.timeout);

			const combinedSignal = createCombinedSignal(
				timeoutSignal,
				resolvedRequest.signal,
				newFetchController.signal
			);

			const request = {
				...resolvedRequest,

				signal: combinedSignal,
			} satisfies CallApiRequestOptionsForHooks;

			const {
				getAbortErrorMessage,
				handleRequestCancelStrategy,
				handleRequestDeferStrategy,
				removeDedupeKeyFromCache,
				resolvedDedupeStrategy,
			} = await createDedupeStrategy({
				$GlobalRequestInfoCache,
				$LocalRequestInfoCache,
				baseConfig,
				config,
				newFetchController,
				options,
				request,
			});

			try {
				await handleRequestCancelStrategy();

				await executeHooks(options.onRequest?.({ baseConfig, config, options, request }));

				const {
					extraOptionsValidationResult,
					requestOptionsValidationResult,
					resolvedSchema,
					resolvedSchemaConfig,
				} = await handleConfigValidation({
					baseExtraOptions,
					currentRouteSchemaKey: resolvedCurrentRouteSchemaKey,
					extraOptions,
					options,
					request,
				});

				// == Apply Schema Output for Extra Options
				Object.assign(options, extraOptionsValidationResult);

				// == Apply Schema Output for Request Options
				Object.assign(request, {
					body: getBody({
						body: requestOptionsValidationResult.body,
						bodySerializer: options.bodySerializer,
						resolvedHeaders: requestOptionsValidationResult.headers,
					}),
					headers: await getHeaders({
						auth: options.auth,
						body: requestOptionsValidationResult.body,
						resolvedHeaders: requestOptionsValidationResult.headers,
					}),
					method: getMethod({
						initURL: resolvedInitURL,
						method: requestOptionsValidationResult.method,
					}),
				});

				const readyRequestContext = { baseConfig, config, options, request } satisfies RequestContext;

				await executeHooks(options.onRequestReady?.(readyRequestContext));

				const fetchApi = getFetchImpl({
					customFetchImpl: options.customFetchImpl,
					fetchMiddleware: options.fetchMiddleware,
					requestContext: readyRequestContext,
				});

				const response = await handleRequestDeferStrategy({ fetchApi, options, request });

				// == Also clone response when dedupeStrategy is set to "defer" to avoid error thrown from reading response.(whatever) more than once
				const shouldCloneResponse = resolvedDedupeStrategy === "defer" || options.cloneResponse;

				if (!response.ok) {
					const errorData = await resolveResponseData(
						shouldCloneResponse ? response.clone() : response,
						options.responseType,
						options.responseParser
					);

					const validErrorData = await handleSchemaValidation(resolvedSchema, "errorData", {
						inputValue: errorData,
						response,
						schemaConfig: resolvedSchemaConfig,
					});

					// == Push all error handling responsibilities to the catch block if not retrying
					throw new HTTPError(
						{
							defaultHTTPErrorMessage: options.defaultHTTPErrorMessage,
							errorData: validErrorData,
							response,
						},
						{ cause: validErrorData }
					);
				}

				const successData = await resolveResponseData(
					shouldCloneResponse ? response.clone() : response,
					options.responseType,
					options.responseParser
				);

				const validSuccessData = await handleSchemaValidation(resolvedSchema, "data", {
					inputValue: successData,
					response,
					schemaConfig: resolvedSchemaConfig,
				});

				const successContext = {
					baseConfig,
					config,
					data: validSuccessData,
					options,
					request,
					response,
				} satisfies SuccessContext;

				await executeHooks(
					options.onSuccess?.(successContext),

					options.onResponse?.({ ...successContext, error: null })
				);

				const successResult = resolveSuccessResult(successContext.data, {
					response: successContext.response,
					resultMode: options.resultMode,
				});

				return successResult as never;

				// == Exhaustive Error handling
			} catch (error) {
				const errorInfo = {
					cloneResponse: options.cloneResponse,
					resultMode: options.resultMode,
				} satisfies ErrorInfo;

				const { errorDetails, errorResult } = resolveErrorResult(error, errorInfo);

				const errorContext = {
					baseConfig,
					config,
					error: errorDetails.error as never,
					options,
					request,
					response: errorDetails.response as never,
				} satisfies ErrorContext<{ ErrorData: unknown }>;

				const shouldThrowOnError = Boolean(
					isFunction(options.throwOnError) ? options.throwOnError(errorContext) : options.throwOnError
				);

				const hookInfo = {
					errorInfo,
					shouldThrowOnError,
				} satisfies ExecuteHookInfo;

				const { handleRetry, shouldAttemptRetry } = createRetryManager(errorContext);

				const handleRetryOrGetErrorResult = async () => {
					const shouldRetry = await shouldAttemptRetry();

					if (shouldRetry) {
						return handleRetry({
							callApi,
							callApiArgs: { config, initURL },
							errorContext,
							hookInfo,
						});
					}

					if (shouldThrowOnError) {
						throw error;
					}

					return errorResult;
				};

				if (isValidationErrorInstance(error)) {
					const hookError = await executeHooksInCatchBlock(
						[options.onValidationError?.(errorContext), options.onError?.(errorContext)],
						hookInfo
					);

					return (hookError ?? (await handleRetryOrGetErrorResult())) as never;
				}

				if (isHTTPErrorInstance<TErrorData>(error)) {
					const hookError = await executeHooksInCatchBlock(
						[
							options.onResponseError?.(errorContext),
							options.onError?.(errorContext),
							options.onResponse?.({ ...errorContext, data: null }),
						],
						hookInfo
					);

					return (hookError ?? (await handleRetryOrGetErrorResult())) as never;
				}

				let message = (error as Error | undefined)?.message;

				if (error instanceof DOMException && error.name === "AbortError") {
					message = getAbortErrorMessage();

					!shouldThrowOnError && console.error(`${error.name}:`, message);
				}

				if (error instanceof DOMException && error.name === "TimeoutError") {
					message = `Request timed out after ${options.timeout}ms`;

					!shouldThrowOnError && console.error(`${error.name}:`, message);
				}

				const hookError = await executeHooksInCatchBlock(
					[options.onRequestError?.(errorContext), options.onError?.(errorContext)],
					hookInfo
				);

				return (hookError
					?? getCustomizedErrorResult(await handleRetryOrGetErrorResult(), { message })) as never;

				// == Removing the now unneeded AbortController from store
			} finally {
				removeDedupeKeyFromCache();
			}
		};

		return callApi;
	};

	return createFetchClient;
};

export const createFetchClient = createFetchClientWithContext();

export const callApi = createFetchClient();
