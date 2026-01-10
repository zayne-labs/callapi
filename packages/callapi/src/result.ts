import { extraOptionDefaults } from "./constants/defaults";
import type { CallApiExtraOptions } from "./types/common";
import type { ThrowOnErrorBoolean } from "./types/conditional-types";
import type { DefaultDataType, DefaultThrowOnError } from "./types/default-types";
import type {
	AnyString,
	Awaitable,
	DistributiveOmit,
	NoInferUnMasked,
	Prettify,
	UnmaskType,
} from "./types/type-helpers";
import { omitKeys } from "./utils/common";
import type { HTTPError, ValidationError } from "./utils/external/error";
import { isHTTPErrorInstance, isValidationErrorInstance } from "./utils/external/guards";

export type ResponseType = "blob" | "json" | "text";

export type ResponseParser<TData> = (text: string) => Awaitable<TData>;

export const getResponseType = <TData>(response: Response, responseParser: ResponseParser<TData>) => ({
	arrayBuffer: () => response.arrayBuffer(),
	blob: () => response.blob(),
	formData: () => response.formData(),
	json: async (): Promise<TData> => {
		const text = await response.text();
		return responseParser(text);
	},
	stream: () => response.body,
	text: () => response.text(),
});

type InitResponseTypeMap<TData = unknown> = ReturnType<typeof getResponseType<TData>>;

type ResponseTypeUnion = keyof InitResponseTypeMap;

type ResponseTypePlaceholder = null;

export type ResponseTypeType = ResponseTypePlaceholder | ResponseTypeUnion;

export type ResponseTypeMap<TData> = {
	[Key in keyof InitResponseTypeMap<TData>]: Awaited<ReturnType<InitResponseTypeMap<TData>[Key]>>;
};

export type GetResponseType<
	TData,
	TResponseType extends ResponseTypeType,
	TComputedResponseTypeMap extends ResponseTypeMap<TData> = ResponseTypeMap<TData>,
> =
	null extends TResponseType ? TComputedResponseTypeMap["json"]
	: TResponseType extends NonNullable<ResponseTypeType> ? TComputedResponseTypeMap[TResponseType]
	: never;

const textTypes = new Set(["image/svg", "application/xml", "application/xhtml", "application/html"]);
const JSON_REGEX = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;

const detectResponseType = (response: Response): Extract<ResponseTypeType, "blob" | "json" | "text"> => {
	const initContentType = response.headers.get("content-type");

	if (!initContentType) {
		return extraOptionDefaults.responseType;
	}

	const contentType = initContentType.split(";")[0] ?? "";

	if (JSON_REGEX.test(contentType)) {
		return "json";
	}

	if (textTypes.has(contentType) || contentType.startsWith("text/")) {
		return "text";
	}

	return "blob";
};

export const resolveResponseData = async (options: {
	response: Response;
	responseParser: CallApiExtraOptions["responseParser"];
	responseType: CallApiExtraOptions["responseType"];
	resultMode: CallApiExtraOptions["resultMode"];
}) => {
	const { response, responseParser, responseType, resultMode } = options;

	// == If the result mode is set to `fetchApi`, then don't try to resolve the responseData and just return null
	if (resultMode === "fetchApi") {
		return null;
	}

	const selectedParser = responseParser ?? extraOptionDefaults.responseParser;
	const selectedResponseType = responseType ?? detectResponseType(response);

	const RESPONSE_TYPE_LOOKUP = getResponseType(response, selectedParser);

	if (!Object.hasOwn(RESPONSE_TYPE_LOOKUP, selectedResponseType)) {
		throw new Error(`Invalid response type: ${selectedResponseType}`);
	}

	return RESPONSE_TYPE_LOOKUP[selectedResponseType]();
};

export type CallApiResultSuccessVariant<TData> = {
	data: NoInferUnMasked<TData>;
	error: null;
	response: Response;
};
export type PossibleJavaScriptError = UnmaskType<{
	errorData: false;
	message: string;
	name: "AbortError" | "Error" | "SyntaxError" | "TimeoutError" | "TypeError" | AnyString;
	originalError: DOMException | Error | SyntaxError | TypeError;
}>;

export type PossibleHTTPError<TErrorData> = UnmaskType<{
	errorData: NoInferUnMasked<TErrorData>;
	message: string;
	name: "HTTPError";
	originalError: HTTPError;
}>;

export type PossibleValidationError = UnmaskType<{
	errorData: ValidationError["errorData"];
	issueCause: ValidationError["issueCause"];
	message: string;
	name: "ValidationError";
	originalError: ValidationError;
}>;

export type CallApiResultErrorVariant<TErrorData> =
	| {
			data: null;
			error: PossibleHTTPError<TErrorData>;
			response: Response;
	  }
	| {
			data: null;
			error: PossibleJavaScriptError;
			response: Response | null;
	  }
	| {
			data: null;
			error: PossibleValidationError;
			response: Response | null;
	  };

export type CallApiResultSuccessOrErrorVariant<TData, TError> =
	| CallApiResultErrorVariant<TError>
	| CallApiResultSuccessVariant<TData>;

type GetCallApiResult<
	TThrowOnError extends ThrowOnErrorBoolean,
	TResultWithException extends CallApiResultSuccessVariant<unknown>,
	TResultWithoutException extends CallApiResultSuccessOrErrorVariant<unknown, unknown>,
