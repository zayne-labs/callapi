import type { ErrorContext } from "../hooks";
import type { CallApiPlugin } from "../plugins";
import type { ResultModeUnion } from "../result";
import type { AllowedQueryParamValues, InitURLOrURLObject, Params, Query } from "../url";
import type {
	BaseCallApiSchemaRoutes,
	CallApiSchema,
	CallApiSchemaConfig,
	FallBackRouteSchemaKey,
	InferSchemaResult,
	RouteKeyMethods,
	RouteKeyMethodsURLUnion,
} from "../validation";
import type {
	AnyFunction,
	AnyString,
	CommonAuthorizationHeaders,
	CommonContentTypes,
	CommonRequestHeaders,
	Prettify,
	UnionToIntersection,
	UnmaskType,
	Writeable,
} from "./type-helpers";

/**
 * @description Makes a type partial if the output type of TSchema is not provided or has undefined in the union, otherwise makes it required
 */
type MakeSchemaOptionRequiredIfDefined<TSchemaOption extends CallApiSchema[keyof CallApiSchema], TObject> =
	undefined extends InferSchemaResult<TSchemaOption, undefined> ? TObject : Required<TObject>;

export type ApplyURLBasedConfig<
	TSchemaConfig extends CallApiSchemaConfig,
	TSchemaRouteKeys extends string,
> =
	TSchemaConfig["prefix"] extends string ? `${TSchemaConfig["prefix"]}${TSchemaRouteKeys}`
	: TSchemaConfig["baseURL"] extends string ? `${TSchemaConfig["baseURL"]}${TSchemaRouteKeys}`
	: TSchemaRouteKeys;

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
	: TSchemaConfig["baseURL"] extends string ?
		TPath extends `${TSchemaConfig["baseURL"]}${infer TCurrentRoute}` ?
			TCurrentRoute extends string ?
				TCurrentRoute
			:	string
		: TPath extends `${TSchemaConfig["prefix"]}${infer TCurrentRoute}` ?
			TCurrentRoute extends string ?
				TCurrentRoute
			:	string
		:	string
	:	TPath;

// export type GetCurrentRouteSchema<
// 	TBaseSchemaRoutes extends BaseCallApiSchemaRoutes,
// 	TCurrentRouteSchemaKey extends string,
// > =
// 	TBaseSchemaRoutes[TCurrentRouteSchemaKey] extends CallApiSchema ?
// 		NonNullable<Writeable<TBaseSchemaRoutes[TCurrentRouteSchemaKey], "deep">>
// 	: TBaseSchemaRoutes[FallBackRouteSchemaKey] extends CallApiSchema ?
// 		NonNullable<Writeable<TBaseSchemaRoutes[FallBackRouteSchemaKey], "deep">>
// 	:	CallApiSchema;

export type GetCurrentRouteSchema<
	TBaseSchemaRoutes extends BaseCallApiSchemaRoutes,
	TCurrentRouteSchemaKey extends string,
	TComputedRouteSchema extends CallApiSchema = Omit<
		TBaseSchemaRoutes[FallBackRouteSchemaKey],
		keyof TBaseSchemaRoutes[TCurrentRouteSchemaKey]
	>
		& TBaseSchemaRoutes[TCurrentRouteSchemaKey],
	TComputedWriteableRouteSchema extends CallApiSchema = NonNullable<
		Writeable<TComputedRouteSchema, "deep">
	>,
> = TComputedWriteableRouteSchema extends CallApiSchema ? TComputedWriteableRouteSchema : CallApiSchema;

type JsonPrimitive = boolean | number | string | null | undefined;

export type SerializableObject = Record<keyof object, unknown>;

export type SerializableArray =
	| Array<JsonPrimitive | SerializableArray | SerializableObject>
	| ReadonlyArray<JsonPrimitive | SerializableArray | SerializableObject>;

export type Body = UnmaskType<RequestInit["body"] | SerializableArray | SerializableObject>;

export type InferBodyOption<TSchema extends CallApiSchema> = MakeSchemaOptionRequiredIfDefined<
	TSchema["body"],
	{
		/**
		 * Body of the request, can be a object or any other supported body type.
		 */
		body?: InferSchemaResult<TSchema["body"], Body>;
	}
>;

