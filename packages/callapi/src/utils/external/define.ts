import type { CallApiPlugin } from "../../plugins";
import type { BaseCallApiConfig } from "../../types";
import type { MatchExactObjectType, Writeable } from "../../types/type-helpers";
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
	config?: MatchExactObjectType<TSchemaConfig, CallApiSchemaConfig>
) => {
	return {
		config: config as NonNullable<Writeable<typeof config, "deep">>,
		routes: routes as Writeable<typeof routes, "deep">,
	} satisfies BaseCallApiSchemaAndConfig;
};

export const defineSchemaRoutes = <const TSchemaRoutes extends CallApiSchema>(
	routes: MatchExactObjectType<TSchemaRoutes, CallApiSchema>
) => {
	return routes as Writeable<typeof routes, "deep">;
};

export const defineSchemaConfig = <const TSchemaConfig extends CallApiSchemaConfig>(
	config: MatchExactObjectType<TSchemaConfig, CallApiSchemaConfig>
) => {
	return config as Writeable<typeof config, "deep">;
};

export const definePlugin = <const TPlugin extends CallApiPlugin>(plugin: TPlugin) => {
	return plugin as Writeable<typeof plugin, "deep">;
};

export const defineBaseConfig = <const TBaseConfig extends BaseCallApiConfig>(baseConfig: TBaseConfig) => {
	return baseConfig as Writeable<typeof baseConfig, "deep">;
};
