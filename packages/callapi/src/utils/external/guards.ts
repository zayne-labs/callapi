import type {
	CallApiResultErrorVariant,
	PossibleHTTPError,
	PossibleJavaScriptError,
	PossibleValidationError,
} from "../../result";
import { isObject } from "../guards";
import { HTTPError, ValidationError } from "./error";

export const isHTTPError = <TErrorData>(
	error: CallApiResultErrorVariant<TErrorData>["error"] | null
): error is PossibleHTTPError<TErrorData> => {
	return isObject(error) && error.name === "HTTPError";
};

export const isHTTPErrorInstance = <TErrorData>(error: unknown) => {
	return HTTPError.isError<TErrorData>(error);
};

export const isValidationError = (
	error: CallApiResultErrorVariant<unknown>["error"] | null
): error is PossibleValidationError => {
	return isObject(error) && error.name === "ValidationError";
};

export const isValidationErrorInstance = (error: unknown): error is ValidationError => {
	return ValidationError.isError(error);
};

export const isJavascriptError = (
	error: CallApiResultErrorVariant<unknown>["error"] | null
): error is PossibleJavaScriptError => {
	return isObject(error) && !isHTTPError(error) && !isValidationError(error);
};
