import type { AuthOption } from "../auth";
import type { FallBackRouteSchemaKey } from "../constants/validation";
import type { ErrorContext } from "../hooks";
import type { ResultModeType } from "../result";
import type { AllowedQueryParamValues, AtSymbol, InitURLOrURLObject, Params, Query } from "../url";
import type {
	BaseCallApiSchemaRoutes,
	CallApiSchema,
	CallApiSchemaConfig,
	InferSchemaOutput,
	RouteKeyMethods,
	RouteKeyMethodsURLUnion,
} from "../validation";
import type { CallApiContext } from "./common";
import type {
	AnyString,
	CommonAuthorizationHeaders,
	CommonContentTypes,
	CommonRequestHeaders,
	Prettify,
	RemoveLeadingSlash,
	RemoveTrailingSlash,
	UnmaskType,
	Writeable,
} from "./type-helpers";

/**
 * @description Makes a type partial if the output type of TSchema is not provided or has undefined in the union, otherwise makes it required
 */
type MakeSchemaOptionRequiredIfDefined<TSchemaOption extends CallApiSchema[keyof CallApiSchema], TObject> =
	undefined extends InferSchemaOutput<TSchemaOption, undefined> ? TObject : Required<TObject>;

type MergeBaseWithRouteKey<TBaseURLOrPrefix extends string | undefined, TRouteKey extends string> =
	TBaseURLOrPrefix extends string ?
		TRouteKey extends `${AtSymbol}${infer TMethod extends RouteKeyMethods}/${infer TRestOfRoutKey}` ?
			`${AtSymbol}${TMethod}/${RemoveLeadingSlash<RemoveTrailingSlash<TBaseURLOrPrefix>>}/${RemoveLeadingSlash<TRestOfRoutKey>}`
		:	`${TBaseURLOrPrefix}${TRouteKey}`
	:	TRouteKey;

export type ApplyURLBasedConfig<
	TSchemaConfig extends CallApiSchemaConfig,
	TSchemaRouteKeys extends string,
> =
	TSchemaConfig["prefix"] extends string ?
		MergeBaseWithRouteKey<TSchemaConfig["prefix"], TSchemaRouteKeys>
	: TSchemaConfig["baseURL"] extends string ?
		MergeBaseWithRouteKey<TSchemaConfig["baseURL"], TSchemaRouteKeys>
	:	TSchemaRouteKeys;

export type ApplyStrictConfig<TSchemaConfig extends CallApiSchemaConfig, TSchemaRouteKeys extends string> =
	TSchemaConfig["strict"] extends true ? TSchemaRouteKeys
	:	// eslint-disable-next-line perfectionist/sort-union-types -- Don't sort union types
		TSchemaRouteKeys | Exclude<InitURLOrURLObject, RouteKeyMethodsURLUnion>;

export type ApplySchemaConfiguration<
	TSchemaConfig extends CallApiSchemaConfig,
	TSchemaRouteKeys extends string,
> = ApplyStrictConfig<TSchemaConfig, ApplyURLBasedConfig<TSchemaConfig, TSchemaRouteKeys>>;

export type InferAllRouteKeys<
	TBaseSchemaRoutes extends BaseCallApiSchemaRoutes,
	TSchemaConfig extends CallApiSchemaConfig,
> = ApplySchemaConfiguration<
	TSchemaConfig,
	Exclude<Extract<keyof TBaseSchemaRoutes, string>, FallBackRouteSchemaKey>
>;

export type InferInitURL<
	TBaseSchemaRoutes extends BaseCallApiSchemaRoutes,
	TSchemaConfig extends CallApiSchemaConfig,
> =
	keyof TBaseSchemaRoutes extends never ? InitURLOrURLObject
	:	InferAllRouteKeys<TBaseSchemaRoutes, TSchemaConfig>;

export type GetCurrentRouteSchemaKey<TSchemaConfig extends CallApiSchemaConfig, TPath> =
	TPath extends URL ? string
	: TSchemaConfig["prefix"] extends string ?
		TPath extends (
			`${AtSymbol}${infer TMethod extends RouteKeyMethods}/${RemoveLeadingSlash<TSchemaConfig["prefix"]>}${infer TCurrentRoute}`
		) ?
			`${AtSymbol}${TMethod}/${RemoveLeadingSlash<TCurrentRoute>}`
		: TPath extends `${TSchemaConfig["prefix"]}${infer TCurrentRoute}` ? TCurrentRoute
		: string
	: TSchemaConfig["baseURL"] extends string ?
		TPath extends (
			`${AtSymbol}${infer TMethod extends RouteKeyMethods}/${TSchemaConfig["baseURL"]}${infer TCurrentRoute}`
		) ?
			`${AtSymbol}${TMethod}/${RemoveLeadingSlash<TCurrentRoute>}`
		: TPath extends `${TSchemaConfig["baseURL"]}${infer TCurrentRoute}` ? TCurrentRoute
		: string
	:	TPath;

