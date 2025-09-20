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
	mode?: "basic" | "verbose";
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
	const { consoleObject = defaultConsoleObject, enabled = true, mode = "basic" } = options ?? {};

	const isBasicMode = mode === "basic";
	const isVerboseMode = mode === "verbose";

	const lineBreak = "\n\n";

	const successLog = consoleObject.success ?? consoleObject.log;

	const errorLog = consoleObject.fail ?? consoleObject.error;

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

				const message = [
					`(${ctx.request.method}) Request to ${ctx.options.fullURL} failed!`,
					`${ctx.error.name}: ${ctx.error.message}`,
				].join(lineBreak);

				errorLog(message);
			},

			onResponseError: (ctx) => {
				const isEnabled = isBoolean(enabled) ? enabled : enabled.onResponseError === true;

				if (!isEnabled) return;

				const message = [
					`(${ctx.request.method}) Request to ${ctx.options.fullURL} failed with status: ${ctx.response.status} (${ctx.response.statusText || getStatusText(ctx.response.status)})`,

					`${ctx.error.name}: ${ctx.error.message}`,
				].join(lineBreak);

				isBasicMode && errorLog(message);

				const verboseMessage = [message, "ErrorData: "].join(lineBreak);

				isVerboseMode && consoleObject.error(verboseMessage, ctx.error.errorData);
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

				successLog("Request succeeded!", ctx.data);
			},

			onValidationError: (ctx) => {
				const isEnabled = isBoolean(enabled) ? enabled : enabled.onValidationError === true;

				if (!isEnabled) return;

				const getMessage = (limit: number | null = null) => {
					const errorMessage =
						limit === null ?
							ctx.error.message
						:	`${ctx.error.message.slice(0, limit).trimEnd()}${ctx.error.message.length > limit ? "..." : ""}`;

					return [
						`(${ctx.error.issueCause.toUpperCase()}) Validation for request to ${ctx.options.fullURL} failed!`,
						`${ctx.error.name}: ${errorMessage}`,
					].join(lineBreak);
				};

				isBasicMode && errorLog(getMessage(150));

				const verboseMessage = [getMessage(), "Issues: "].join(lineBreak);

				isVerboseMode && consoleObject.error(verboseMessage, ctx.error.errorData);
			},
		},
	};
});
