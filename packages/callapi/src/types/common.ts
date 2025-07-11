import type { Auth } from "../auth";
import type { fetchSpecificKeys } from "../constants/common";
import type { DedupeOptions } from "../dedupe";
import type { HTTPError } from "../error";
import type { Hooks, HooksOrHooksArray } from "../hooks";
import type { CallApiPlugin } from "../plugins";
import type { GetCallApiResult, ResponseTypeUnion, ResultModeUnion } from "../result";
import type { RetryOptions } from "../retry";
import type { URLOptions } from "../url";
import type { BaseCallApiSchema, CallApiSchema, CallApiSchemaConfig } from "../validation";
import type {
	Body,
	GetCurrentRouteSchema,
	GlobalMeta,
	HeadersOption,
	InferExtraOptions,
	InferInitURL,
	InferPluginOptions,
	InferRequestOptions,
	MethodUnion,
	ResultModeOption,
	ThrowOnErrorOption,
	ThrowOnErrorUnion,
} from "./conditional-types";
import type { DefaultDataType, DefaultPluginArray, DefaultThrowOnError } from "./default-types";
import type { Awaitable, Prettify, UnmaskType, Writeable } from "./type-helpers";

type FetchSpecificKeysUnion = Exclude<(typeof fetchSpecificKeys)[number], "body" | "headers" | "method">;

export type ModifiedRequestInit = RequestInit & { duplex?: "half" };

export type CallApiRequestOptions = Prettify<
	{
		/**
		 * Body of the request, can be a object or any other supported body type.
		 */
		body?: Body;
		/**
		 * Headers to be used in the request.
		 */
		headers?: HeadersOption;
		/**
		 * HTTP method for the request.
		 * @default "GET"
		 */
		method?: MethodUnion;
		// eslint-disable-next-line perfectionist/sort-intersection-types -- Allow
	} & Pick<ModifiedRequestInit, FetchSpecificKeysUnion>
>;

export type CallApiRequestOptionsForHooks = Omit<CallApiRequestOptions, "headers"> & {
	headers: Record<string, string | undefined>;
};

type FetchImpl = UnmaskType<(input: string | Request | URL, init?: RequestInit) => Promise<Response>>;

type SharedExtraOptions<
	TData = DefaultDataType,
	TErrorData = DefaultDataType,
	TResultMode extends ResultModeUnion = ResultModeUnion,
	TThrowOnError extends ThrowOnErrorUnion = DefaultThrowOnError,
	TResponseType extends ResponseTypeUnion = ResponseTypeUnion,
	TPluginArray extends CallApiPlugin[] = DefaultPluginArray,
> = DedupeOptions
	& HooksOrHooksArray<TData, TErrorData, Partial<InferPluginOptions<TPluginArray>>>
	& Partial<InferPluginOptions<TPluginArray>>
	& ResultModeOption<TErrorData, TResultMode>
	& RetryOptions<TErrorData>
	& ThrowOnErrorOption<TErrorData, TThrowOnError>
	& URLOptions & {
		/**
		 * Authorization header value.
		 */
		auth?: string | Auth | null;

		/**
		 * Base URL for the request.
		 */
		baseURL?: string;

		/**
		 * Custom function to serialize the body object into a string.
		 */
		bodySerializer?: (bodyData: Record<string, unknown>) => string;

		/**
		 * Whether or not to clone the response, so response.json() and the like can be read again else where.
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/Response/clone
		 * @default false
		 */
		cloneResponse?: boolean;

		/**
		 * Custom fetch implementation
		 */
		customFetchImpl?: FetchImpl;

		/**
		 * Default HTTP error message to use if none is provided from a response.
		 * @default "Failed to fetch data from server!"
		 */
		defaultHTTPErrorMessage?:
			| string
			| ((context: Pick<HTTPError<TErrorData>, "errorData" | "response">) => string);

		/**
		 * If true, forces the calculation of the total byte size from the request or response body, in case the content-length header is not present or is incorrect.
		 * @default false
		 */
		forcefullyCalculateStreamSize?: boolean | { request?: boolean; response?: boolean };

		/**
		 * Defines the mode in which the composed hooks are executed".
		 * - If set to "parallel", main and plugin hooks will be executed in parallel.
		 * - If set to "sequential", the plugin hooks will be executed first, followed by the main hook.
		 * @default "parallel"
		 */
		mergedHooksExecutionMode?: "parallel" | "sequential";

		/**
		 * - Controls what order in which the composed hooks execute
		 * @default "mainHooksAfterPlugins"
		 */
		mergedHooksExecutionOrder?: "mainHooksAfterPlugins" | "mainHooksBeforePlugins";

		/**
		 * - An optional field you can fill with additional information,
		 * to associate with the request, typically used for logging or tracing.
		 *
		 * - A good use case for this, would be to use the info to handle specific cases in any of the shared interceptors.
		 *
		 * @example
		 * ```ts
		 * const callMainApi = callApi.create({
		 * 	baseURL: "https://main-api.com",
		 * 	onResponseError: ({ response, options }) => {
		 * 		if (options.meta?.userId) {
		 * 			console.error(`User ${options.meta.userId} made an error`);
		 * 		}
		 * 	},
		 * });
		 *
		 * const response = await callMainApi({
		 * 	url: "https://example.com/api/data",
		 * 	meta: { userId: "123" },
		 * });
		 * ```
		 */
		meta?: GlobalMeta;

		/**
		 * Custom function to parse the response string
		 */
		responseParser?: (responseString: string) => Awaitable<Record<string, unknown>>;

		/**
		 * Expected response type, affects how response is parsed
		 * @default "json"
		 */
		responseType?: TResponseType;

		/**
		 * Mode of the result, can influence how results are handled or returned.
		 * Can be set to "all" | "onlySuccess" | "onlyError" | "onlyResponse".
		 * @default "all"
		 */
		resultMode?: TResultMode;

		/**
		 * If true or the function returns true, throws errors instead of returning them
		 * The function is passed the error object and can be used to conditionally throw the error
		 * @default false
		 */
		throwOnError?: TThrowOnError;

		/**
		 * Request timeout in milliseconds
		 */
		timeout?: number;
	};