export type GetCurrentRouteSchema<
	TBaseSchemaRoutes extends BaseCallApiSchemaRoutes,
	TCurrentRouteSchemaKey extends string,
	TComputedFallBackRouteSchema = TBaseSchemaRoutes[FallBackRouteSchemaKey],
	TComputedCurrentRouteSchema = TBaseSchemaRoutes[TCurrentRouteSchemaKey],
	TComputedRouteSchema extends CallApiSchema = NonNullable<
		Omit<TComputedFallBackRouteSchema, keyof TComputedCurrentRouteSchema> & TComputedCurrentRouteSchema
	>,
> = TComputedRouteSchema extends CallApiSchema ? Writeable<TComputedRouteSchema, "deep"> : CallApiSchema;

type JsonPrimitive = boolean | number | string | null | undefined;

export type SerializableObject = Record<PropertyKey, unknown>;

export type SerializableArray =
	| Array<JsonPrimitive | SerializableObject>
	| ReadonlyArray<JsonPrimitive | SerializableObject>;

export type Body = UnmaskType<
	Exclude<RequestInit["body"], undefined> | SerializableArray | SerializableObject
>;

type InferBodyOption<TSchema extends CallApiSchema> = MakeSchemaOptionRequiredIfDefined<
	TSchema["body"],
	{
		/**
		 * Body of the request, can be a object or any other supported body type.
		 */
		body?: InferSchemaOutput<TSchema["body"], Body>;
	}
>;

export type MethodUnion = UnmaskType<
	"CONNECT" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT" | "TRACE" | AnyString
>;

type InferMethodFromURL<TInitURL> =
	string extends TInitURL ? MethodUnion
	: TInitURL extends `${AtSymbol}${infer TMethod extends RouteKeyMethods}/${string}` ? Uppercase<TMethod>
	: MethodUnion;

type InferMethodOption<TSchema extends CallApiSchema, TInitURL> = MakeSchemaOptionRequiredIfDefined<
	TSchema["method"],
	{
		/**
		 * HTTP method for the request.
		 * @default "GET"
		 */
		method?: InferSchemaOutput<TSchema["method"], InferMethodFromURL<TInitURL>>;
	}
>;

export type HeadersOption = UnmaskType<
	| Headers
	| Record<"Authorization", CommonAuthorizationHeaders | undefined>
	| Record<"Content-Type", CommonContentTypes | undefined>
	| Record<CommonRequestHeaders, string | undefined>
	| Record<string, string | undefined>
	// eslint-disable-next-line perfectionist/sort-union-types -- I need to preserve the order of the types
	| Array<[string, string]>
>;

export type InferHeadersOption<TSchema extends CallApiSchema> = MakeSchemaOptionRequiredIfDefined<
	TSchema["headers"],
	{
		/**
		 * Headers to be used in the request.
		 */
		headers?:
			| InferSchemaOutput<TSchema["headers"], HeadersOption>
			| ((context: {
					baseHeaders: Extract<HeadersOption, Record<string, unknown>>;
			  }) => InferSchemaOutput<TSchema["headers"], HeadersOption>);
	}
>;

export type InferRequestOptions<
	TSchema extends CallApiSchema,
	TInitURL extends InferInitURL<BaseCallApiSchemaRoutes, CallApiSchemaConfig>,
> = InferBodyOption<TSchema> & InferHeadersOption<TSchema> & InferMethodOption<TSchema, TInitURL>;

type InferMetaOption<
	TSchema extends CallApiSchema,
	TCallApiContext extends CallApiContext,
> = MakeSchemaOptionRequiredIfDefined<
	TSchema["meta"],
	{
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
		meta?: InferSchemaOutput<TSchema["meta"], TCallApiContext["Meta"]>;
	}
>;

