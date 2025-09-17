import { extraOptionDefaults } from "./constants/default-options";
import type { HTTPError, ValidationError } from "./error";
import type { CallApiExtraOptions, ThrowOnErrorUnion } from "./types";
import type { DefaultDataType } from "./types/default-types";
import type { AnyString, Awaitable, UnmaskType } from "./types/type-helpers";
import { isHTTPErrorInstance, isValidationErrorInstance } from "./utils/guards";

export type ResponseType = "blob" | "json" | "text";

type Parser<TData> = (responseString: string) => Awaitable<TData>;

export const getResponseType = <TResponse>(response: Response, parser: Parser<TResponse>) => ({
	arrayBuffer: () => response.arrayBuffer(),
	blob: () => response.blob(),
	formData: () => response.formData(),
	json: async (): Promise<TResponse> => {
		const text = await response.text();
		return parser(text);
	},
	stream: () => response.body,
	text: () => response.text(),
});

type InitResponseTypeMap<TResponse = unknown> = ReturnType<typeof getResponseType<TResponse>>;

export type ResponseTypeUnion = keyof InitResponseTypeMap | null;

export type ResponseTypeMap<TResponse> = {
	[Key in keyof InitResponseTypeMap<TResponse>]: Awaited<ReturnType<InitResponseTypeMap<TResponse>[Key]>>;
};

export type GetResponseType<
	TResponse,
	TResponseType extends ResponseTypeUnion,
	TComputedResponseTypeMap extends ResponseTypeMap<TResponse> = ResponseTypeMap<TResponse>,
> =
	null extends TResponseType ? TComputedResponseTypeMap["json"]
	: TResponseType extends NonNullable<ResponseTypeUnion> ? TComputedResponseTypeMap[TResponseType]
	: never;

const textTypes = new Set(["image/svg", "application/xml", "application/xhtml", "application/html"]);
const JSON_REGEX = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;

const detectResponseType = (response: Response): Extract<ResponseTypeUnion, "blob" | "json" | "text"> => {
	const initContentType = response.headers.get("content-type");

	if (!initContentType) {
		return extraOptionDefaults().responseType;
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

export const resolveResponseData = <TResponse>(
	response: Response,
	responseType: ResponseTypeUnion | undefined,
	parser: Parser<TResponse> | undefined
) => {
	const selectedParser = parser ?? extraOptionDefaults().responseParser;
	const selectedResponseType = responseType ?? detectResponseType(response);

	const RESPONSE_TYPE_LOOKUP = getResponseType<TResponse>(response, selectedParser);

	if (!Object.hasOwn(RESPONSE_TYPE_LOOKUP, selectedResponseType)) {
		throw new Error(`Invalid response type: ${responseType}`);
	}

	return RESPONSE_TYPE_LOOKUP[selectedResponseType]();
};

export type CallApiResultSuccessVariant<TData> = {
	data: NoInfer<TData>;
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
	errorData: NoInfer<TErrorData>;
	message: string;
	name: "HTTPError";
	originalError: HTTPError;
}>;

export type PossibleValidationError = UnmaskType<{
	errorData: ValidationError["errorData"];
	message: string;
	name: "ValidationError";
	originalError: ValidationError;
}>;

export type PossibleJavaScriptOrValidationError = UnmaskType<
	PossibleJavaScriptError | PossibleValidationError
>;

export type CallApiResultErrorVariant<TErrorData> =
	| {
			data: null;
			error: PossibleHTTPError<TErrorData>;
			response: Response;
	  }
	| {
			data: null;
			error: PossibleJavaScriptOrValidationError;
			response: Response | null;
	  };

export type ResultModeMapWithoutException<
	TData,
	TErrorData,
	TResponseType extends ResponseTypeUnion,
	TComputedData = GetResponseType<TData, TResponseType>,
	TComputedErrorData = GetResponseType<TErrorData, TResponseType>,
> = UnmaskType<{
	all: CallApiResultErrorVariant<TComputedErrorData> | CallApiResultSuccessVariant<TComputedData>;

	onlyData:
		| CallApiResultErrorVariant<TComputedErrorData>["data"]
		| CallApiResultSuccessVariant<TComputedData>["data"];
}>;

type ResultModeMapWithException<
	TData,
	TResponseType extends ResponseTypeUnion,
	TComputedData = GetResponseType<TData, TResponseType>,
> = {
	all: CallApiResultSuccessVariant<TComputedData>;
	onlyData: CallApiResultSuccessVariant<TComputedData>["data"];
};

export type ResultModeMap<
	TData = DefaultDataType,
	TErrorData = DefaultDataType,
	TResponseType extends ResponseTypeUnion = ResponseTypeUnion,
	TThrowOnError extends ThrowOnErrorUnion = false,
> =
	TThrowOnError extends true ? ResultModeMapWithException<TData, TResponseType>
	:	ResultModeMapWithoutException<TData, TErrorData, TResponseType>;

type ResultModePlaceholder = null;

// eslint-disable-next-line perfectionist/sort-union-types -- Allow
export type ResultModeUnion = keyof ResultModeMap | ResultModePlaceholder;

export type GetCallApiResult<
	TData,
	TErrorData,
	TResultMode extends ResultModeUnion,
	TThrowOnError extends ThrowOnErrorUnion,
	TResponseType extends ResponseTypeUnion,
> =
	TErrorData extends false ? ResultModeMapWithException<TData, TResponseType>["onlyData"]
	: TErrorData extends false | undefined ? ResultModeMapWithException<TData, TResponseType>["onlyData"]
	: ResultModePlaceholder extends TResultMode ?
		ResultModeMap<TData, TErrorData, TResponseType, TThrowOnError>["all"]
	: TResultMode extends Exclude<ResultModeUnion, ResultModePlaceholder> ?
		ResultModeMap<TData, TErrorData, TResponseType, TThrowOnError>[TResultMode]
	:	never;

type SuccessInfo = {
	response: Response;
	resultMode: CallApiExtraOptions["resultMode"];
};

type LazyResultModeMap = {
	[key in keyof ResultModeMap]: () => ResultModeMap[key];
};

const getResultModeMap = (details: ResultModeMap["all"]): LazyResultModeMap => {
	return {
		all: () => details,
		onlyData: () => details.data,
	};
};

type SuccessResult = CallApiResultSuccessVariant<unknown> | null;

// == The CallApiResult type is used to cast all return statements due to a design limitation in ts.
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

export type ErrorInfo = {
	cloneResponse: CallApiExtraOptions["cloneResponse"];
	message?: string;
	resultMode: CallApiExtraOptions["resultMode"];
};

type ErrorResult = {
	errorDetails: CallApiResultErrorVariant<unknown>;
	generalErrorResult: CallApiResultErrorVariant<unknown> | null;
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
			error: { errorData, message, name: "ValidationError", originalError: error },
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

	const generalErrorResult = resultModeMap[resultMode ?? "all"]() as never;

	return {
		errorDetails,
		generalErrorResult,
	};
};

export const getCustomizedErrorResult = (
	errorResult: ErrorResult["generalErrorResult"],
	customErrorInfo: { message: string | undefined }
): ErrorResult["generalErrorResult"] => {
	if (!errorResult) {
		return null;
	}

	const { message = errorResult.error.message } = customErrorInfo;

	return {
		...errorResult,
		error: {
			...errorResult.error,
			message,
		} satisfies NonNullable<ErrorResult["generalErrorResult"]>["error"] as never,
	};
};
