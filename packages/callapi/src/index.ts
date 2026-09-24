export { callApi, createFetchClient, createFetchClientWithContext } from "./createFetchClient";

export type { DedupeOptions } from "./dedupe";

export type {
	ErrorContext,
	Hooks,
	HooksOrHooksArray,
	RequestContext,
	RequestStreamContext,
	CallApiExtraOptionsForHooks,
	CallApiRequestOptionsForHooks,
	ResponseContext,
	ResponseErrorContext,
	ResponseStreamContext,
	SuccessContext,
} from "./hooks";

export type { RefetchOptions } from "./refetch";

export type { FetchImpl, FetchMiddlewareContext, Middlewares } from "./middlewares";

export type { CallApiPlugin, PluginHooks, PluginMiddlewares, PluginSetupContext } from "./plugins";

export type {
	ContextTag,
	MetaWithContextTag,
	GetCallApiContext,
	GetCallApiContextRequired,
	ExtraOptionsWithContextTag,
} from "./types/callapi-context";

export type {
	CallApiResultErrorVariant,
	CallApiResultSuccessOrErrorVariant,
	CallApiResultSuccessVariant,
	PossibleHTTPError,
	PossibleJavaScriptError,
	PossibleValidationError,
	ResponseTypeType,
	ResultModeType,
} from "./result";

export type { RetryOptions } from "./retry";

export type {
	BaseCallApiConfig,
	BaseCallApiExtraOptions,
	CallApiConfig,
	CallApiExtraOptions,
	CallApiParameters,
	CallApiRequestOptions,
	CallApiResultLoose as CallApiResult,
	InstanceContext,
	Register,
} from "./types/options-types";

export type {
	InferParamsFromRoute,
	InferInitURL,
	GetCurrentRouteSchemaKey,
	InferAllMainRouteKeys,
	InferAllMainRoutes,
} from "./types/conditional-types";

export type { DefaultCallApiContext, DefaultMetaObject } from "./types/default-types";

export type { URLOptions } from "./url";

export type {
	BaseCallApiSchemaRoutes,
	BaseSchemaRouteKeyPrefixes,
	CallApiSchema,
	CallApiSchemaConfig,
	InferSchemaInput,
	InferSchemaOutput,
} from "./validation";
