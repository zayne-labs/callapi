import { definePlugin } from "@zayne-labs/callapi";
import { type AnyFunction, isBoolean } from "@zayne-labs/toolkit-type-helpers";
import { createConsola } from "consola";
import { getStatusText } from "./utils";

type ConsoleLikeObject = {
	error: AnyFunction<void>;
	fail?: AnyFunction<void>;
	log: AnyFunction<void>;
	success?: AnyFunction<void>;
	warn?: AnyFunction<void>;
};

const consola = createConsola({
	formatOptions: {
		colors: true,
		columns: 80,
		compact: 10,
		date: false,
		fancy: true,
	},
});

export type LoggerOptions = {
	/**
	 * Custom console object
	 */
	consoleObject?: ConsoleLikeObject;
	/**
	 * Enable or disable the logger
	 * @default true
	 */
	enabled?:
		| boolean
		| {
				onRequest?: boolean;
				onRequestError?: boolean;
				onResponse?: boolean;
				onResponseError?: boolean;
				onRetry?: boolean;
				onSuccess?: boolean;
				onValidationError?: boolean;
		  };
	/**
	 * Enable or disable verbose mode
	 */
	verbose?: boolean;
};

/* eslint-disable ts-eslint/no-unsafe-argument -- Ignore for now */
export const defaultConsoleObject: ConsoleLikeObject = {
	error: (...args) => consola.error("", ...args),
	fail: (...args) => consola.fail("", ...args),
	log: (...args) => consola.info("", ...args),
	success: (...args) => consola.success("", ...args),
	warn: (...args) => consola.warn("", ...args),
};
/* eslint-enable ts-eslint/no-unsafe-argument -- Ignore for now */

export const loggerPlugin = definePlugin((options?: LoggerOptions) => {
	const { consoleObject = defaultConsoleObject, enabled = true, verbose } = options ?? {};

	return {
		/* eslint-disable perfectionist/sort-objects -- Ignore for now */
		id: "logger",
		name: "Logger",
		version: "1.1.0",

		hooks: {
			/* eslint-enable perfectionist/sort-objects -- Ignore */
			onRequest: (ctx) => {
				const isEnabled = isBoolean(enabled) ? enabled : enabled.onRequest === true;

				if (!isEnabled) return;

				consoleObject.log(`Request being sent to: ${ctx.options.fullURL}`);
			},

			onRequestError: (ctx) => {
				const isEnabled = isBoolean(enabled) ? enabled : enabled.onRequestError === true;

				if (!isEnabled) return;

				const log = consoleObject.fail ?? consoleObject.error;

				log(`Request to failed with error: ${ctx.error.name}`, ctx.error.message);

				verbose && consoleObject.error(ctx.error.errorData);
			},

			onResponseError: (ctx) => {
				const isEnabled = isBoolean(enabled) ? enabled : enabled.onResponseError === true;

				if (!isEnabled) return;

				const log = consoleObject.fail ?? consoleObject.error;

				log(
					"Request failed with status: ",
					ctx.response.status,
					`(${ctx.response.statusText || getStatusText(ctx.response.status)})`,
					ctx.error.message
				);

				verbose && consoleObject.error(ctx.error.errorData);
			},

			onRetry: (ctx) => {
				const isEnabled = isBoolean(enabled) ? enabled : enabled.onRetry === true;

				if (!isEnabled) return;

				const log = consoleObject.warn ?? consoleObject.log;

				log(`Retrying request... Attempt: `, ctx.retryAttemptCount);
			},

			onSuccess: (ctx) => {
				const isEnabled = isBoolean(enabled) ? enabled : enabled.onSuccess === true;

				if (!isEnabled) return;

				const log = consoleObject.success ?? consoleObject.log;

				log("Request succeeded!", ctx.data);
			},

			onValidationError: (ctx) => {
				const isEnabled = isBoolean(enabled) ? enabled : enabled.onValidationError === true;

				if (!isEnabled) return;

				const log = consoleObject.fail ?? consoleObject.error;

				log(`Validation failed with error: ${ctx.error.name}`, ctx.error.message);

				verbose && consoleObject.error(ctx.error.errorData);
			},
		},
	};
});
