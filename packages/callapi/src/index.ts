export { callApi, createFetchClient } from "./createFetchClient";

export type { DedupeOptions } from "./dedupe";

export type {
	ErrorContext,
	Hooks,
	HooksOrHooksArray,
	PluginExtraOptions,
	RequestContext,
	RequestStreamContext,
	ResponseContext,
	ResponseErrorContext,
	ResponseStreamContext,
	SuccessContext,
} from "./hooks";

export {
	type CallApiPlugin,
	type PluginHooks,
	type PluginHooksWithMoreOptions,
	type PluginSetupContext,
} from "./plugins";

export {
	type CallApiResultErrorVariant,
	type CallApiResultSuccessVariant,
	type CallApiSuccessOrErrorVariant,
	type PossibleHTTPError,
	type PossibleJavaScriptError,
	type PossibleJavaScriptOrValidationError,
	type PossibleValidationError,
	type ResponseTypeUnion,
	type ResultModeUnion,
} from "./result";

export type { RetryOptions } from "./retry";

export type {
	BaseCallApiConfig,
	BaseCallApiExtraOptions,
	BaseInstanceContext,
	CallApiConfig,
	CallApiExtraOptions,
	CallApiExtraOptionsForHooks,
	CallApiParameters,
	CallApiRequestOptions,
	CallApiRequestOptionsForHooks,
	CallApiResult,
	InferExtendSchemaConfigContext,
	InferExtendSchemaContext,
	InferParamsFromRoute,
	Register,
} from "./types";

export type { URLOptions } from "./url";

export type {
	BaseCallApiSchemaRoutes,
	CallApiSchema,
	CallApiSchemaConfig,
	InferSchemaInput,
	InferSchemaOutput,
} from "./validation";
