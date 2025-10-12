import { extraOptionDefaults } from "./constants/default-options";
import type { CallApiExtraOptions } from "./types";
import type { StandardSchemaV1 } from "./types/standard-schema";
import { isObject, isString } from "./utils/guards";
import type { CallApiSchema, CallApiSchemaConfig } from "./validation";

type HTTPErrorDetails<TErrorData> = Pick<CallApiExtraOptions, "defaultHTTPErrorMessage"> & {
	errorData: TErrorData;
	response: Response;
};

const httpErrorSymbol = Symbol("HTTPError");

export class HTTPError<TErrorData = Record<string, unknown>> extends Error {
	errorData: HTTPErrorDetails<TErrorData>["errorData"];

	readonly httpErrorSymbol = httpErrorSymbol;

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
			?? (response.statusText || extraOptionDefaults.defaultHTTPErrorMessage);

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
	static override isError<TErrorData>(error: unknown): error is HTTPError<TErrorData> {
		if (!isObject<HTTPError>(error)) {
			return false;
		}

		if (error instanceof HTTPError) {
			return true;
		}

		const actualError = error as HTTPError;

		return (
			actualError.httpErrorSymbol === httpErrorSymbol
			// eslint-disable-next-line ts-eslint/no-unnecessary-condition -- Allow
			&& actualError.name === "HTTPError"
		);
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

type LockedExtract<TUnion, TKey extends TUnion> = Extract<TUnion, TKey>;

type ValidationErrorDetails = {
	/**
	 * The cause of the validation error.
	 *
	 * It's either the name the schema for which validation failed, or the name of the schema config option that led to the validation error.
	 */
	issueCause:
		| "unknown"
		| `schemaConfig-(${LockedExtract<keyof CallApiSchemaConfig, "strict">})`
		| keyof CallApiSchema;

	/**
	 * The issues that caused the validation error.
	 */
	issues: readonly StandardSchemaV1.Issue[];

	/**
	 * The response from server, if any.
	 */
	response: Response | null;
};

const validationErrorSymbol = Symbol("ValidationErrorSymbol");

export class ValidationError extends Error {
	errorData: ValidationErrorDetails["issues"];

	issueCause: ValidationErrorDetails["issueCause"];

	override name = "ValidationError" as const;

	response: ValidationErrorDetails["response"];

	readonly validationErrorSymbol = validationErrorSymbol;

	constructor(details: ValidationErrorDetails, errorOptions?: ErrorOptions) {
		const { issueCause, issues, response } = details;

		const message = prettifyValidationIssues(issues);

		super(message, errorOptions);

		this.errorData = issues;
		this.response = response;
		this.issueCause = issueCause;
	}

	/**
	 * @description Checks if the given error is an instance of ValidationError
	 * @param error - The error to check
	 * @returns true if the error is an instance of ValidationError, false otherwise
	 */
	static override isError(error: unknown): error is ValidationError {
		if (!isObject<ValidationError>(error)) {
			return false;
		}

		if (error instanceof ValidationError) {
			return true;
		}

		const actualError = error as ValidationError;

		return (
			actualError.validationErrorSymbol === validationErrorSymbol
			// eslint-disable-next-line ts-eslint/no-unnecessary-condition -- Allow
			&& actualError.name === "ValidationError"
		);
	}
}
