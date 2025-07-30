import { ValidationError } from "./error";
import type {
	BaseCallApiExtraOptions,
	Body,
	CallApiExtraOptions,
	CallApiRequestOptions,
	GlobalMeta,
	HeadersOption,
	MethodUnion,
} from "./types";
import type { StandardSchemaV1 } from "./types/standard-schema";
import {
	type AnyFunction,
	type AnyString,
	type Awaitable,
	defineEnum,
	type Prettify,
	type UnionToIntersection,
} from "./types/type-helpers";
import type { Params, Query } from "./url";
import { isFunction } from "./utils/guards";

type InferSchemaInput<TSchema extends CallApiSchema[keyof CallApiSchema]> =
	TSchema extends StandardSchemaV1 ? StandardSchemaV1.InferInput<TSchema>
	: TSchema extends (value: infer TInput) => unknown ? TInput
	: never;

export type InferSchemaResult<TSchema, TFallbackResult = unknown> =
	// == Checking for undefined first and returning fallback to avoid type errors when passing the config around (weird tbh)
	undefined extends TSchema ? TFallbackResult
	: TSchema extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<TSchema>
	: TSchema extends AnyFunction<infer TResult> ? Awaited<TResult>
	: TFallbackResult;

const handleValidatorFunction = async <TInput>(
	validator: Extract<CallApiSchema[keyof CallApiSchema], AnyFunction>,
	inputData: TInput
): Promise<StandardSchemaV1.Result<TInput>> => {
	try {
		const result = await validator(inputData as never);

		return {
			issues: undefined,
			value: result as never,
		};
	} catch (error) {
		return {
			issues: error as never,
			value: undefined,
		};
	}
};

export const standardSchemaParser = async <
	TSchema extends NonNullable<CallApiSchema[keyof CallApiSchema]>,
>(
	schema: TSchema,
	inputData: InferSchemaInput<TSchema>,
	response?: Response | null
): Promise<InferSchemaResult<TSchema>> => {
	const result =
		isFunction(schema) ?
			await handleValidatorFunction(schema, inputData)
		:	await schema["~standard"].validate(inputData);

	// == If the `issues` field exists, it means the validation failed
	if (result.issues) {
		throw new ValidationError(
			{ issues: result.issues, response: response ?? null },
			{ cause: result.issues }
		);
	}

	return result.value as never;
};

export interface CallApiSchemaConfig {
	/**
	 * The base url of the schema. By default it's the baseURL of the callApi instance.
	 */
	baseURL?: string;

	/**
	 * Disables runtime validation for the schema.
	 */
	disableRuntimeValidation?: boolean;

	/**
	 * If `true`, the original input value will be used instead of the transformed/validated output.
	 *
	 * This is useful when you want to validate the input but don't want any transformations
	 * applied by the validation schema (e.g., type coercion, default values, etc).
	 */
	disableValidationOutputApplication?: boolean;

	/**
	 * Optional url prefix that will be substituted for the `baseURL` of the schemaConfig at runtime.
	 *
	 * This allows you to reuse the same schema against different base URLs (for example,
	 * swapping between `/api/v1` and `/api/v2`) without redefining the entire schema.
	 */
	prefix?: string;

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

export interface CallApiSchema {
	/**
	 *  The schema to use for validating the request body.
	 */
	body?: StandardSchemaV1<Body> | ((body: Body) => Awaitable<Body>);

	/**
	 *  The schema to use for validating the response data.
	 */
	data?: StandardSchemaV1 | ((data: unknown) => unknown);

	/**
	 *  The schema to use for validating the response error data.
	 */
	errorData?: StandardSchemaV1 | ((errorData: unknown) => unknown);

	/**
	 *  The schema to use for validating the request headers.
	 */
	headers?:
		| StandardSchemaV1<HeadersOption | undefined>
		| ((headers: HeadersOption) => Awaitable<HeadersOption | undefined>);

	/**
	 *  The schema to use for validating the meta option.
	 */
	meta?:
		| StandardSchemaV1<GlobalMeta | undefined>
		| ((meta: GlobalMeta) => Awaitable<GlobalMeta | undefined>);

