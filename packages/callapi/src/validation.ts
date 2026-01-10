import type { AuthOption } from "./auth";
import { fallBackRouteSchemaKey, type FallBackRouteSchemaKey } from "./constants/validation";
import type {
	BaseCallApiExtraOptions,
	CallApiExtraOptions,
	CallApiRequestOptions,
	GlobalMeta,
} from "./types/common";
import type { Body, HeadersOption, MethodUnion } from "./types/conditional-types";
import type { StandardSchemaV1 } from "./types/standard-schema";
import {
	defineEnum,
	type AnyFunction,
	type AnyString,
	type Awaitable,
	type UnionDiscriminator,
	type UnionToIntersection,
} from "./types/type-helpers";
import {
	atSymbol,
	extractMethodFromURL,
	normalizeURL,
	type AtSymbol,
	type Params,
	type Query,
} from "./url";
import { toArray } from "./utils/common";
import { ValidationError } from "./utils/external/error";
import { isFunction, isObject } from "./utils/guards";

type ResultVariant = "infer-input" | "infer-output";

export type InferSchemaResult<TSchema, TFallbackResult, TResultVariant extends ResultVariant> =
	// == Checking for undefined first and returning fallback to avoid type errors when passing the config around (weird tbh)
	undefined extends TSchema ? TFallbackResult
	: TSchema extends StandardSchemaV1 ?
		TResultVariant extends "infer-input" ?
			StandardSchemaV1.InferInput<TSchema>
		:	StandardSchemaV1.InferOutput<TSchema>
	: TSchema extends AnyFunction<infer TResult> ? Awaited<TResult>
	: TFallbackResult;

export type InferSchemaOutput<TSchema, TFallbackResult = unknown> = InferSchemaResult<
	TSchema,
	TFallbackResult,
	"infer-output"
>;

export type InferSchemaInput<TSchema, TFallbackResult = unknown> = InferSchemaResult<
	TSchema,
	TFallbackResult,
	"infer-input"
>;

const handleValidatorFunction = <TInput>(
	validator: AnyFunction,
	inputData: TInput
): Promise<StandardSchemaV1.Result<TInput>> => {
	const result = new Promise((resolve) => resolve(validator(inputData as never)))
		.then((value) => ({ issues: undefined, value: value as never }))
		.catch((error) => ({ issues: toArray(error) as never, value: undefined }));

	return result;
};

export const getValidatedValue = <
	TSchema extends AnyFunction | StandardSchemaV1,
	TVariant extends "async" | "sync",
>(
	inputValue: InferSchemaOutput<TSchema>,
	schema?: TSchema,
	_ignoredOptions?: { variant: TVariant }
): TVariant extends "async" ? Promise<StandardSchemaV1.Result<typeof inputValue>>
:	StandardSchemaV1.Result<typeof inputValue> => {
	if (!schema) {
		return { issues: undefined, value: inputValue } as never;
	}

	const result =
		isFunction(schema) ?
			handleValidatorFunction(schema, inputValue)
		:	schema["~standard"].validate(inputValue);

	return result as never;
};

const callApiSchemaParser = async <
	TFullSchema extends CallApiSchema,
	TSchemaName extends keyof CallApiSchema,
	TSchema extends NonNullable<TFullSchema[TSchemaName]>,
>(
	fullSchema: TFullSchema | undefined,
	schemaName: TSchemaName,
	options: { inputValue: InferSchemaInput<TSchema>; response?: Response | null }
): Promise<InferSchemaOutput<TSchema>> => {
	const { inputValue, response } = options;

	const schema = fullSchema?.[schemaName];

	const result = await getValidatedValue(inputValue, schema);

	if (result.issues) {
		throw new ValidationError({
			issueCause: schemaName,
			issues: result.issues,
			response: response ?? null,
		});
	}

	return result.value as never;
};

type BooleanObject = {
	[Key in keyof CallApiSchema]: boolean;
};

export interface CallApiSchemaConfig {
	/**
	 * The base url of the schema. By default it's the baseURL of the callApi instance.
	 */
	baseURL?: "" | AnyString;

	/**
	 * Disables runtime validation for the schema.
	 */
	disableRuntimeValidation?: boolean | BooleanObject;

	/**
	 * If `true`, the original input value will be used instead of the transformed/validated output.
	 *
	 * When true, the original input is returned unchanged after validation, ignoring any schema-level
	 * transformations such as type coercion, default values, or field mapping. Only the validation
	 * step is executed; the resulting value is discarded in favor of the raw input.
	 */
	disableRuntimeValidationTransform?: boolean | BooleanObject;

