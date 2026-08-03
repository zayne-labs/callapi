import type { CallApiConfig, ErrorContext } from "@zayne-labs/callapi";
import { definePlugin } from "@zayne-labs/callapi/utils";
import { isBoolean, type AnyFunction } from "@zayne-labs/toolkit-type-helpers";
import { createConsola } from "consola";
import { getStatusText } from "./utils";

type ConsoleLikeObject = {
	error?: AnyFunction<void>;
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
				onError?: boolean;
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

const formatPrefix = (requestOptions: Pick<CallApiConfig, "fullURL" | "method">) => {
	const { fullURL, method } = requestOptions;

	return `[${method?.toUpperCase()}] '${fullURL}'`;
};

const formatDuration = (startTime: number | undefined) => {
	if (startTime === undefined) {
		return "";
	}

	const durationMs = Date.now() - startTime;

	return `(${durationMs}ms)`;
};

const formatErrorReason = (error: Pick<ErrorContext["error"], "message" | "name">) => {
	return `"${error.name}: ${error.message}"`;
};

const getStatusAndStatusText = (response: Response) => {
	const status = response.status;
	const statusText = response.statusText || getStatusText(status);

	return { status, statusText };
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

export const loggerPlugin = (options?: LoggerOptions) => {
	const { consoleObject = defaultConsoleObject, enabled = true, mode = "basic" } = options ?? {};

	const startTimes = new WeakMap<object, number>();

	const isBasicMode = mode === "basic";
	const isVerboseMode = mode === "verbose";

	const lineBreak = "\n";

	const successLog = consoleObject.success ?? consoleObject.log;

	const errorLog = consoleObject.error ?? consoleObject.fail ?? consoleObject.log;

	return definePlugin({
		/* eslint-disable perfectionist/sort-objects -- Ignore for now */
		id: "logger",
		name: "Logger",
		version: "1.1.0",

		hooks: {
			/* eslint-enable perfectionist/sort-objects -- Ignore */
			onRequest: (ctx) => {
				const isEnabled = isBoolean(enabled) ? enabled : enabled.onRequest === true;

				if (!isEnabled) return;

				startTimes.set(ctx, Date.now());

				consoleObject.log(formatPrefix({ fullURL: ctx.options.fullURL, method: ctx.request.method }));
			},

			onRequestError: (ctx) => {
				const isEnabled =
					isBoolean(enabled) ? enabled : enabled.onRequestError === true || enabled.onError;

				if (!isEnabled) return;

				const message = [
					`${formatPrefix({ fullURL: ctx.options.fullURL, method: ctx.request.method })} - Request failed!`,
					`Reason = ${formatErrorReason(ctx.error)}`,
				].join(lineBreak);

				errorLog(message);
			},

			onResponseError: (ctx) => {
				const isEnabled =
					isBoolean(enabled) ? enabled : enabled.onResponseError === true || enabled.onError;

				if (!isEnabled) return;

				const duration = formatDuration(startTimes.get(ctx.request));

				const { status, statusText } = getStatusAndStatusText(ctx.response);

				const message = [
					`${formatPrefix({ fullURL: ctx.options.fullURL, method: ctx.request.method })} - Failed with status: ${status} (${statusText}) ${duration}`,
					`Reason = ${formatErrorReason(ctx.error)}`,
				].join(lineBreak);

				isBasicMode && errorLog(message);

				const verboseMessage = [message, "ErrorData: "].join(lineBreak);

				isVerboseMode && errorLog(verboseMessage, ctx.error.errorData);
			},

			onRetry: (ctx) => {
				const isEnabled = isBoolean(enabled) ? enabled : enabled.onRetry === true;

				if (!isEnabled) return;

				const log = consoleObject.warn ?? consoleObject.log;

				log(
					`${formatPrefix({ fullURL: ctx.options.fullURL, method: ctx.request.method })} — Retry attempt #${ctx.retryAttemptCount}`
				);
			},

			onSuccess: (ctx) => {
				const isEnabled = isBoolean(enabled) ? enabled : enabled.onSuccess === true;

				if (!isEnabled) return;

				const { status, statusText } = getStatusAndStatusText(ctx.response);

				const duration = formatDuration(startTimes.get(ctx.request));

				successLog(
					`${formatPrefix({ fullURL: ctx.options.fullURL, method: ctx.request.method })} - Request completed with status: ${status} (${statusText}) ${duration}`
				);
			},

			onValidationError: (ctx) => {
				const isEnabled =
					isBoolean(enabled) ? enabled : enabled.onValidationError === true || enabled.onError;

				if (!isEnabled) return;

				const getMessage = (limit: number | null = null) => {
					const errorMessage =
						limit === null ?
							ctx.error.message
						:	`${ctx.error.message.slice(0, limit).trimEnd()}${ctx.error.message.length > limit ? "..." : ""}`;

					return [
						`(${ctx.error.issueCause.toUpperCase()}) ${formatPrefix({ fullURL: ctx.options.fullURL, method: ctx.request.method })} validation failed`,
						`Reason = ${formatErrorReason({ message: errorMessage, name: ctx.error.name })}`,
					].join(lineBreak);
				};

				isBasicMode && errorLog(getMessage());

				const verboseMessage = [getMessage(), "Issues: "].join(lineBreak);

				isVerboseMode && errorLog(verboseMessage, ctx.error.errorData);
			},
		},
	});
};
