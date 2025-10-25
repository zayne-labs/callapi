import type { Auth } from "../auth";
import type { fetchSpecificKeys } from "../constants/common";
import type { DedupeOptions } from "../dedupe";
import type { HTTPError } from "../error";
import type { HookConfigOptions, Hooks, HooksOrHooksArray } from "../hooks";
import type { FetchImpl, Middlewares } from "../middlewares";
import type { CallApiPlugin } from "../plugins";
import type { GetCallApiResult, ResponseTypeUnion, ResultModeUnion } from "../result";
import type { RetryOptions } from "../retry";
import type { InitURLOrURLObject, URLOptions } from "../url";
import type {
	BaseCallApiSchemaAndConfig,
	BaseCallApiSchemaRoutes,
	CallApiSchema,
	CallApiSchemaConfig,
} from "../validation";
import type {
	Body,
	GetCurrentRouteSchema,
	GlobalMeta,
	HeadersOption,
	InferExtraOptions,
	InferPluginOptions,
	InferRequestOptions,
	MethodUnion,
	ResultModeOption,
	ThrowOnErrorOption,
	ThrowOnErrorType,
	ThrowOnErrorUnion,
} from "./conditional-types";
import type { DefaultDataType, DefaultPluginArray, DefaultThrowOnError } from "./default-types";
import type { Awaitable, Prettify, Writeable } from "./type-helpers";

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

type SharedExtraOptions<
	TData = DefaultDataType,
	TErrorData = DefaultDataType,
	TResultMode extends ResultModeUnion = ResultModeUnion,
	TThrowOnError extends ThrowOnErrorUnion = DefaultThrowOnError,
	TResponseType extends ResponseTypeUnion = ResponseTypeUnion,
	TPluginArray extends CallApiPlugin[] = DefaultPluginArray,