type InferAuthOption<TSchema extends CallApiSchema> = MakeSchemaOptionRequiredIfDefined<
	TSchema["auth"],
	{
		/**
		 * Automatically add an Authorization header value.
		 *
		 * Supports multiple authentication patterns:
		 * - String: Direct authorization header value
		 * - Auth object: Structured authentication configuration
		 *
		 * @example
		 * ```ts
		 * // Bearer auth
		 * const response = await callMainApi({
		 * 	url: "https://example.com/api/data",
		 * 	auth: "123456",
		 * });
		 *
		 * // Bearer auth
		 * const response = await callMainApi({
		 * 	url: "https://example.com/api/data",
		 * 	auth: {
		 * 		type: "Bearer",
		 * 		value: "123456",
		 * 	},
		 })
		 *
		 * // Token auth
		 * const response = await callMainApi({
		 * 	url: "https://example.com/api/data",
		 * 	auth: {
		 * 		type: "Token",
		 * 		value: "123456",
		 * 	},
		 * });
		 *
		 * // Basic auth
		 * const response = await callMainApi({
		 * 	url: "https://example.com/api/data",
		 * 	auth: {
		 * 		type: "Basic",
		 * 		username: "username",
		 * 		password: "password",
		 * 	},
		 * });
		 *
		 * ```
		 */
		auth?: InferSchemaOutput<TSchema["auth"], AuthOption>;
	}
>;

type InferQueryOption<TSchema extends CallApiSchema> = MakeSchemaOptionRequiredIfDefined<
	TSchema["query"],
	{
		/**
		 * Parameters to be appended to the URL (i.e: /:id)
		 */
		query?: InferSchemaOutput<TSchema["query"], Query>;
	}
>;

type EmptyString = "";

type EmptyTuple = readonly [];

type StringTuple = readonly string[];

type PossibleParamNamePatterns = `${string}:${string}` | `${string}{${string}}${"" | AnyString}`;

type ExtractRouteParamNames<TCurrentRoute, TParamNamesAccumulator extends StringTuple = EmptyTuple> =
	// Check if there are any parameters left to process
	TCurrentRoute extends PossibleParamNamePatterns ?
		// Process :param style patterns first
		TCurrentRoute extends `${infer TRoutePrefix}:${infer TParamAndRemainingRoute}` ?
			TParamAndRemainingRoute extends `${infer TCurrentParam}/${infer TRemainingRoute}` ?
				TCurrentParam extends EmptyString ?
					ExtractRouteParamNames<`${TRoutePrefix}/${TRemainingRoute}`, TParamNamesAccumulator>
				:	ExtractRouteParamNames<
						`${TRoutePrefix}/${TRemainingRoute}`,
						[...TParamNamesAccumulator, TCurrentParam]
					>
			: TParamAndRemainingRoute extends `${infer TCurrentParam}` ?
				TCurrentParam extends EmptyString ?
					ExtractRouteParamNames<TRoutePrefix, TParamNamesAccumulator>
				:	ExtractRouteParamNames<TRoutePrefix, [...TParamNamesAccumulator, TCurrentParam]>
			:	ExtractRouteParamNames<TRoutePrefix, TParamNamesAccumulator>
		: // Process {param} style patterns next
		TCurrentRoute extends `${infer TRoutePrefix}{${infer TCurrentParam}}${infer TRemainingRoute}` ?
			TCurrentParam extends EmptyString ?
				ExtractRouteParamNames<`${TRoutePrefix}${TRemainingRoute}`, TParamNamesAccumulator>
			:	ExtractRouteParamNames<
					`${TRoutePrefix}${TRemainingRoute}`,
					[...TParamNamesAccumulator, TCurrentParam]
				>
		:	TParamNamesAccumulator
	:	// No more parameters found
		TParamNamesAccumulator;

// Helper type to convert array of param names to record type
type ConvertParamNamesToRecord<TParamNames extends StringTuple> = Prettify<
	TParamNames extends (
		readonly [infer TFirstParamName extends string, ...infer TRemainingParamNames extends StringTuple]
	) ?
		// eslint-disable-next-line perfectionist/sort-intersection-types -- Allow
		Record<TFirstParamName, AllowedQueryParamValues> & ConvertParamNamesToRecord<TRemainingParamNames>
	:	NonNullable<unknown>
>;

// Helper type to convert array of param names to clean tuple type
type ConvertParamNamesToTuple<TParamNames extends StringTuple> =
	TParamNames extends readonly [string, ...infer TRemainingParamNames extends StringTuple] ?
		[AllowedQueryParamValues, ...ConvertParamNamesToTuple<TRemainingParamNames>]
	:	[];

