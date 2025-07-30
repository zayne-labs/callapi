import { extraOptionDefaults } from "./constants/default-options";
import type { CallApiExtraOptions } from "./types";
import type { StandardSchemaV1 } from "./types/standard-schema";
import { isObject, isString } from "./utils/guards";

type HTTPErrorDetails<TErrorData> = Pick<CallApiExtraOptions, "defaultHTTPErrorMessage"> & {
	errorData: TErrorData;
	response: Response;
};

const httpErrorSymbol = Symbol("HTTPError");

export class HTTPError<TErrorData = Record<string, unknown>> extends Error {
	errorData: HTTPErrorDetails<TErrorData>["errorData"];

	httpErrorSymbol = httpErrorSymbol;

	isHTTPError = true;

	override name = "HTTPError" as const;

	response: HTTPErrorDetails<TErrorData>["response"];

	constructor(errorDetails: HTTPErrorDetails<TErrorData>, errorOptions?: ErrorOptions) {
		const { defaultHTTPErrorMessage, errorData, response } = errorDetails;

		const resolvedDefaultHTTPErrorMessage =
			isString(defaultHTTPErrorMessage) ? defaultHTTPErrorMessage : (
				defaultHTTPErrorMessage?.({ errorData, response })
			);

		const selectedDefaultErrorMessage =
			resolvedDefaultHTTPErrorMessage
			?? (response.statusText || extraOptionDefaults().defaultHTTPErrorMessage);

		const message =
			(errorData as { message?: string } | undefined)?.message ?? selectedDefaultErrorMessage;

		super(message, errorOptions);

		this.errorData = errorData;
		this.response = response;
	}

	/**
	 * @description Checks if the given error is an instance of HTTPError
	 * @param error - The error to check
	 * @returns true if the error is an instance of HTTPError, false otherwise
	 */
	static isError<TErrorData>(error: unknown): error is HTTPError<TErrorData> {
		if (!isObject<Record<string, unknown>>(error)) {
			return false;
		}

		if (error instanceof HTTPError) {
			return true;
		}

		return error.httpErrorSymbol === httpErrorSymbol && error.isHTTPError === true;
	}
}

const prettifyPath = (path: ValidationError["errorData"][number]["path"]) => {
	if (!path || path.length === 0) {
		return "";
	}

	const pathString = path.map((segment) => (isObject(segment) ? segment.key : segment)).join(".");

	return ` → at ${pathString}`;
};

const prettifyValidationIssues = (issues: ValidationError["errorData"]) => {
	const issuesString = issues
		.map((issue) => `✖ ${issue.message}${prettifyPath(issue.path)}`)
		.join(" | ");

	return issuesString;
};

type ValidationErrorDetails = {
	issues: readonly StandardSchemaV1.Issue[];
	response: Response | null;
};

const validationErrorSymbol = Symbol("validationErrorSymbol");

export class ValidationError extends Error {
	errorData: ValidationErrorDetails["issues"];

	override name = "ValidationError";

	response: ValidationErrorDetails["response"];

	validationErrorSymbol = validationErrorSymbol;

	constructor(details: ValidationErrorDetails, errorOptions?: ErrorOptions) {
		const { issues, response } = details;

		const message = prettifyValidationIssues(issues);

		super(message, errorOptions);

		this.errorData = issues;
		this.response = response;
	}

	/**
	 * @description Checks if the given error is an instance of HTTPError
	 * @param error - The error to check
	 * @returns true if the error is an instance of HTTPError, false otherwise
	 */
	static isError(error: unknown): error is ValidationError {
		if (!isObject<Record<string, unknown>>(error)) {
			return false;
		}

		if (error instanceof ValidationError) {
			return true;
		}

		return error.validationErrorSymbol === validationErrorSymbol && error.name === "ValidationError";
	}
}