> = DedupeOptions
	& HookConfigOptions
	& HooksOrHooksArray<TData, TErrorData, Partial<InferPluginOptions<TPluginArray>>>
	& Middlewares
	& Partial<InferPluginOptions<TPluginArray>>
	& ResultModeOption<TErrorData, TResultMode>
	& RetryOptions<TErrorData>
	& ThrowOnErrorOption<TErrorData, TThrowOnError>
	& URLOptions & {
		/**
		 * Automatically add an Authorization header value.
		 *
		 * Supports multiple authentication patterns:
		 * - String: Direct authorization header value
		 * - Auth object: Structured authentication configuration
		 *
		 * ```
		 */
		auth?: Auth;

		/**
		 * Custom function to serialize request body objects into strings.
		 *
		 * Useful for custom serialization formats or when the default JSON
		 * serialization doesn't meet your needs.
		 *
		 * @example
		 * ```ts
		 * // Custom form data serialization
		 * bodySerializer: (data) => {
		 *   const formData = new URLSearchParams();
		 *   Object.entries(data).forEach(([key, value]) => {
		 *     formData.append(key, String(value));
		 *   });
		 *   return formData.toString();
		 * }
		 *
		 * // XML serialization
		 * bodySerializer: (data) => {
		 *   return `<request>${Object.entries(data)
		 *     .map(([key, value]) => `<${key}>${value}</${key}>`)
		 *     .join('')}</request>`;
		 * }
		 *
		 * // Custom JSON with specific formatting
		 * bodySerializer: (data) => JSON.stringify(data, null, 2)
		 * ```
		 */
		bodySerializer?: (bodyData: Record<string, unknown>) => string;

		/**
		 * Whether to clone the response so it can be read multiple times.
		 *
		 * By default, response streams can only be consumed once. Enable this when you need
		 * to read the response in multiple places (e.g., in hooks and main code).
		 *
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/Response/clone
		 * @default false
		 */
		cloneResponse?: boolean;

		/**
		 * Custom fetch implementation to replace the default fetch function.
		 *
		 * Useful for testing, adding custom behavior, or using alternative HTTP clients
		 * that implement the fetch API interface.
		 *
		 * @example
		 * ```ts
		 * // Use node-fetch in Node.js environments
		 * import fetch from 'node-fetch';
		 *
		 * // Mock fetch for testing
		 * customFetchImpl: async (url, init) => {
		 *   return new Response(JSON.stringify({ mocked: true }), {
		 *     status: 200,
		 *     headers: { 'Content-Type': 'application/json' }
		 *   });
		 * }
		 *
		 * // Add custom logging to all requests
		 * customFetchImpl: async (url, init) => {
		 *   console.log(`Fetching: ${url}`);
		 *   const response = await fetch(url, init);
		 *   console.log(`Response: ${response.status}`);
		 *   return response;
		 * }
		 *
		 * // Use with custom HTTP client
		 * customFetchImpl: async (url, init) => {
		 *   // Convert to your preferred HTTP client format
		 *   return await customHttpClient.request({
		 *     url: url.toString(),
		 *     method: init?.method || 'GET',
		 *     headers: init?.headers,
		 *     body: init?.body
		 *   });
		 * }
		 * ```
		 */
		customFetchImpl?: FetchImpl;

		/**
		 * Default HTTP error message when server doesn't provide one.
		 *
		 * Can be a static string or a function that receives error context
		 * to generate dynamic error messages based on the response.
		 *
		 * @default "Failed to fetch data from server!"
		 *
		 * @example
		 * ```ts
		 * // Static error message
		 * defaultHTTPErrorMessage: "API request failed. Please try again."
		 *
		 * // Dynamic error message based on status code
		 * defaultHTTPErrorMessage: ({ response }) => {
		 *   switch (response.status) {
		 *     case 401: return "Authentication required. Please log in.";
		 *     case 403: return "Access denied. Insufficient permissions.";
		 *     case 404: return "Resource not found.";
		 *     case 429: return "Too many requests. Please wait and try again.";
		 *     case 500: return "Server error. Please contact support.";
		 *     default: return `Request failed with status ${response.status}`;
		 *   }
		 * }
		 *
		 * // Include error data in message
		 * defaultHTTPErrorMessage: ({ errorData, response }) => {
		 *   const userMessage = errorData?.message || "Unknown error occurred";
		 *   return `${userMessage} (Status: ${response.status})`;
		 * }
		 * ```
		 */
		defaultHTTPErrorMessage?:
			| string
			| ((context: Pick<HTTPError<TErrorData>, "errorData" | "response">) => string);

		/**
		 * Forces calculation of total byte size from request/response body streams.
		 *
		 * Useful when the Content-Length header is missing or incorrect, and you need
		 * accurate size information for progress tracking or bandwidth monitoring.
		 *
		 * @default false
		 *
		 */
		forcefullyCalculateStreamSize?: boolean | { request?: boolean; response?: boolean };

		/**
		 * Optional metadata field for associating additional information with requests.
		 *
		 * Useful for logging, tracing, or handling specific cases in shared interceptors.
		 * The meta object is passed through to all hooks and can be accessed in error handlers.
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
		 *
		 * // Use case: Request tracking
		 * const result = await callMainApi({
		 *   url: "https://example.com/api/data",
		 *   meta: {
		 *     requestId: generateId(),
		 *     source: "user-dashboard",
		 *     priority: "high"
		 *   }
		 * });
		 *
		 * // Use case: Feature flags
		 * const client = callApi.create({
		 *   baseURL: "https://api.example.com",
		 *   meta: {
		 *     features: ["newUI", "betaFeature"],
		 *     experiment: "variantA"
		 *   }
		 * });
		 * ```
		 */
		meta?: GlobalMeta;

		/**
		 * Custom function to parse response strings into actual value instead of the default response.json().
		 *
		 * Useful when you need custom parsing logic for specific response formats.
		 *
		 * @example
		 * ```ts
		 * responseParser: (responseString) => {
		 *   return JSON.parse(responseString);
		 * }
		 *
		 * // Parse XML responses
		 * responseParser: (responseString) => {
		 *   const parser = new DOMParser();
		 *   const doc = parser.parseFromString(responseString, "text/xml");
		 *   return xmlToObject(doc);
		 * }
		 *
		 * // Parse CSV responses
		 * responseParser: (responseString) => {
		 *   const lines = responseString.split('\n');
		 *   const headers = lines[0].split(',');
		 *   const data = lines.slice(1).map(line => {
		 *     const values = line.split(',');
		 *     return headers.reduce((obj, header, index) => {
		 *       obj[header] = values[index];
		 *       return obj;
		 *     }, {});
		 *   });
		 *   return data;
		 * }
		 *
		 * ```
		 */
		responseParser?: (responseString: string) => Awaitable<TData>;

		/**
		 * Expected response type, determines how the response body is parsed.
		 *
		 * Different response types trigger different parsing methods:
		 * - **"json"**: Parses as JSON using response.json()
		 * - **"text"**: Returns as plain text using response.text()
		 * - **"blob"**: Returns as Blob using response.blob()
		 * - **"arrayBuffer"**: Returns as ArrayBuffer using response.arrayBuffer()
		 * - **"stream"**: Returns the response body stream directly
		 *
		 * @default "json"
		 *
		 * @example
		 * ```ts
		 * // JSON API responses (default)
		 * responseType: "json"
		 *
		 * // Plain text responses
		 * responseType: "text"
		 * // Usage: const csvData = await callApi("/export.csv", { responseType: "text" });
		 *
		 * // File downloads
		 * responseType: "blob"
		 * // Usage: const file = await callApi("/download/file.pdf", { responseType: "blob" });
		 *
		 * // Binary data
		 * responseType: "arrayBuffer"
		 * // Usage: const buffer = await callApi("/binary-data", { responseType: "arrayBuffer" });
		 *
		 * // Streaming responses
		 * responseType: "stream"
		 * // Usage: const stream = await callApi("/large-dataset", { responseType: "stream" });
		 * ```
		 */
		responseType?: TResponseType;

		/**
		 * Controls what data is included in the returned result object.
		 *
		 * Different modes return different combinations of data, error, and response:
		 * - **"all"**: Returns { data, error, response } - complete result information
		 * - **"onlyData"**: Returns only data (null for errors)
		 *
		 * When combined with throwOnError: true, null/error variants are automatically removed:
		 * - **"all" + throwOnError: true**: Returns { data, error: null, response } (error property is null, throws instead)
		 * - **"onlyData" + throwOnError: true**: Returns data (never null, throws on error)
		 *
		 * @default "all"
		 *
		 * @example
		 * ```ts
		 * // Complete result with all information (default)
		 * const { data, error, response } = await callApi("/users", { resultMode: "all" });
		 * if (error) {
		 *   console.error("Request failed:", error);
		 * } else {
		 *   console.log("Users:", data);
		 * }
		 *
		 * // Complete result but throws on errors (throwOnError removes error from type)
		 * try {
		 *   const { data, response } = await callApi("/users", {
		 *     resultMode: "all",
		 *     throwOnError: true
		 *   });
		 *   console.log("Users:", data); // data is never null here
		 * } catch (error) {
		 *   console.error("Request failed:", error);
		 * }
		 *
		 * // Only data, returns null on errors
		 * const users = await callApi("/users", { resultMode: "onlyData" });
		 * if (users) {
		 *   console.log("Users:", users);
		 * } else {
		 *   console.log("Request failed");
		 * }
		 *
		 * // Only data, throws on errors (throwOnError removes null from type)
		 * try {
		 *   const users = await callApi("/users", {
		 *     resultMode: "onlyData",
		 *     throwOnError: true
		 *   });
		 *   console.log("Users:", users); // users is never null here
		 * } catch (error) {
		 *   console.error("Request failed:", error);
		 * }
		 * ```
		 */
		resultMode?: TResultMode;

		/**
		 * Controls whether errors are thrown as exceptions or returned in the result.
		 *
		 * Can be a boolean or a function that receives the error and decides whether to throw.
		 * When true, errors are thrown as exceptions instead of being returned in the result object.
		 *
		 * @default false
		 *
		 * @example
		 * ```ts
		 * // Always throw errors
		 * throwOnError: true
		 * try {
		 *   const data = await callApi("/users");
		 *   console.log("Users:", data);
		 * } catch (error) {
		 *   console.error("Request failed:", error);
		 * }
		 *
		 * // Never throw errors (default)
		 * throwOnError: false
		 * const { data, error } = await callApi("/users");
		 * if (error) {
		 *   console.error("Request failed:", error);
		 * }
		 *
		 * // Conditionally throw based on error type
		 * throwOnError: (error) => {
		 *   // Throw on client errors (4xx) but not server errors (5xx)
		 *   return error.response?.status >= 400 && error.response?.status < 500;
		 * }
		 *
		 * // Throw only on specific status codes
		 * throwOnError: (error) => {
		 *   const criticalErrors = [401, 403, 404];
		 *   return criticalErrors.includes(error.response?.status);
		 * }
		 *
		 * // Throw on validation errors but not network errors
		 * throwOnError: (error) => {
		 *   return error.type === "validation";
		 * }
		 * ```
		 */
		throwOnError?: ThrowOnErrorType<TErrorData, TThrowOnError>;

		/**
		 * Request timeout in milliseconds. Request will be aborted if it takes longer.
		 *
		 * Useful for preventing requests from hanging indefinitely and providing
		 * better user experience with predictable response times.
		 *
		 * @example
		 * ```ts
		 * // 5 second timeout
		 * timeout: 5000
		 *
		 * // Different timeouts for different endpoints
		 * const quickApi = createFetchClient({ timeout: 3000 }); // 3s for fast endpoints
		 * const slowApi = createFetchClient({ timeout: 30000 }); // 30s for slow operations
		 *
		 * // Per-request timeout override
		 * await callApi("/quick-data", { timeout: 1000 });
		 * await callApi("/slow-report", { timeout: 60000 });
		 *
		 * // No timeout (use with caution)
		 * timeout: 0
		 * ```
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
	TBaseSchemaAndConfig extends BaseCallApiSchemaAndConfig = BaseCallApiSchemaAndConfig,
> = SharedExtraOptions<
	TBaseData,
	TBaseErrorData,
	TBaseResultMode,
	TBaseThrowOnError,
	TBaseResponseType,
	TBasePluginArray
> & {
	/**
	 * Array of base CallApi plugins to extend library functionality.
	 *
	 * Base plugins are applied to all instances created from this base configuration
	 * and provide foundational functionality like authentication, logging, or caching.
	 *
	 * @example
	 * ```ts
	 * // Add logging plugin
	 *
	 * // Create base client with common plugins
	 * const callApi = createFetchClient({
	 *   baseURL: "https://api.example.com",
	 *   plugins: [loggerPlugin({ enabled: true })]
	 * });
	 *
	 * // All requests inherit base plugins
	 * await callApi("/users");
	 * await callApi("/posts");
	 *
	 * ```
	 */
	plugins?: TBasePluginArray;

	/**
	 * Base validation schemas for the client configuration.
	 *
	 * Defines validation rules for requests and responses that apply to all
	 * instances created from this base configuration. Provides type safety
	 * and runtime validation for API interactions.
	 */
	schema?: TBaseSchemaAndConfig;

	/**
	 * Controls which configuration parts skip automatic merging between base and instance configs.
	 *
	 * By default, CallApi automatically merges base configuration with instance configuration.
	 * This option allows you to disable automatic merging for specific parts when you need
	 * manual control over how configurations are combined.
	 *
	 * @enum
	 * - **"all"**: Disables automatic merging for both request options and extra options
	 * - **"options"**: Disables automatic merging of extra options only (hooks, plugins, etc.)
	 * - **"request"**: Disables automatic merging of request options only (headers, body, etc.)
	 *
	 * @example
	 * ```ts
	 * // Skip all automatic merging - full manual control
	 * const client = callApi.create((ctx) => ({
	 *   skipAutoMergeFor: "all",
	 *
	 *   // Manually decide what to merge
	 *   baseURL: ctx.options.baseURL, // Keep base URL
	 *   timeout: 5000, // Override timeout
	 *   headers: {
	 *     ...ctx.request.headers, // Merge headers manually
	 *     "X-Custom": "value" // Add custom header
	 *   }
	 * }));
	 *
	 * // Skip options merging - manual plugin/hook control
	 * const client = callApi.create((ctx) => ({
	 *   skipAutoMergeFor: "options",
	 *
	 *   // Manually control which plugins to use
	 *   plugins: [
	 *     ...ctx.options.plugins?.filter(p => p.name !== "unwanted") || [],
	 *     customPlugin
	 *   ],
	 *
	 *   // Request options still auto-merge
	 *   method: "POST"
	 * }));
	 *
	 * // Skip request merging - manual request control
	 * const client = callApi.create((ctx) => ({
	 *   skipAutoMergeFor: "request",
	 *
	 *   // Extra options still auto-merge (plugins, hooks, etc.)
	 *
	 *   // Manually control request options
	 *   headers: {
	 *     "Content-Type": "application/json",
	 *     // Don't merge base headers
	 *   },
	 *   method: ctx.request.method || "GET"
	 * }));
	 *
	 * // Use case: Conditional merging based on request
	 * const client = createFetchClient((ctx) => ({
	 *   skipAutoMergeFor: "options",
	 *
	 *   // Only use auth plugin for protected routes
	 *   plugins: ctx.initURL.includes("/protected/")
	 *     ? [...(ctx.options.plugins || []), authPlugin]
	 *     : ctx.options.plugins?.filter(p => p.name !== "auth") || []
	 * }));
	 * ```
	 */
	skipAutoMergeFor?: "all" | "options" | "request";
};

