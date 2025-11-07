import type { CallApiConfig, CallApiExtraOptions } from "../types/common";
import { defineEnum } from "../types/type-helpers";

export const extraOptionDefaults = Object.freeze(
	defineEnum({
		// Common defaults
		bodySerializer: JSON.stringify,
		defaultHTTPErrorMessage: "Request failed unexpectedly",

		// Dedupe defaults
		/* eslint-disable perfectionist/sort-objects -- Allow */
		dedupeCacheScope: "local",
		dedupeCacheScopeKey: "default",
		dedupeStrategy: "cancel",
		/* eslint-enable perfectionist/sort-objects -- Allow */

		// Hook defaults
		hooksExecutionMode: "parallel",

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
	} satisfies CallApiExtraOptions)
);

export const requestOptionDefaults = defineEnum({
	method: "GET",
} satisfies CallApiConfig);