	/**
	 * Optional url prefix that will be substituted for the `baseURL` of the schemaConfig at runtime.
	 *
	 * Enables a short, stable prefix for routes while keeping the full `baseURL` centralized in config.
	 * Keeps route definitions concise and shields them from changes to the underlying base URL.
	 */
	prefix?: "" | AnyString;

	/**
	 * Controls the strictness of API route validation.
	 *
	 * When true:
	 * - Only routes explicitly defined in the schema will be considered valid to typescript and the runtime.
	 * - Attempting to call routes not defined in the schema will result in both type errors and runtime validation errors.
	 * - Useful for ensuring API calls conform exactly to your schema definition
	 *
	 * When false or undefined (default):
	 * - All routes will be allowed, whether they are defined in the schema or not
	 */
	strict?: boolean;
}

export type CallApiSchemaType<TInput> =
	| StandardSchemaV1<TInput | undefined>
	| ((value: TInput) => Awaitable<TInput | undefined>);

export interface CallApiSchema {
	auth?: CallApiSchemaType<AuthOption>;

	/**
	 *  The schema to use for validating the request body.
	 */
	body?: CallApiSchemaType<Body>;

	/**
	 *  The schema to use for validating the response data.
	 */
	data?: CallApiSchemaType<unknown>;

	/**
	 *  The schema to use for validating the response error data.
	 */
	errorData?: CallApiSchemaType<unknown>;

	/**
	 *  The schema to use for validating the request headers.
	 */
	headers?: CallApiSchemaType<HeadersOption>;

	/**
	 *  The schema to use for validating the meta option.
	 */
	meta?: CallApiSchemaType<GlobalMeta>;

	/**
	 *  The schema to use for validating the request method.
	 */
	method?: CallApiSchemaType<MethodUnion>;

	/**
	 *  The schema to use for validating the request url parameters.
	 */
	params?: CallApiSchemaType<Params>;

	/**
	 *  The schema to use for validating the request url queries.
	 */
	query?: CallApiSchemaType<Query>;
}

export const routeKeyMethods = defineEnum(["delete", "get", "patch", "post", "put"]);

export type RouteKeyMethods = (typeof routeKeyMethods)[number];

export type RouteKeyMethodsURLUnion = `${AtSymbol}${RouteKeyMethods}/`;

export type BaseSchemaRouteKeyPrefixes = FallBackRouteSchemaKey | RouteKeyMethodsURLUnion;

export type BaseCallApiSchemaRoutes = Partial<
	Record<AnyString | BaseSchemaRouteKeyPrefixes, CallApiSchema>
>;

export type BaseCallApiSchemaAndConfig = {
	config?: CallApiSchemaConfig;
	routes: BaseCallApiSchemaRoutes;
};

type ValidationOptions<
	TSchema extends CallApiSchema[keyof CallApiSchema] = CallApiSchema[keyof CallApiSchema],
> = {
	inputValue: InferSchemaInput<TSchema>;
	response?: Response | null;
	resultMode: CallApiExtraOptions["resultMode"];
	schemaConfig: CallApiSchemaConfig | undefined;
};

export const handleSchemaValidation = async <
	TFullSchema extends CallApiSchema,
	TSchemaName extends keyof CallApiSchema,
	TSchema extends NonNullable<TFullSchema[TSchemaName]>,
>(
	fullSchema: TFullSchema | undefined,
	schemaName: TSchemaName,
	validationOptions: ValidationOptions<TSchema>
): Promise<InferSchemaOutput<TSchema>> => {
	const { inputValue, response, resultMode, schemaConfig } = validationOptions;

	// == If resultMode is set to `fetchApi`, return the input value as is (which is going to be `null` in this)
	if (resultMode === "fetchApi" && (schemaName === "data" || schemaName === "errorData")) {
		return inputValue as never;
	}

	const disableRuntimeValidationBooleanObject =
		isObject(schemaConfig?.disableRuntimeValidation) ? schemaConfig.disableRuntimeValidation : {};

	const shouldDisableRuntimeValidation =
		schemaConfig?.disableRuntimeValidation === true
		|| disableRuntimeValidationBooleanObject[schemaName] === true;

	if (shouldDisableRuntimeValidation) {
		return inputValue as never;
	}

	const validResult = await callApiSchemaParser(fullSchema, schemaName, { inputValue, response });

	const disableResultApplicationBooleanObject =
		isObject(schemaConfig?.disableRuntimeValidationTransform) ?
			schemaConfig.disableRuntimeValidationTransform
		:	{};

	const shouldDisableResultApplication =
		schemaConfig?.disableRuntimeValidationTransform === true
		|| disableResultApplicationBooleanObject[schemaName] === true;

	if (shouldDisableResultApplication) {
		return inputValue as never;
	}

	return validResult as never;
};

