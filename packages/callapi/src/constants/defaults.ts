import type { CallApiConfig, CallApiExtraOptions } from "../types/options-types";
import { defineEnum } from "../types/type-helpers";
import { deterministicHashFn } from "../utils/common";

export const extraOptionDefaults = Object.freeze(
	defineEnum({
		// Common defaults
		bodySerializer: JSON.stringify,
		debugMode: true,
		dedupeCacheScope: "local",

		// Dedupe defaults

		dedupeCacheScopeKey: "default",
		dedupeKey: (ctx) =>
			`${ctx.options.fullURL}-${deterministicHashFn({ options: ctx.options, request: ctx.request })}`,
		dedupeStrategy: "cancel",
		defaultHTTPErrorMessage: "Request failed unexpectedly",

		// Hook defaults
		hooksExecutionMode: "parallel",

		respectRetryAfter: false,

		// Response defaults
		responseParser: JSON.parse,
		responseType: "json",

		resultMode: "all",
		// Retry Defaults
		retryAttempts: 0,
		retryCondition: () => true,
		retryDelay: 1000,
		retryMaxDelay: 10000,
		retryMethods: ["GET", "POST"],
		retryStatusCodes: [],
		retryStrategy: "linear",
	} as const satisfies CallApiExtraOptions)
);

export const requestOptionDefaults = Object.freeze(
	defineEnum({
		method: "GET",
	} satisfies CallApiConfig)
);
