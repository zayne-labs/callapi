export { callApi, createFetchClient } from "./createFetchClient";

export type { DedupeOptions } from "./dedupe";

export { defineParameters } from "./defineParameters";

export { HTTPError, ValidationError } from "./error";

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
	definePlugin,
	type PluginHooks,
	type PluginHooksWithMoreOptions,
	type PluginInitContext,
} from "./plugins";

export {
	type CallApiResultErrorVariant,
	type CallApiResultSuccessVariant,
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
	CallApiConfig,
	CallApiExtraOptions,
	CallApiExtraOptionsForHooks,
	CallApiParameters,
	CallApiRequestOptions,
	CallApiRequestOptionsForHooks,
	CallApiResult,
	InferParamsFromRoute,
	Register,
} from "./types";

export type { URLOptions } from "./url";

export {
	type BaseCallApiSchemaRoutes,
	type CallApiSchema,
	type CallApiSchemaConfig,
	defineSchema,
	defineSchemaRoutes,
	type InferSchemaResult,
} from "./validation";
