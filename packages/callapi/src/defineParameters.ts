import type { CallApiPlugin } from "./plugins";
import type { ResponseTypeUnion, ResultModeUnion } from "./result";
import type { CallApiParameters, InferInitURL, ThrowOnErrorUnion } from "./types";
import type { DefaultDataType, DefaultPluginArray, DefaultThrowOnError } from "./types/default-types";
import type { BaseCallApiSchemaRoutes, CallApiSchema, CallApiSchemaConfig } from "./validation";

const defineParameters = <
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

export { defineParameters };
