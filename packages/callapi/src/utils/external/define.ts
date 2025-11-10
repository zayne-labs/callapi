import type { CallApiPlugin } from "../../plugins";
import type { BaseCallApiConfig } from "../../types";
import type { AnyFunction, Satisfies, Writeable } from "../../types/type-helpers";
import type {
	BaseCallApiSchemaAndConfig,
	BaseCallApiSchemaRoutes,
	CallApiSchema,
	CallApiSchemaConfig,
} from "../../validation";

export const defineSchema = <
	const TBaseSchemaRoutes extends BaseCallApiSchemaRoutes,
	const TSchemaConfig extends CallApiSchemaConfig,
>(
	routes: TBaseSchemaRoutes,
	config?: Satisfies<TSchemaConfig, CallApiSchemaConfig>
) => {
	return {
		config: defineSchemaConfig(config as NonNullable<typeof config>),
		routes: defineSchemaRoutes(routes),
	} satisfies BaseCallApiSchemaAndConfig;
};

export const defineSchemaRoutes = <const TSchemaRoutes extends BaseCallApiSchemaRoutes>(
	routes: TSchemaRoutes
) => {
	return routes as Writeable<typeof routes, "deep">;
};

export const defineMainSchema = <const TSchema extends CallApiSchema>(
	mainSchema: Satisfies<TSchema, CallApiSchema>
) => {
	return mainSchema as Writeable<typeof mainSchema, "deep">;
};

export const defineSchemaConfig = <const TSchemaConfig extends CallApiSchemaConfig>(
	config: Satisfies<TSchemaConfig, CallApiSchemaConfig>
) => {
	return config as Writeable<typeof config, "deep">;
};

export const definePlugin = <const TPlugin extends CallApiPlugin>(plugin: TPlugin) => {
	return plugin as Writeable<typeof plugin, "deep">;
};

type BaseConfigObject = Exclude<BaseCallApiConfig, AnyFunction>;

type BaseConfigFn = Extract<BaseCallApiConfig, AnyFunction>;

type DefineBaseConfig = {
	<const TBaseConfig extends BaseConfigObject>(
		baseConfig: Satisfies<TBaseConfig, BaseConfigObject>
	): Writeable<typeof baseConfig, "deep">;
	<TBaseConfig extends BaseConfigFn>(baseConfig: TBaseConfig): TBaseConfig;
};

export const defineBaseConfig: DefineBaseConfig = <const TBaseConfig extends BaseCallApiConfig>(
	baseConfig: TBaseConfig
) => {
	return baseConfig;
};
