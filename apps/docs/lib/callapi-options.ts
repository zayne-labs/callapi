import type { CallApiExtraOptions } from "@zayne-labs/callapi";

export type { BaseCallApiExtraOptions, CallApiExtraOptions, RetryOptions } from "@zayne-labs/callapi";

export type TimeoutOptions = Pick<CallApiExtraOptions, "timeout">;

export type {
	CallApiPlugin,
	CallApiRequestOptions,
	CallApiSchema,
	CallApiSchemaConfig,
	DedupeOptions,
	Hooks,
	URLOptions,
} from "@zayne-labs/callapi";

// export type RetryOptions = Omit<InitRetryOptions<unknown>, "~retryAttemptCount">;

// export type BaseCallApiExtraOptions = Omit<InitBaseCallApiExtraOptions, "~retryAttemptCount">;

// export type CallApiExtraOptions = Omit<InitCallApiExtraOptions, "~retryAttemptCount">;
