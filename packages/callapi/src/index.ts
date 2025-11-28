export { callApi, createFetchClient, createFetchClientWithContext } from "./createFetchClient";

export type { DedupeOptions } from "./dedupe";

export type {
	ErrorContext,
	Hooks,
	HooksOrHooksArray,
	RequestContext,
	RequestStreamContext,
	ResponseContext,
	ResponseErrorContext,
	ResponseStreamContext,
	SuccessContext,
} from "./hooks";

export { type CallApiPlugin, type PluginHooks, type PluginSetupContext } from "./plugins";

export {
	type CallApiResultErrorVariant,
	type CallApiResultSuccessVariant,
	type CallApiSuccessOrErrorVariant,
	type PossibleHTTPError,
	type PossibleJavaScriptError,
	type PossibleJavaScriptOrValidationError,
	type PossibleValidationError,
	type ResponseTypeType,
	type ResultModeType,
} from "./result";

export type { RetryOptions } from "./retry";

export type {
	BaseCallApiConfig,
	BaseCallApiExtraOptions,
	CallApiConfig,
	CallApiExtraOptions,
	CallApiExtraOptionsForHooks,
	CallApiParameters,
	CallApiRequestOptions,
	CallApiRequestOptionsForHooks,
	CallApiResultLoose as CallApiResult,
	GetExtendSchemaConfigContext,
	InferExtendSchemaContext,
	InstanceContext,
	Register,
} from "./types/common";

export type { InferParamsFromRoute } from "./types/conditional-types";

export type { DefaultCallApiContext } from "./types/default-types";

export type { URLOptions } from "./url";

export type {
	BaseCallApiSchemaRoutes,
	BaseSchemaRouteKeyPrefixes,
	CallApiSchema,
	CallApiSchemaConfig,
	InferSchemaInput,
	InferSchemaOutput,
} from "./validation";
