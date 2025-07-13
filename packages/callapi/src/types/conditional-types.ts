import type { ErrorContext } from "../hooks";
import type { CallApiPlugin } from "../plugins";
import type { ResultModeUnion } from "../result";
import type { AllowedQueryParamValues, Params, Query } from "../url";
import type {
	BaseCallApiSchema,
	CallApiSchema,
	CallApiSchemaConfig,
	InferSchemaResult,
	RouteKeyMethods,
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
	TCurrentRouteKeys extends string,
> =
	TSchemaConfig["baseURL"] extends string ? `${TSchemaConfig["baseURL"]}${TCurrentRouteKeys}`
	:	TCurrentRouteKeys;

export type ApplyStrictConfig<
	TSchemaConfig extends CallApiSchemaConfig,
	TCurrentRouteKeys extends string,
	// eslint-disable-next-line perfectionist/sort-union-types -- Don't sort union
> = TSchemaConfig["strict"] extends true ? TCurrentRouteKeys : TCurrentRouteKeys | AnyString;

export type ApplySchemaConfiguration<
	TSchemaConfig extends CallApiSchemaConfig,
	TCurrentRouteKeys extends string,
> = ApplyStrictConfig<TSchemaConfig, ApplyURLBasedConfig<TSchemaConfig, TCurrentRouteKeys>>;

export type InferAllRouteKeys<
	TBaseSchema extends BaseCallApiSchema,
	TSchemaConfig extends CallApiSchemaConfig,
> = ApplySchemaConfiguration<TSchemaConfig, keyof TBaseSchema extends string ? keyof TBaseSchema : never>;

export type InferInitURL<
	TBaseSchema extends BaseCallApiSchema,
	TSchemaConfig extends CallApiSchemaConfig,
> = InferAllRouteKeys<TBaseSchema, TSchemaConfig> | URL;

export type GetCurrentRouteKey<TSchemaConfig extends CallApiSchemaConfig, TPath> =
	TSchemaConfig["baseURL"] extends string ?
		TPath extends `${TSchemaConfig["baseURL"]}${infer TCurrentRoute}` ?
			TCurrentRoute extends string ?
				TCurrentRoute
			:	string
		:	string
	: TPath extends URL ? string
	: TPath;

export type GetCurrentRouteSchema<
	TBaseSchema extends BaseCallApiSchema,
	TCurrentRouteKey extends string,
> = NonNullable<Writeable<TBaseSchema[TCurrentRouteKey], "deep">>;

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

type MakeMethodOptionRequired<
	TMethodSchemaOption extends CallApiSchema["method"],
	TInitURL,
	TSchemaConfig extends CallApiSchemaConfig,
	TObject,
> = MakeSchemaOptionRequiredIfDefined<
	TMethodSchemaOption,
	undefined extends TSchemaConfig ? TObject
	: TInitURL extends `@${string}/${string}` ?
		TSchemaConfig["requireMethodProvision"] extends true ?
			Required<TObject>
		:	TObject
	:	TObject
>;

export type InferMethodOption<
	TSchema extends CallApiSchema,
	TSchemaConfig extends CallApiSchemaConfig,
	TInitURL,
> = MakeMethodOptionRequired<
	TSchema["method"],
	TInitURL,
	TSchemaConfig,
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
	TSchemaConfig extends CallApiSchemaConfig,
	TInitURL extends InferInitURL<BaseCallApiSchema, CallApiSchemaConfig>,
> = InferBodyOption<TSchema>
	& InferHeadersOption<TSchema>
	& InferMethodOption<TSchema, TSchemaConfig, TInitURL>;

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

/* eslint-disable perfectionist/sort-union-types -- I need to preserve the order of the types */
export type InferParamFromRoute<TCurrentRoute> =
	TCurrentRoute extends `${infer IgnoredPrefix}:${infer TCurrentParam}/${infer TRemainingPath}` ?
		TCurrentParam extends EmptyString ?
			InferParamFromRoute<TRemainingPath>
		:	| Prettify<
					Record<
						| TCurrentParam
						| (Params extends InferParamFromRoute<TRemainingPath> ? never
						  :	keyof Extract<InferParamFromRoute<TRemainingPath>, Record<string, unknown>>),
						AllowedQueryParamValues
					>
			  >
			| [
					AllowedQueryParamValues,
					...(Params extends InferParamFromRoute<TRemainingPath> ? []
					:	Extract<InferParamFromRoute<TRemainingPath>, unknown[]>),
			  ]
	: TCurrentRoute extends `${infer IgnoredPrefix}:${infer TCurrentParam}` ?
		TCurrentParam extends EmptyString ?
			Params
		:	Prettify<Record<TCurrentParam, AllowedQueryParamValues>> | [AllowedQueryParamValues]
	:	Params;
/* eslint-enable perfectionist/sort-union-types -- I need to preserve the order of the types */

type MakeParamsOptionRequired<
	TParamsSchemaOption extends CallApiSchema["params"],
	TBaseSchema extends BaseCallApiSchema,
	TCurrentRouteKey extends string,
	TObject,
> = MakeSchemaOptionRequiredIfDefined<
	TParamsSchemaOption,
	TCurrentRouteKey extends `${string}:${string}${"" | "/"}${"" | AnyString}` ?
		TCurrentRouteKey extends Extract<keyof TBaseSchema, TCurrentRouteKey> ?
			// == If ParamsSchema option is defined but has undefined in the union, it should take precedence to remove the required flag
			undefined extends InferSchemaResult<TParamsSchemaOption, null> ?
				TObject
			:	Required<TObject>
		:	TObject
	:	TObject
>;

export type InferParamsOption<
	TSchema extends CallApiSchema,
	TBaseSchema extends BaseCallApiSchema,
	TCurrentRouteKey extends string,
> = MakeParamsOptionRequired<
	TSchema["params"],
	TBaseSchema,
	TCurrentRouteKey,
	{
		/**
		 * Parameters to be appended to the URL (i.e: /:id)
		 */
		params?: InferSchemaResult<TSchema["params"], InferParamFromRoute<TCurrentRouteKey>>;
	}
>;

export type InferExtraOptions<
	TSchema extends CallApiSchema,
	TBaseSchema extends BaseCallApiSchema,
	TCurrentRouteKey extends string,
> = InferMetaOption<TSchema>
	& InferParamsOption<TSchema, TBaseSchema, TCurrentRouteKey>
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
	: null extends TResultMode ? { resultMode?: TResultMode }
	: { resultMode: TResultMode };

export type ThrowOnErrorUnion = boolean;

export type ThrowOnErrorOption<TErrorData, TThrowOnError extends ThrowOnErrorUnion> =
	TErrorData extends false ? { throwOnError: true }
	: TErrorData extends false | undefined ? { throwOnError?: true }
	: { throwOnError?: TThrowOnError | ((context: ErrorContext<TErrorData>) => TThrowOnError) };