export type InferParamsFromRoute<TCurrentRoute> =
	ExtractRouteParamNames<TCurrentRoute> extends StringTuple ?
		ExtractRouteParamNames<TCurrentRoute> extends EmptyTuple ?
			Params
		:	| ConvertParamNamesToRecord<ExtractRouteParamNames<TCurrentRoute>>
			| ConvertParamNamesToTuple<ExtractRouteParamNames<TCurrentRoute>>
	:	Params;

// export type InferParamsFromRoute<TCurrentRoute> =
// 	TCurrentRoute extends `${infer IgnoredPrefix}:${infer TCurrentParam}/${infer TRemainingPath}` ?
// 		TCurrentParam extends EmptyString ?
// 			InferParamsFromRoute<TRemainingPath>
// 		:	| Prettify<
// 					Record<
// 						| TCurrentParam
// 						| (Params extends InferParamsFromRoute<TRemainingPath> ? never
// 						  :	keyof Extract<InferParamsFromRoute<TRemainingPath>, Record<string, unknown>>),
// 						AllowedQueryParamValues
// 					>
// 			  >
// 			| [
// 					AllowedQueryParamValues,
// 					...(Params extends InferParamsFromRoute<TRemainingPath> ? []
// 					:	Extract<InferParamsFromRoute<TRemainingPath>, unknown[]>),
// 			  ]
// 	: TCurrentRoute extends `${infer IgnoredPrefix}:${infer TCurrentParam}` ?
// 		TCurrentParam extends EmptyString ?
// 			Params
// 		:	Prettify<Record<TCurrentParam, AllowedQueryParamValues>> | [AllowedQueryParamValues]
// 	:	Params;

type MakeParamsOptionRequired<
	TParamsSchemaOption extends CallApiSchema["params"],
	TBaseSchemaRoutes extends BaseCallApiSchemaRoutes,
	TCurrentRouteSchemaKey extends string,
	TObject,
> = MakeSchemaOptionRequiredIfDefined<
	TParamsSchemaOption,
	Params extends InferParamsFromRoute<TCurrentRouteSchemaKey> ? TObject
	: TCurrentRouteSchemaKey extends Extract<keyof TBaseSchemaRoutes, TCurrentRouteSchemaKey> ?
		// == If ParamsSchema option is defined but has undefined in the union, it should take precedence to remove the required flag
		undefined extends InferSchemaOutput<TParamsSchemaOption, null> ?
			TObject
		:	Required<TObject>
	:	TObject
>;

type InferParamsOption<
	TSchema extends CallApiSchema,
	TBaseSchemaRoutes extends BaseCallApiSchemaRoutes,
	TCurrentRouteSchemaKey extends string,
> = MakeParamsOptionRequired<
	TSchema["params"],
	TBaseSchemaRoutes,
	TCurrentRouteSchemaKey,
	{
		/**
		 * Parameters to be appended to the URL (i.e: /:id)
		 */
		params?: InferSchemaOutput<TSchema["params"], InferParamsFromRoute<TCurrentRouteSchemaKey>>;
	}
>;

export type InferExtraOptions<
	TSchema extends CallApiSchema,
	TBaseSchemaRoutes extends BaseCallApiSchemaRoutes,
	TCurrentRouteSchemaKey extends string,
	TCallApiContext extends CallApiContext,
> = InferAuthOption<TSchema>
	& InferMetaOption<TSchema, TCallApiContext>
	& InferParamsOption<TSchema, TBaseSchemaRoutes, TCurrentRouteSchemaKey>
	& InferQueryOption<TSchema>;

export type ResultModeOption<TErrorData, TResultMode extends ResultModeType> =
	TErrorData extends false ? { resultMode: "onlyData" }
	: TErrorData extends false | undefined ? { resultMode?: "onlyData" }
	: { resultMode?: TResultMode };

export type ThrowOnErrorUnion = boolean;

export type ThrowOnErrorType<TErrorData, TThrowOnError extends ThrowOnErrorUnion> =
	| TThrowOnError
	| ((context: ErrorContext<{ ErrorData: TErrorData }>) => TThrowOnError);

export type ThrowOnErrorOption<TErrorData, TThrowOnError extends ThrowOnErrorUnion> =
	TErrorData extends false ? { throwOnError: true }
	: TErrorData extends false | undefined ? { throwOnError?: true }
	: { throwOnError?: ThrowOnErrorType<TErrorData, TThrowOnError> };