export type BaseCallApiExtraOptions<
	TBaseData = DefaultDataType,
	TBaseErrorData = DefaultDataType,
	TBaseResultMode extends ResultModeUnion = ResultModeUnion,
	TBaseThrowOnError extends ThrowOnErrorUnion = DefaultThrowOnError,
	TBaseResponseType extends ResponseTypeUnion = ResponseTypeUnion,
	TBasePluginArray extends CallApiPlugin[] = DefaultPluginArray,
	TBaseSchema extends BaseCallApiSchema = BaseCallApiSchema,
	TBaseSchemaConfig extends CallApiSchemaConfig = CallApiSchemaConfig,
> = SharedExtraOptions<
	TBaseData,
	TBaseErrorData,
	TBaseResultMode,
	TBaseThrowOnError,
	TBaseResponseType,
	TBasePluginArray
> & {
	/**
	 * An array of base callApi plugins. It allows you to extend the behavior of the library.
	 */
	plugins?: TBasePluginArray;

	/**
	 * Base schemas for the client.
	 */
	schema?: Writeable<TBaseSchema, "deep">;

	/**
	 * Schema Configuration
	 */
	schemaConfig?: Writeable<TBaseSchemaConfig, "deep">;

	/**
	 * Specifies which configuration parts should skip automatic merging between base and main configs.
	 * Use this when you need manual control over how configs are combined.
	 *
	 * @enum
	 * - `"all"` - Disables automatic merging for both request and options
	 * - `"options"` - Disables automatic merging of options only
	 * - `"request"` - Disables automatic merging of request only
	 *
	 * **Example**
	 *
	 * ```ts
	 * const client = createFetchClient((ctx) => ({
	 *   skipAutoMergeFor: "options",
	 *
	 *   // Now you can manually merge options in your config function
	 *   ...ctx.options,
	 * }));
	 * ```
	 */
	skipAutoMergeFor?: "all" | "options" | "request";
};

export type CallApiExtraOptions<
	TData = DefaultDataType,
	TErrorData = DefaultDataType,
	TResultMode extends ResultModeUnion = ResultModeUnion,
	TThrowOnError extends ThrowOnErrorUnion = DefaultThrowOnError,
	TResponseType extends ResponseTypeUnion = ResponseTypeUnion,
	TBasePluginArray extends CallApiPlugin[] = DefaultPluginArray,
	TPluginArray extends CallApiPlugin[] = DefaultPluginArray,
	TBaseSchema extends BaseCallApiSchema = BaseCallApiSchema,
	TSchema extends CallApiSchema = CallApiSchema,
	TBaseSchemaConfig extends CallApiSchemaConfig = CallApiSchemaConfig,
	TSchemaConfig extends CallApiSchemaConfig = CallApiSchemaConfig,
	TCurrentRouteKey extends string = string,
> = SharedExtraOptions<TData, TErrorData, TResultMode, TThrowOnError, TResponseType, TPluginArray> & {
	/**
	 * An array of instance CallApi plugins. It allows you to extend the behavior of the library.
	 */
	plugins?: TPluginArray | ((context: { basePlugins: TBasePluginArray }) => TPluginArray);

	/**
	 * Schemas for the callapi instance
	 */
	schema?:
		| Writeable<TSchema, "deep">
		| ((context: {
				baseSchema: Writeable<TBaseSchema, "deep">;
				currentRouteSchema: GetCurrentRouteSchema<TBaseSchema, TCurrentRouteKey>;
		  }) => Writeable<TSchema, "deep">);

	/**
	 * Schema config for the callapi instance
	 */
	schemaConfig?:
		| Writeable<TSchemaConfig, "deep">
		| ((context: {
				baseSchemaConfig: NonNullable<Writeable<TBaseSchemaConfig, "deep">>;
		  }) => Writeable<TSchemaConfig, "deep">);
};

export type CallApiExtraOptionsForHooks = Hooks & Omit<CallApiExtraOptions, keyof Hooks>;