> = TThrowOnError extends true ? TResultWithException : TResultWithoutException;

export type ResultModeMap<
	TData = DefaultDataType,
	TErrorData = DefaultDataType,
	TThrowOnError extends ThrowOnErrorBoolean = DefaultThrowOnError,
	TComputedResult extends GetCallApiResult<
		TThrowOnError,
		CallApiResultSuccessVariant<TData>,
		CallApiResultSuccessOrErrorVariant<TData, TErrorData>
	> = GetCallApiResult<
		TThrowOnError,
		CallApiResultSuccessVariant<TData>,
		CallApiResultSuccessOrErrorVariant<TData, TErrorData>
	>,
> = UnmaskType<{
	all: TComputedResult;
	fetchApi: TComputedResult["response"];
	onlyData: TComputedResult["data"];
	onlyResponse: TComputedResult["response"];
	withoutResponse: Prettify<DistributiveOmit<TComputedResult, "response">>;
}>;

type ResultModePlaceholder = null;

type ResultModeUnion = keyof ResultModeMap;

// FIXME - Revisit this idea later. Take inspirations from how zod does it with pick({}) and omit({d})
// type ResultModeObject = { data?: boolean; error?: boolean; response?: boolean };

export type ResultModeType = ResultModePlaceholder | ResultModeUnion;

export type InferCallApiResult<
	TData,
	TErrorData,
	TResultMode extends ResultModeType,
	TThrowOnError extends ThrowOnErrorBoolean,
	TComputedResultModeMapWithException extends ResultModeMap<TData, TErrorData, true> = ResultModeMap<
		TData,
		TErrorData,
		true
	>,
	TComputedResultModeMapWithoutException extends ResultModeMap<TData, TErrorData, TThrowOnError> =
		ResultModeMap<TData, TErrorData, TThrowOnError>,
> =
	TErrorData extends false ? TComputedResultModeMapWithException["onlyData"]
	: TErrorData extends false | undefined ? TComputedResultModeMapWithException["onlyData"]
	: ResultModePlaceholder extends TResultMode ? TComputedResultModeMapWithoutException["all"]
	: TResultMode extends ResultModeUnion ? TComputedResultModeMapWithoutException[TResultMode]
	: never;

type SuccessInfo = Pick<CallApiExtraOptions, "resultMode"> & {
	response: Response;
};

type LazyResultModeMap = {
	[key in keyof ResultModeMap]: () => ResultModeMap[key];
};

const getResultModeMap = (details: ResultModeMap["all"]): LazyResultModeMap => {
	return {
		all: () => details,
		fetchApi: () => details.response,
		onlyData: () => details.data,
		onlyResponse: () => details.response,
		withoutResponse: () => omitKeys(details, ["response"]),
	};
};

type SuccessResult = CallApiResultSuccessVariant<unknown> | null;

// The return statement is casted due to a design limitation in ts.
// LINK - See https://www.zhenghao.io/posts/type-functions for more info
export const resolveSuccessResult = (data: unknown, info: SuccessInfo): SuccessResult => {
	const { response, resultMode } = info;

	const details = {
		data,
		error: null,
		response,
	} satisfies CallApiResultSuccessVariant<unknown>;

	const resultModeMap = getResultModeMap(details);

	const successResult = resultModeMap[resultMode ?? "all"]();

	return successResult as SuccessResult;
};

export type ErrorInfo = Omit<SuccessInfo, "response">
	& Pick<CallApiExtraOptions, "cloneResponse"> & {
		message?: string;
	};

export type ErrorResult = {
	errorDetails: CallApiResultErrorVariant<unknown>;
	errorResult: CallApiResultErrorVariant<unknown> | null;
};

export const resolveErrorResult = (error: unknown, info: ErrorInfo): ErrorResult => {
	const { cloneResponse, message: customErrorMessage, resultMode } = info;

	let errorDetails = {
		data: null,
		error: {
			errorData: false,
			message: customErrorMessage ?? (error as Error).message,
			name: (error as Error).name,
			originalError: error as Error,
		},
		response: null,
	} satisfies CallApiResultErrorVariant<unknown> as CallApiResultErrorVariant<unknown>;

	if (isValidationErrorInstance(error)) {
		const { errorData, message, response } = error;

		errorDetails = {
			data: null,
			error: {
				errorData,
				issueCause: error.issueCause,
				message,
				name: "ValidationError",
				originalError: error,
			},
			response,
		};
	}

	if (isHTTPErrorInstance<never>(error)) {
		const { errorData, message, name, response } = error;

		errorDetails = {
			data: null,
			error: { errorData, message, name, originalError: error },
			response: cloneResponse ? response.clone() : response,
		};
	}

	const resultModeMap = getResultModeMap(errorDetails);

	const errorResult = resultModeMap[resultMode ?? "all"]() as never;

	return { errorDetails, errorResult };
};

export const getCustomizedErrorResult = (
	errorResult: ErrorResult["errorResult"],
	customErrorInfo: { message: string | undefined }
): ErrorResult["errorResult"] => {
	if (!errorResult) {
		return null;
	}

	const { message = errorResult.error.message } = customErrorInfo;

	return {
		...errorResult,
		error: {
			...errorResult.error,
			message,
		} satisfies NonNullable<ErrorResult["errorResult"]>["error"] as never,
	};
};
