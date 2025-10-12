import { createDedupeStrategy, type GlobalRequestInfoCache, type RequestInfoCache } from "./dedupe";
import { HTTPError } from "./error";
import {
	type ErrorContext,
	type ExecuteHookInfo,
	executeHooks,
	executeHooksInCatchBlock,
	type RetryContext,
	type SuccessContext,
} from "./hooks";
import { type CallApiPlugin, initializePlugins } from "./plugins";
import {
	type ErrorInfo,
	type GetResponseType,
	getCustomizedErrorResult,
	type ResponseTypeUnion,
	type ResultModeUnion,
	resolveErrorResult,
	resolveResponseData,
	resolveSuccessResult,
} from "./result";
import { createRetryStrategy } from "./retry";
import type {
	GetCurrentRouteSchema,
	GetCurrentRouteSchemaKey,
	InferHeadersOption,
	InferInitURL,
	ThrowOnErrorUnion,
} from "./types";
import type {
	BaseCallApiConfig,
	BaseCallApiExtraOptions,
	CallApiExtraOptions,
	CallApiExtraOptionsForHooks,
	CallApiParameters,
	CallApiRequestOptions,
	CallApiRequestOptionsForHooks,
	CallApiResult,
} from "./types/common";
import type { DefaultDataType, DefaultPluginArray, DefaultThrowOnError } from "./types/default-types";
import type { AnyFunction, Writeable } from "./types/type-helpers";
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
	waitFor,
} from "./utils/common";
import { isFunction, isHTTPErrorInstance, isValidationErrorInstance } from "./utils/guards";
import {
	type BaseCallApiSchemaAndConfig,
	type BaseCallApiSchemaRoutes,
	type CallApiSchema,
	type CallApiSchemaConfig,
	handleConfigValidation,
	handleSchemaValidation,
	type InferSchemaOutputResult,
} from "./validation";

const $GlobalRequestInfoCache: GlobalRequestInfoCache = new Map();

export const createFetchClient = <
	TBaseData = DefaultDataType,
	TBaseErrorData = DefaultDataType,
	TBaseResultMode extends ResultModeUnion = ResultModeUnion,
	TBaseThrowOnError extends ThrowOnErrorUnion = DefaultThrowOnError,
	TBaseResponseType extends ResponseTypeUnion = ResponseTypeUnion,
	const TBaseSchemaAndConfig extends BaseCallApiSchemaAndConfig = BaseCallApiSchemaAndConfig,
	const TBasePluginArray extends CallApiPlugin[] = DefaultPluginArray,
	TComputedBaseSchemaConfig extends CallApiSchemaConfig = NonNullable<
		Writeable<TBaseSchemaAndConfig["config"], "deep">
	>,
	TComputedBaseSchemaRoutes extends BaseCallApiSchemaRoutes = Writeable<
		TBaseSchemaAndConfig["routes"],
		"deep"
	>,