type LastOf<TValue> =
	UnionToIntersection<TValue extends unknown ? () => TValue : never> extends () => infer R ? R : never;

type Push<TArray extends unknown[], TArrayItem> = [...TArray, TArrayItem];

type UnionToTuple<
	TUnion,
	TComputedLastUnion = LastOf<TUnion>,
	TComputedIsUnionEqualToNever = [TUnion] extends [never] ? true : false,
> =
	true extends TComputedIsUnionEqualToNever ? []
	:	Push<UnionToTuple<Exclude<TUnion, TComputedLastUnion>>, TComputedLastUnion>;

export type Tuple<TTuple, TArray extends TTuple[] = []> =
	UnionToTuple<TTuple>["length"] extends TArray["length"] ? [...TArray]
	:	Tuple<TTuple, [TTuple, ...TArray]>;

type ExtraOptionsValidationOptions = {
	options: CallApiExtraOptions;
};

const extraOptionsToBeValidated = ["meta", "params", "query", "auth"] satisfies Tuple<
	Extract<keyof CallApiSchema, keyof CallApiExtraOptions>
>;

type RequestOptionsValidationOptions = {
	request: CallApiRequestOptions;
};

const requestOptionsToBeValidated = ["body", "headers", "method"] satisfies Tuple<
	Extract<keyof CallApiSchema, keyof CallApiRequestOptions>
>;

type OptionValidationOptions = UnionDiscriminator<
	[ExtraOptionsValidationOptions, RequestOptionsValidationOptions]
> & {
	schema: CallApiSchema | undefined;
	schemaConfig: CallApiSchemaConfig | undefined;
};

const handleOptionsValidation = async <TValidationOptions extends OptionValidationOptions>(
	validationOptions: TValidationOptions
): Promise<
	undefined extends TValidationOptions["options"] ?
		Pick<CallApiRequestOptions, (typeof requestOptionsToBeValidated)[number]>
	:	Pick<CallApiExtraOptions, (typeof extraOptionsToBeValidated)[number]>
> => {
	const { options, request, schema, schemaConfig } = validationOptions;

	const resolvedOptionsToBeValidated = options ? extraOptionsToBeValidated : requestOptionsToBeValidated;

	const resolvedOptions = options ?? request;

	const validationResultArray = await Promise.all(
		resolvedOptionsToBeValidated.map((schemaName) =>
			handleSchemaValidation(schema, schemaName, {
				inputValue: resolvedOptions[schemaName as keyof typeof resolvedOptions],
				resultMode: options?.resultMode,
				schemaConfig,
			})
		)
	);

	const validatedResultObject: Record<string, unknown> = {};

	for (const [index, schemaName] of resolvedOptionsToBeValidated.entries()) {
		const validationResult = validationResultArray[index];

		if (validationResult === undefined) continue;

		validatedResultObject[schemaName] = validationResult;
	}

	return validatedResultObject;
};

export const handleConfigValidation = async (
	validationOptions: ExtraOptionsValidationOptions
		& GetResolvedSchemaContext
		& RequestOptionsValidationOptions
) => {
	const { baseExtraOptions, currentRouteSchemaKey, extraOptions, options, request } = validationOptions;

	const { currentRouteSchema, resolvedSchema } = getResolvedSchema({
		baseExtraOptions,
		currentRouteSchemaKey,
		extraOptions,
	});

	const resolvedSchemaConfig = getResolvedSchemaConfig({ baseExtraOptions, extraOptions });

	if (resolvedSchemaConfig?.strict === true && !currentRouteSchema) {
		throw new ValidationError({
			issueCause: "schemaConfig-(strict)",
			issues: [{ message: `Strict Mode - No schema found for route '${currentRouteSchemaKey}' ` }],
			response: null,
		});
	}

	const [extraOptionsValidationResult, requestOptionsValidationResult] = await Promise.all([
		handleOptionsValidation({
			options,
			schema: resolvedSchema,
			schemaConfig: resolvedSchemaConfig,
		}),
		handleOptionsValidation({
			request,
			schema: resolvedSchema,
			schemaConfig: resolvedSchemaConfig,
		}),
	]);

	return {
		extraOptionsValidationResult,
		requestOptionsValidationResult,
		resolvedSchema,
		resolvedSchemaConfig,
	};
};