export type GetBaseSchemaRoutes<TBaseSchemaAndConfig extends BaseCallApiSchemaAndConfig> = Writeable<
	TBaseSchemaAndConfig["routes"],
	"deep"
>;
export type GetBaseSchemaConfig<TBaseSchemaAndConfig extends BaseCallApiSchemaAndConfig> = Writeable<
	NonNullable<TBaseSchemaAndConfig["config"]>,
	"deep"
>;

export type InferExtendSchemaContext<
	TBaseSchemaRoutes extends BaseCallApiSchemaRoutes,
	TCurrentRouteSchemaKey extends string,
> = {
	baseSchemaRoutes: TBaseSchemaRoutes;
	currentRouteSchema: GetCurrentRouteSchema<TBaseSchemaRoutes, TCurrentRouteSchemaKey>;
};

export type InferExtendSchemaConfigContext<TBaseSchemaConfig extends CallApiSchemaConfig> = {
	baseSchemaConfig: TBaseSchemaConfig;
};
export type InferExtendPluginContext<TBasePluginArray extends CallApiPlugin[]> = {
	basePlugins: TBasePluginArray;
};

export type CallApiExtraOptions<
	TData = DefaultDataType,
	TErrorData = DefaultDataType,
	TResultMode extends ResultModeUnion = ResultModeUnion,
	TThrowOnError extends ThrowOnErrorUnion = DefaultThrowOnError,
	TResponseType extends ResponseTypeUnion = ResponseTypeUnion,
	TBasePluginArray extends CallApiPlugin[] = DefaultPluginArray,
	TPluginArray extends CallApiPlugin[] = DefaultPluginArray,
	TBaseSchemaRoutes extends BaseCallApiSchemaRoutes = BaseCallApiSchemaRoutes,
	TSchema extends CallApiSchema = CallApiSchema,
	TBaseSchemaConfig extends CallApiSchemaConfig = CallApiSchemaConfig,
	TSchemaConfig extends CallApiSchemaConfig = CallApiSchemaConfig,
	TCurrentRouteSchemaKey extends string = string,
	TComputedPluginContext = InferExtendPluginContext<TBasePluginArray>,
	TComputedSchemaContext = InferExtendSchemaContext<TBaseSchemaRoutes, TCurrentRouteSchemaKey>,
	TComputedSchemaConfigContext = InferExtendSchemaConfigContext<TBaseSchemaConfig>,