>(
	initBaseConfig: BaseCallApiConfig<
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
		TResultMode extends ResultModeUnion = TBaseResultMode,
		TThrowOnError extends ThrowOnErrorUnion = TBaseThrowOnError,
		TResponseType extends ResponseTypeUnion = TBaseResponseType,
		const TSchemaConfig extends CallApiSchemaConfig = TComputedBaseSchemaConfig,
		TInitURL extends InferInitURL<TComputedBaseSchemaRoutes, TSchemaConfig> = InferInitURL<
			TComputedBaseSchemaRoutes,
			TSchemaConfig
		>,
		TCurrentRouteSchemaKey extends GetCurrentRouteSchemaKey<
			TSchemaConfig,
			TInitURL
		> = GetCurrentRouteSchemaKey<TSchemaConfig, TInitURL>,
		const TSchema extends CallApiSchema = GetCurrentRouteSchema<
			TComputedBaseSchemaRoutes,
			TCurrentRouteSchemaKey
		>,
		const TPluginArray extends CallApiPlugin[] = TBasePluginArray,
	>(
		...parameters: CallApiParameters<
			InferSchemaOutputResult<TSchema["data"], GetResponseType<TData, TResponseType>>,
			InferSchemaOutputResult<TSchema["errorData"], GetResponseType<TErrorData, TResponseType>>,
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
		>
	): CallApiResult<
		InferSchemaOutputResult<TSchema["data"], TData>,
		InferSchemaOutputResult<TSchema["errorData"], TErrorData>,
		TResultMode,
		TThrowOnError,
		TResponseType
	> => {
		const [initURLOrURLObject, initConfig = {}] = parameters;

		const [fetchOptions, extraOptions] = splitConfig(initConfig);

		const resolvedBaseConfig =
			isFunction(initBaseConfig) ?
				initBaseConfig({
					initURL: initURLOrURLObject.toString(),
					options: extraOptions,
					request: fetchOptions,
				})
			:	initBaseConfig;

		const baseConfig = resolvedBaseConfig as BaseCallApiExtraOptions & CallApiRequestOptions;
		const config = initConfig as CallApiExtraOptions & CallApiRequestOptions;

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
			headers: {}, // == Making sure headers is always an object

			...baseFetchOptions,
			...(!shouldSkipAutoMergeForRequest && fetchOptions),
		} satisfies CallApiRequestOptions;

		const {
			resolvedCurrentRouteSchemaKey,
			resolvedHooks,
			resolvedInitURL,
			resolvedMiddlewares,
			resolvedOptions,
			resolvedRequestOptions,
		} = await initializePlugins({
			baseConfig,
			config,
			initURL: initURLOrURLObject.toString(),
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

		const timeoutSignal = options.timeout != null ? createTimeoutSignal(options.timeout) : null;

		const combinedSignal = createCombinedSignal(
			resolvedRequestOptions.signal,
			timeoutSignal,
			newFetchController.signal
		);

		const initMethod = getMethod({ initURL: resolvedInitURL, method: resolvedRequestOptions.method });

		const request = {
			...resolvedRequestOptions,

			method: initMethod,
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
				shouldApplySchemaOutput,
			} = await handleConfigValidation({
				baseExtraOptions,
				currentRouteSchemaKey: resolvedCurrentRouteSchemaKey,
				extraOptions,
				options,
				requestOptions: request,
			});

			// == Apply Schema Output for Extra Options
			if (shouldApplySchemaOutput) {
				Object.assign(options, extraOptionsValidationResult);
			}

			// == Apply Schema Output for Request Options
			const validMethod = getMethod({
				initURL: resolvedInitURL,
				method: shouldApplySchemaOutput ? requestOptionsValidationResult?.method : request.method,
			});

			const validBody = getBody({
				body: shouldApplySchemaOutput ? requestOptionsValidationResult?.body : request.body,
				bodySerializer: options.bodySerializer,
			});

			type HeaderFn = Extract<InferHeadersOption<CallApiSchema>["headers"], AnyFunction>;

			const resolvedHeaders =
				isFunction<HeaderFn>(fetchOptions.headers) ?
					fetchOptions.headers({ baseHeaders: baseFetchOptions.headers ?? {} })
				:	(fetchOptions.headers ?? baseFetchOptions.headers);

			const validHeaders = await getHeaders({
				auth: options.auth,
				body: validBody,
				headers: shouldApplySchemaOutput ? requestOptionsValidationResult?.headers : resolvedHeaders,
			});

			Object.assign(request, {
				...(validBody && { body: validBody }),
				...(validHeaders && { headers: validHeaders }),
				...(validMethod && { method: validMethod }),
			});

			await executeHooks(options.onRequestReady?.({ baseConfig, config, options, request }));

			const fetchApi = getFetchImpl(options.customFetchImpl, options.fetchMiddleware);

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
			} satisfies SuccessContext<unknown>;

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

			const { errorDetails, generalErrorResult } = resolveErrorResult(error, errorInfo);

			const errorContext = {
				baseConfig,
				config,
				error: errorDetails.error as never,
				options,
				request,
				response: errorDetails.response as never,
			} satisfies ErrorContext<unknown>;

			const shouldThrowOnError = Boolean(
				isFunction(options.throwOnError) ? options.throwOnError(errorContext) : options.throwOnError
			);

			const hookInfo = {
				errorInfo,
				shouldThrowOnError,
			} satisfies ExecuteHookInfo;

			const handleRetryOrGetErrorResult = async () => {
				const { currentAttemptCount, getDelay, shouldAttemptRetry } =
					createRetryStrategy(errorContext);

				const shouldRetry = await shouldAttemptRetry();

				if (shouldRetry) {
					const retryContext = {
						...errorContext,
						retryAttemptCount: currentAttemptCount,
					} satisfies RetryContext<unknown>;

					const hookError = await executeHooksInCatchBlock(
						[options.onRetry?.(retryContext)],
						hookInfo
					);

					if (hookError) {
						return hookError;
					}

					const delay = getDelay();

					await waitFor(delay);

					const updatedOptions = {
						...config,
						"~retryAttemptCount": currentAttemptCount + 1,
					} satisfies typeof config;

					return callApi(initURLOrURLObject as never, updatedOptions as never) as never;
				}

				if (shouldThrowOnError) {
					throw error;
				}

				return generalErrorResult;
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

export const callApi = createFetchClient();