	/**
	 *  The schema to use for validating the request method.
	 */
	method?:
		| StandardSchemaV1<MethodUnion | undefined>
		| ((method: MethodUnion) => Awaitable<MethodUnion | undefined>);

	/**
	 *  The schema to use for validating the request url parameters.
	 */
	params?: StandardSchemaV1<Params | undefined> | ((params: Params) => Awaitable<Params | undefined>);

	/**
	 *  The schema to use for validating the request url queries.
	 */
	query?: StandardSchemaV1<Query | undefined> | ((query: Query) => Awaitable<Query | undefined>);
}

export const routeKeyMethods = defineEnum(["delete", "get", "patch", "post", "put"]);

export type RouteKeyMethods = (typeof routeKeyMethods)[number];

export type RouteKeyMethodsURLUnion = `@${RouteKeyMethods}/`;

export type BaseCallApiSchemaRoutes = Partial<Record<AnyString | RouteKeyMethodsURLUnion, CallApiSchema>>;

export type BaseCallApiSchemaAndConfig = {
	config?: CallApiSchemaConfig;
	routes: BaseCallApiSchemaRoutes;
};
type ValidationOptions<
	TSchema extends CallApiSchema[keyof CallApiSchema] = CallApiSchema[keyof CallApiSchema],
> = {
	inputValue: InferSchemaInput<TSchema>;
	response?: Response | null;
	schemaConfig: CallApiSchemaConfig | undefined;
};

export const handleValidation = async <TSchema extends CallApiSchema[keyof CallApiSchema]>(
	schema: TSchema | undefined,
	validationOptions: ValidationOptions<TSchema>
): Promise<InferSchemaResult<TSchema>> => {
	const { inputValue, response, schemaConfig } = validationOptions;

	if (!schema || schemaConfig?.disableRuntimeValidation) {
		return inputValue as never;
	}

	const validResult = await standardSchemaParser(schema, inputValue, response);

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

const extraOptionsToBeValidated = ["meta", "params", "query"] satisfies Tuple<
	Extract<keyof CallApiSchema, keyof CallApiExtraOptions>
>;

type ExtraOptionsValidationOptions = {
	extraOptions: CallApiExtraOptions;
	schema: CallApiSchema | undefined;
	schemaConfig: CallApiSchemaConfig | undefined;
};

const handleExtraOptionsValidation = async (validationOptions: ExtraOptionsValidationOptions) => {
	const { extraOptions, schema, schemaConfig } = validationOptions;

	const validationResultArray = await Promise.all(
		extraOptionsToBeValidated.map((propertyKey) =>
			handleValidation(schema?.[propertyKey], {
				inputValue: extraOptions[propertyKey],
				schemaConfig,
			})
		)
	);

	const validatedResultObject: Prettify<
		Pick<CallApiExtraOptions, (typeof extraOptionsToBeValidated)[number]>
	> = {};

	for (const [index, propertyKey] of extraOptionsToBeValidated.entries()) {
		const validationResult = validationResultArray[index];

		if (validationResult === undefined) continue;

		validatedResultObject[propertyKey] = validationResult as never;
	}

	return validatedResultObject;
};

const requestOptionsToBeValidated = ["body", "headers", "method"] satisfies Tuple<
	Extract<keyof CallApiSchema, keyof CallApiRequestOptions>
>;

type RequestOptionsValidationOptions = {
	requestOptions: CallApiRequestOptions;
	schema: CallApiSchema | undefined;
	schemaConfig: CallApiSchemaConfig | undefined;
};

const handleRequestOptionsValidation = async (validationOptions: RequestOptionsValidationOptions) => {
	const { requestOptions, schema, schemaConfig } = validationOptions;

	const validationResultArray = await Promise.all(
		requestOptionsToBeValidated.map((propertyKey) =>
			handleValidation(schema?.[propertyKey], {
				inputValue: requestOptions[propertyKey],
				schemaConfig,
			})
		)
	);

	const validatedResultObject: Prettify<
		Pick<CallApiRequestOptions, (typeof requestOptionsToBeValidated)[number]>
	> = {};

	for (const [index, propertyKey] of requestOptionsToBeValidated.entries()) {
		const validationResult = validationResultArray[index];

		if (validationResult === undefined) continue;

		validatedResultObject[propertyKey] = validationResult as never;
	}

	return validatedResultObject;
};

export const handleConfigValidation = async (
	validationOptions: GetResolvedSchemaContext
		& Omit<ExtraOptionsValidationOptions & RequestOptionsValidationOptions, "schema" | "schemaConfig">
) => {
	const { baseExtraOptions, currentRouteSchemaKey, extraOptions, requestOptions } = validationOptions;

	const { currentRouteSchema, resolvedSchema } = getResolvedSchema({
		baseExtraOptions,
		currentRouteSchemaKey,
		extraOptions,
	});

	const resolvedSchemaConfig = getResolvedSchemaConfig({ baseExtraOptions, extraOptions });

	if (!currentRouteSchema && resolvedSchemaConfig?.strict === true) {
		throw new ValidationError({
			issues: [{ message: `Strict Mode - No schema found for route '${currentRouteSchemaKey}' ` }],
			response: null,
		});
	}

	if (resolvedSchemaConfig?.disableRuntimeValidation) {
		return {
			extraOptionsValidationResult: null,
			requestOptionsValidationResult: null,
			resolvedSchema,
			resolvedSchemaConfig,
			shouldApplySchemaOutput: false,
		};
	}

	const [extraOptionsValidationResult, requestOptionsValidationResult] = await Promise.all([
		handleExtraOptionsValidation({
			extraOptions,
			schema: resolvedSchema,
			schemaConfig: resolvedSchemaConfig,
		}),
		handleRequestOptionsValidation({
			requestOptions,
			schema: resolvedSchema,
			schemaConfig: resolvedSchemaConfig,
		}),
	]);

	const shouldApplySchemaOutput =
		(Boolean(extraOptionsValidationResult) || Boolean(requestOptionsValidationResult))
		&& !resolvedSchemaConfig?.disableValidationOutputApplication;

	return {
		extraOptionsValidationResult,
		requestOptionsValidationResult,
		resolvedSchema,
		resolvedSchemaConfig,
		shouldApplySchemaOutput,
	};
};

type GetResolvedSchemaContext = {
	baseExtraOptions: BaseCallApiExtraOptions;
	currentRouteSchemaKey: string;
	extraOptions: CallApiExtraOptions;
};

export const getResolvedSchema = (context: GetResolvedSchemaContext) => {
	const { baseExtraOptions, currentRouteSchemaKey, extraOptions } = context;

	const currentRouteSchema = baseExtraOptions.schema?.routes[currentRouteSchemaKey];

	const resolvedSchema =
		isFunction(extraOptions.schema) ?
			extraOptions.schema({
				baseSchema: baseExtraOptions.schema?.routes ?? {},
				currentRouteSchema: currentRouteSchema ?? {},
			})
		:	(extraOptions.schema ?? currentRouteSchema);

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

export const getCurrentRouteSchemaKeyAndMainInitURL = (
	context: Pick<GetResolvedSchemaContext, "baseExtraOptions" | "extraOptions"> & { initURL: string }
) => {
	const { baseExtraOptions, extraOptions, initURL } = context;

	const schemaConfig = getResolvedSchemaConfig({ baseExtraOptions, extraOptions });

	let currentRouteSchemaKey = initURL;
	let mainInitURL = initURL;

	if (schemaConfig?.prefix && currentRouteSchemaKey.startsWith(schemaConfig.prefix)) {
		currentRouteSchemaKey = currentRouteSchemaKey.replace(schemaConfig.prefix, "");

		mainInitURL = mainInitURL.replace(schemaConfig.prefix, schemaConfig.baseURL ?? "");
	}

	if (schemaConfig?.baseURL && currentRouteSchemaKey.startsWith(schemaConfig.baseURL)) {
		currentRouteSchemaKey = currentRouteSchemaKey.replace(schemaConfig.baseURL, "");
	}

	return { currentRouteSchemaKey, mainInitURL };
};