> = SharedExtraOptions<TData, TErrorData, TResultMode, TThrowOnError, TResponseType, TPluginArray> & {
	/**
	 * Array of instance-specific CallApi plugins or a function to configure plugins.
	 *
	 * Instance plugins are added to the base plugins and provide functionality
	 * specific to this particular API instance. Can be a static array or a function
	 * that receives base plugins and returns the instance plugins.
	 *
	 */
	plugins?: TPluginArray | ((context: TComputedPluginContext) => TPluginArray);

	/**
	 * For instance-specific validation schemas
	 *
	 * Defines validation rules specific to this API instance, extending or overriding the base schema.
	 *
	 * Can be a static schema object or a function that receives base schema context and returns instance schemas.
	 *
	 */
	schema?: TSchema | ((context: TComputedSchemaContext) => TSchema);

	/**
	 * Instance-specific schema configuration or a function to configure schema behavior.
	 *
	 * Controls how validation schemas are applied and behave for this specific API instance.
	 * Can override base schema configuration or extend it with instance-specific validation rules.
	 *
	 */
	schemaConfig?: TSchemaConfig | ((context: TComputedSchemaConfigContext) => TSchemaConfig);
};

export type CallApiExtraOptionsForHooks = Hooks & Omit<CallApiExtraOptions, keyof Hooks>;