type GetResolvedSchemaContext = {
	baseExtraOptions: BaseCallApiExtraOptions;
	currentRouteSchemaKey: string;
	extraOptions: CallApiExtraOptions;
};

export const getResolvedSchema = (context: GetResolvedSchemaContext) => {
	const { baseExtraOptions, currentRouteSchemaKey, extraOptions } = context;

	const fallbackRouteSchema = baseExtraOptions.schema?.routes[fallBackRouteSchemaKey];
	const currentRouteSchema = baseExtraOptions.schema?.routes[currentRouteSchemaKey];

	const resolvedRouteSchema = {
		...fallbackRouteSchema,
		// == Current route schema takes precedence over fallback route schema
		...currentRouteSchema,
	} satisfies CallApiSchema as CallApiSchema | undefined;

	const resolvedSchema =
		isFunction(extraOptions.schema) ?
			extraOptions.schema({
				baseSchemaRoutes: baseExtraOptions.schema?.routes ?? {},
				currentRouteSchema: resolvedRouteSchema ?? {},
				currentRouteSchemaKey,
			})
		:	(extraOptions.schema ?? resolvedRouteSchema);

	return { currentRouteSchema, resolvedSchema };
};

export const getResolvedSchemaConfig = (
	context: Omit<GetResolvedSchemaContext, "currentRouteSchemaKey">
) => {
	const { baseExtraOptions, extraOptions } = context;

	const resolvedSchemaConfig =
		isFunction(extraOptions.schemaConfig) ?
			extraOptions.schemaConfig({ baseSchemaConfig: baseExtraOptions.schema?.config ?? {} })
		:	(extraOptions.schemaConfig ?? baseExtraOptions.schema?.config);

	return resolvedSchemaConfig;
};

const removeLeadingSlash = (value: string) => (value.startsWith("/") ? value.slice(1) : value);

const extractURLParts = (initURL: string) => {
	return {
		methodFromURL: extractMethodFromURL(initURL),
		pathWithoutMethod: normalizeURL(initURL, { retainLeadingSlashForRelativeURLs: false }),
	};
};

const mergeURLParts = (options: { method: string | undefined; path: string }): string => {
	const { method, path } = options;

	return method ? `${atSymbol}${method}/${removeLeadingSlash(path)}` : path;
};

export const getCurrentRouteSchemaKeyAndMainInitURL = (
	context: Pick<GetResolvedSchemaContext, "baseExtraOptions" | "extraOptions"> & { initURL: string }
) => {
	const { baseExtraOptions, extraOptions, initURL } = context;

	const schemaConfig = getResolvedSchemaConfig({ baseExtraOptions, extraOptions });

	let currentRouteSchemaKey = initURL;
	let mainInitURL = initURL;

	const { methodFromURL, pathWithoutMethod } = extractURLParts(initURL);

	const prefixWithoutLeadingSlash = schemaConfig?.prefix && removeLeadingSlash(schemaConfig.prefix);

	if (prefixWithoutLeadingSlash && pathWithoutMethod.startsWith(prefixWithoutLeadingSlash)) {
		const restOfPathWithoutPrefix = pathWithoutMethod.slice(prefixWithoutLeadingSlash.length);

		currentRouteSchemaKey = mergeURLParts({ method: methodFromURL, path: restOfPathWithoutPrefix });

		const pathWithReplacedPrefix = pathWithoutMethod.replace(
			prefixWithoutLeadingSlash,
			schemaConfig.baseURL ?? ""
		);

		mainInitURL = mergeURLParts({ method: methodFromURL, path: pathWithReplacedPrefix });
	}

	if (schemaConfig?.baseURL && pathWithoutMethod.startsWith(schemaConfig.baseURL)) {
		const restOfPathWithoutBaseURL = pathWithoutMethod.slice(schemaConfig.baseURL.length);

		currentRouteSchemaKey = mergeURLParts({ method: methodFromURL, path: restOfPathWithoutBaseURL });
	}

	return { currentRouteSchemaKey, mainInitURL };
};