export type BaseCallApiConfig<
	TBaseData = DefaultDataType,
	TBaseErrorData = DefaultDataType,
	TBaseResultMode extends ResultModeUnion = ResultModeUnion,
	TBaseThrowOnError extends ThrowOnErrorUnion = DefaultThrowOnError,
	TBaseResponseType extends ResponseTypeUnion = ResponseTypeUnion,
	TBaseSchema extends BaseCallApiSchema = BaseCallApiSchema,
	TBaseSchemaConfig extends CallApiSchemaConfig = CallApiSchemaConfig,
	TBasePluginArray extends CallApiPlugin[] = DefaultPluginArray,
> =
	| (CallApiRequestOptions // eslint-disable-next-line perfectionist/sort-intersection-types -- Allow
			& BaseCallApiExtraOptions<
				TBaseData,
				TBaseErrorData,
				TBaseResultMode,
				TBaseThrowOnError,
				TBaseResponseType,
				TBasePluginArray,
				TBaseSchema,
				TBaseSchemaConfig
			>)
	| ((context: {
			initURL: string;
			options: CallApiExtraOptions;
			request: CallApiRequestOptions;
	  }) => CallApiRequestOptions // eslint-disable-next-line perfectionist/sort-intersection-types -- Allow
			& BaseCallApiExtraOptions<
				TBaseData,
				TBaseErrorData,
				TBaseResultMode,
				TBaseThrowOnError,
				TBaseResponseType,
				TBasePluginArray,
				TBaseSchema,
				TBaseSchemaConfig
			>);

export type CallApiConfig<
	TData = DefaultDataType,
	TErrorData = DefaultDataType,
	TResultMode extends ResultModeUnion = ResultModeUnion,
	TThrowOnError extends ThrowOnErrorUnion = DefaultThrowOnError,
	TResponseType extends ResponseTypeUnion = ResponseTypeUnion,
	TBaseSchema extends BaseCallApiSchema = BaseCallApiSchema,
	TSchema extends CallApiSchema = CallApiSchema,
	TBaseSchemaConfig extends CallApiSchemaConfig = CallApiSchemaConfig,
	TSchemaConfig extends CallApiSchemaConfig = CallApiSchemaConfig,
	TInitURL extends InferInitURL<BaseCallApiSchema, TSchemaConfig> = InferInitURL<
		BaseCallApiSchema,
		TSchemaConfig
	>,
	TCurrentRouteKey extends string = string,
	TBasePluginArray extends CallApiPlugin[] = DefaultPluginArray,
	TPluginArray extends CallApiPlugin[] = DefaultPluginArray,
> = InferExtraOptions<TSchema, TBaseSchema, TCurrentRouteKey>
	& InferRequestOptions<TSchema, TSchemaConfig, TInitURL>
	& Omit<
		CallApiExtraOptions<
			TData,
			TErrorData,
			TResultMode,
			TThrowOnError,
			TResponseType,
			TBasePluginArray,
			TPluginArray,
			TBaseSchema,
			TSchema,
			TBaseSchemaConfig,
			TSchemaConfig,
			TCurrentRouteKey
		>,
		keyof InferExtraOptions<CallApiSchema, BaseCallApiSchema, string>
	>
	& Omit<CallApiRequestOptions, keyof InferRequestOptions<CallApiSchema, CallApiSchemaConfig, string>>;

export type CallApiParameters<
	TData = DefaultDataType,
	TErrorData = DefaultDataType,
	TResultMode extends ResultModeUnion = ResultModeUnion,
	TThrowOnError extends ThrowOnErrorUnion = DefaultThrowOnError,
	TResponseType extends ResponseTypeUnion = ResponseTypeUnion,
	TBaseSchema extends BaseCallApiSchema = BaseCallApiSchema,
	TSchema extends CallApiSchema = CallApiSchema,
	TBaseSchemaConfig extends CallApiSchemaConfig = CallApiSchemaConfig,
	TSchemaConfig extends CallApiSchemaConfig = CallApiSchemaConfig,
	TInitURL extends InferInitURL<BaseCallApiSchema, TSchemaConfig> = InferInitURL<
		BaseCallApiSchema,
		TSchemaConfig
	>,
	TCurrentRouteKey extends string = string,
	TBasePluginArray extends CallApiPlugin[] = DefaultPluginArray,
	TPluginArray extends CallApiPlugin[] = DefaultPluginArray,
> = [
	initURL: TInitURL,
	config?: CallApiConfig<
		TData,
		TErrorData,
		TResultMode,
		TThrowOnError,
		TResponseType,
		TBaseSchema,
		TSchema,
		TBaseSchemaConfig,
		TSchemaConfig,
		TInitURL,
		TCurrentRouteKey,
		TBasePluginArray,
		TPluginArray
	>,
];

export type CallApiResult<
	TData,
	TErrorData,
	TResultMode extends ResultModeUnion,
	TThrowOnError extends ThrowOnErrorUnion,
	TResponseType extends ResponseTypeUnion,
> = Promise<GetCallApiResult<TData, TErrorData, TResultMode, TThrowOnError, TResponseType>>;