export type MethodUnion = UnmaskType<
	"CONNECT" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT" | "TRACE" | AnyString
>;

type InferMethodFromURL<TInitURL> =
	string extends TInitURL ? MethodUnion
	: TInitURL extends `@${infer TMethod extends RouteKeyMethods}/${string}` ? Uppercase<TMethod>
	: MethodUnion;

export type InferMethodOption<TSchema extends CallApiSchema, TInitURL> = MakeSchemaOptionRequiredIfDefined<
	TSchema["method"],
	{
		/**
		 * HTTP method for the request.
		 * @default "GET"
		 */
		method?: InferSchemaResult<TSchema["method"], InferMethodFromURL<TInitURL>>;
	}
>;

export type HeadersOption = UnmaskType<
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
			| InferSchemaResult<TSchema["headers"], HeadersOption>
			| ((context: {
					baseHeaders: NonNullable<HeadersOption>;
			  }) => InferSchemaResult<TSchema["headers"], HeadersOption>);
	}
>;

export type InferRequestOptions<
	TSchema extends CallApiSchema,
	TInitURL extends InferInitURL<BaseCallApiSchemaRoutes, CallApiSchemaConfig>,
> = InferBodyOption<TSchema> & InferHeadersOption<TSchema> & InferMethodOption<TSchema, TInitURL>;

// eslint-disable-next-line ts-eslint/no-empty-object-type -- This needs to be empty to allow users to register their own meta
export interface Register {
	// == meta: Meta
}

export type GlobalMeta =
	Register extends { meta?: infer TMeta extends Record<string, unknown> } ? TMeta : never;

export type InferMetaOption<TSchema extends CallApiSchema> = MakeSchemaOptionRequiredIfDefined<
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
		meta?: InferSchemaResult<TSchema["meta"], GlobalMeta>;
	}
>;

export type InferQueryOption<TSchema extends CallApiSchema> = MakeSchemaOptionRequiredIfDefined<
	TSchema["query"],
	{
		/**
		 * Parameters to be appended to the URL (i.e: /:id)
		 */
		query?: InferSchemaResult<TSchema["query"], Query>;
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
		undefined extends InferSchemaResult<TParamsSchemaOption, null> ?
			TObject
		:	Required<TObject>
	:	TObject
>;

export type InferParamsOption<
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
		params?: InferSchemaResult<TSchema["params"], InferParamsFromRoute<TCurrentRouteSchemaKey>>;
	}
>;

export type InferExtraOptions<
	TSchema extends CallApiSchema,
	TBaseSchemaRoutes extends BaseCallApiSchemaRoutes,
	TCurrentRouteSchemaKey extends string,
> = InferMetaOption<TSchema>
	& InferParamsOption<TSchema, TBaseSchemaRoutes, TCurrentRouteSchemaKey>
	& InferQueryOption<TSchema>;

export type InferPluginOptions<TPluginArray extends CallApiPlugin[]> = UnionToIntersection<
	TPluginArray extends Array<infer TPlugin> ?
		TPlugin extends CallApiPlugin ?
			TPlugin["defineExtraOptions"] extends AnyFunction<infer TReturnedSchema> ?
				InferSchemaResult<TReturnedSchema>
			:	never
		:	never
	:	never
>;

// == DID THIS FOR AUTOCOMPLETION
type ExtractKeys<TUnion, TSelectedUnion extends TUnion> = Extract<TUnion, TSelectedUnion>;

export type ResultModeOption<TErrorData, TResultMode extends ResultModeUnion> =
	TErrorData extends false ? { resultMode: "onlySuccessWithException" }
	: TErrorData extends false | undefined ? { resultMode?: "onlySuccessWithException" }
	: TErrorData extends false | null ?
		{ resultMode?: ExtractKeys<ResultModeUnion, "onlySuccess" | "onlySuccessWithException"> }
	:	{ resultMode?: TResultMode };

export type ThrowOnErrorUnion = boolean;

export type ThrowOnErrorOption<TErrorData, TThrowOnError extends ThrowOnErrorUnion> =
	TErrorData extends false ? { throwOnError: true }
	: TErrorData extends false | undefined ? { throwOnError?: true }
	: { throwOnError?: TThrowOnError | ((context: ErrorContext<TErrorData>) => TThrowOnError) };
