import type {
	BaseCallApiExtraOptions as InitBaseCallApiExtraOptions,
	CallApiExtraOptions as InitCallApiExtraOptions,
} from "@zayne-labs/callapi";

export type TimeoutOptions = Pick<InitCallApiExtraOptions, "timeout">;

export type {
	CallApiPlugin,
	CallApiRequestOptions,
	CallApiSchema,
	CallApiSchemaConfig,
	DedupeOptions,
	HookConfigOptions,
	Hooks,
	RetryOptions,
	URLOptions,
} from "@zayne-labs/callapi";

export type BaseCallApiExtraOptions = Omit<InitBaseCallApiExtraOptions, "~retryAttemptCount">;

export type CallApiExtraOptions = Omit<InitCallApiExtraOptions, "~retryAttemptCount">;
