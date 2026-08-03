import type { CallApiExtraOptions } from "@zayne-labs/callapi";

export type TimeoutOptions = Pick<CallApiExtraOptions, "timeout">;

export type {
	BaseCallApiExtraOptions,
	CallApiExtraOptions,
	CallApiPlugin,
	CallApiRequestOptions,
	CallApiSchema,
	CallApiSchemaConfig,
	DedupeOptions,
	Hooks,
	RetryOptions,
	URLOptions,
} from "@zayne-labs/callapi";
