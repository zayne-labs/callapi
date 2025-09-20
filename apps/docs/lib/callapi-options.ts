import type {
	BaseCallApiExtraOptions as InitBaseCallApiExtraOptions,
	CallApiExtraOptions as InitCallApiExtraOptions,
	RetryOptions as InitRetryOptions,
} from "@zayne-labs/callapi";

export type TimeoutOptions = Pick<InitCallApiExtraOptions, "timeout">;

export type {
	CallApiPlugin,
	CallApiRequestOptions,
	CallApiSchema,
	CallApiSchemaConfig,
	DedupeOptions,
	Hooks,
	URLOptions,
} from "@zayne-labs/callapi";

export type RetryOptions = Omit<InitRetryOptions<unknown>, "~retryAttemptCount">;

export type BaseCallApiExtraOptions = Omit<InitBaseCallApiExtraOptions, "~retryAttemptCount">;

export type CallApiExtraOptions = Omit<InitCallApiExtraOptions, "~retryAttemptCount">;