export type BaseInstanceContext = {
	initURL: string;
	options: CallApiExtraOptions;
	request: CallApiRequestOptions;
};

export type BaseCallApiConfig<
	TBaseData = DefaultDataType,
	TBaseErrorData = DefaultDataType,
	TBaseResultMode extends ResultModeUnion = ResultModeUnion,
	TBaseThrowOnError extends ThrowOnErrorUnion = DefaultThrowOnError,
	TBaseResponseType extends ResponseTypeUnion = ResponseTypeUnion,
	TBaseSchemaAndConfig extends BaseCallApiSchemaAndConfig = BaseCallApiSchemaAndConfig,
	TBasePluginArray extends CallApiPlugin[] = DefaultPluginArray,
	TComputedBaseConfig = BaseCallApiExtraOptions<
		TBaseData,
		TBaseErrorData,
		TBaseResultMode,
		TBaseThrowOnError,
		TBaseResponseType,
		TBasePluginArray,
		TBaseSchemaAndConfig
	>,
> =
	| (CallApiRequestOptions & TComputedBaseConfig)
	| ((context: BaseInstanceContext) => CallApiRequestOptions & TComputedBaseConfig);

export type CallApiConfig<
	TData = DefaultDataType,
	TErrorData = DefaultDataType,
	TResultMode extends ResultModeUnion = ResultModeUnion,
	TThrowOnError extends ThrowOnErrorUnion = DefaultThrowOnError,
	TResponseType extends ResponseTypeUnion = ResponseTypeUnion,
	TBaseSchemaRoutes extends BaseCallApiSchemaRoutes = BaseCallApiSchemaRoutes,
	TSchema extends CallApiSchema = CallApiSchema,
	TBaseSchemaConfig extends CallApiSchemaConfig = CallApiSchemaConfig,
	TSchemaConfig extends CallApiSchemaConfig = CallApiSchemaConfig,
	TInitURL extends InitURLOrURLObject = InitURLOrURLObject,
	TCurrentRouteSchemaKey extends string = string,
	TBasePluginArray extends CallApiPlugin[] = DefaultPluginArray,
	TPluginArray extends CallApiPlugin[] = DefaultPluginArray,
