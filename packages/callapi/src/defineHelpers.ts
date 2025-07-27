import type { CallApiPlugin } from "./plugins";
import type { ResponseTypeUnion, ResultModeUnion } from "./result";
import type {
	BaseCallApiConfig,
	CallApiExtraOptions,
	CallApiParameters,
	InferInitURL,
	ThrowOnErrorUnion,
} from "./types";
import type { DefaultDataType, DefaultPluginArray, DefaultThrowOnError } from "./types/default-types";
import type { AnyFunction, Writeable } from "./types/type-helpers";
import type {
	BaseCallApiSchemaAndConfig,
	BaseCallApiSchemaRoutes,
	CallApiSchema,
	CallApiSchemaConfig,
} from "./validation";

export const defineSchema = <
	const TBaseSchemaRoutes extends BaseCallApiSchemaRoutes,
	const TSchemaConfig extends CallApiSchemaConfig,
>(
	routes: TBaseSchemaRoutes,
	config?: TSchemaConfig
) => {
	return {
		config: defineSchemaConfig(config),
		routes: defineSchemaRoutes(routes),
	} satisfies BaseCallApiSchemaAndConfig;
};

export const defineSchemaConfig = <const TConfig extends CallApiExtraOptions["schemaConfig"]>(
	config: TConfig
) => {
	return config as NonNullable<Writeable<typeof config, "deep">>;
};

export const defineSchemaRoutes = <const TBaseSchemaRoutes extends BaseCallApiSchemaRoutes>(
	routes: TBaseSchemaRoutes
) => {
	return routes as Writeable<typeof routes, "deep">;
};

export const definePlugin = <
	// eslint-disable-next-line perfectionist/sort-union-types -- Let the first one be first
	const TPlugin extends CallApiPlugin | AnyFunction<CallApiPlugin>,
>(
	plugin: TPlugin
) => {
	return plugin as Writeable<TPlugin, "deep">;
};

export const defineBaseConfig = <const TBaseConfig extends BaseCallApiConfig>(baseConfig: TBaseConfig) => {
	return baseConfig as Writeable<typeof baseConfig, "deep">;
};

export const defineParameters = <
	TData = DefaultDataType,
	TErrorData = DefaultDataType,
	TResultMode extends ResultModeUnion = ResultModeUnion,
	TThrowOnError extends ThrowOnErrorUnion = DefaultThrowOnError,
	TResponseType extends ResponseTypeUnion = ResponseTypeUnion,
	TBaseSchemaRoutes extends BaseCallApiSchemaRoutes = BaseCallApiSchemaRoutes,
	TSchema extends CallApiSchema = CallApiSchema,
	TBaseSchemaConfig extends CallApiSchemaConfig = CallApiSchemaConfig,
	TSchemaConfig extends CallApiSchemaConfig = CallApiSchemaConfig,
	TInitURL extends InferInitURL<BaseCallApiSchemaRoutes, TSchemaConfig> = InferInitURL<
		BaseCallApiSchemaRoutes,
		TSchemaConfig
	>,
	TCurrentRouteSchemaKey extends string = string,
	TBasePluginArray extends CallApiPlugin[] = DefaultPluginArray,
	TPluginArray extends CallApiPlugin[] = DefaultPluginArray,
>(
	...parameters: CallApiParameters<
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
	>
) => {
	return parameters;
};