> = InferExtraOptions<TSchema, TBaseSchemaRoutes, TCurrentRouteSchemaKey>
	& InferRequestOptions<TSchema, TInitURL>
	& Omit<
		CallApiExtraOptions<
			TData,
			TErrorData,
			TResultMode,
			TThrowOnError,
			TResponseType,
			TBasePluginArray,
			TPluginArray,
			TBaseSchemaRoutes,
			TSchema,
			TBaseSchemaConfig,
			TSchemaConfig,
			TCurrentRouteSchemaKey
		>,
		keyof InferExtraOptions<CallApiSchema, BaseCallApiSchemaRoutes, string>
	>
	& Omit<CallApiRequestOptions, keyof InferRequestOptions<CallApiSchema, string>>;

export type CallApiParameters<
	TData = DefaultDataType,
	TErrorData = DefaultDataType,
	TResultMode extends ResultModeUnion = ResultModeUnion,
	TThrowOnError extends ThrowOnErrorUnion = DefaultThrowOnError,
	TResponseType extends ResponseTypeUnion = ResponseTypeUnion,
	TBaseSchemaRoutes extends BaseCallApiSchemaRoutes = BaseCallApiSchemaRoutes,
	TSchema extends CallApiSchema = CallApiSchema,
	TBaseSchemaConfig extends CallApiSchemaConfig = CallApiSchemaConfig,
	TSchemaConfig extends CallApiSchemaConfig = CallApiSchemaConfig,
	TInitURL extends InitURLOrURLObject = InitURLOrURLObject,
	TCurrentRouteSchemaKey extends string = string,
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
		TBaseSchemaRoutes,
		TSchema,
		TBaseSchemaConfig,
		TSchemaConfig,
		TInitURL,
		TCurrentRouteSchemaKey,
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
> = GetCallApiResult<TData, TErrorData, TResultMode, TThrowOnError, TResponseType>;
