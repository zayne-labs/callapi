import { extraOptionDefaults } from "./constants/defaults";
import type { CallApiExtraOptions, ThrowOnErrorUnion } from "./types";
import type { DefaultDataType, DefaultThrowOnError } from "./types/default-types";
import type { AnyString, Awaitable, DistributiveOmit, UnmaskType } from "./types/type-helpers";
import { omitKeys } from "./utils/common";
import type { HTTPError, ValidationError } from "./utils/external/error";
import { isHTTPErrorInstance, isValidationErrorInstance } from "./utils/external/guards";

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

type ResponseTypeUnion = keyof InitResponseTypeMap;

type ResponseTypePlaceholder = null;

export type ResponseTypeType = ResponseTypePlaceholder | ResponseTypeUnion;

export type ResponseTypeMap<TResponse> = {
	[Key in keyof InitResponseTypeMap<TResponse>]: Awaited<ReturnType<InitResponseTypeMap<TResponse>[Key]>>;
};

export type GetResponseType<
	TResponse,
	TResponseType extends ResponseTypeType,
	TComputedResponseTypeMap extends ResponseTypeMap<TResponse> = ResponseTypeMap<TResponse>,
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

export const resolveResponseData = <TResponse>(
	response: Response,
	responseType: ResponseTypeType | undefined,
	parser: Parser<TResponse> | undefined
) => {
	const selectedParser = parser ?? extraOptionDefaults.responseParser;
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
	issueCause: ValidationError["issueCause"];
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

export type CallApiSuccessOrErrorVariant<TData, TError> =
	| CallApiResultErrorVariant<TError>
	| CallApiResultSuccessVariant<TData>;

export type ResultModeMapWithoutException<
	TData,
	TErrorData,
	TResponseType extends ResponseTypeType,
	TComputedData = GetResponseType<TData, TResponseType>,
	TComputedErrorData = GetResponseType<TErrorData, TResponseType>,
	TComputedResult extends CallApiSuccessOrErrorVariant<
		TComputedData,
		TComputedErrorData
	> = CallApiSuccessOrErrorVariant<TComputedData, TComputedErrorData>,
> = UnmaskType<{
	all: TComputedResult;
	onlyData: TComputedResult["data"];
	onlyResponse: TComputedResult["response"];
	withoutResponse: DistributiveOmit<TComputedResult, "response">;
}>;

type ResultModeMapWithException<
	TData,
	TResponseType extends ResponseTypeType,
	TComputedData = GetResponseType<TData, TResponseType>,
	TComputedResult extends
		CallApiResultSuccessVariant<TComputedData> = CallApiResultSuccessVariant<TComputedData>,
> = {
	all: TComputedResult;
	onlyData: TComputedResult["data"];
	onlyResponse: TComputedResult["response"];
	withoutResponse: DistributiveOmit<TComputedResult, "response">;
};

export type ResultModeMap<
	TData = DefaultDataType,
	TErrorData = DefaultDataType,
	TResponseType extends ResponseTypeType = ResponseTypeType,
	TThrowOnError extends ThrowOnErrorUnion = DefaultThrowOnError,
> =
	TThrowOnError extends true ? ResultModeMapWithException<TData, TResponseType>
	:	ResultModeMapWithoutException<TData, TErrorData, TResponseType>;

type ResultModePlaceholder = null;

type ResultModeUnion = keyof ResultModeMap;

// FIXME - Revisit this idea later. Take inspirations from how zod does it with pick({}) and omit({d})
// type ResultModeObject = { data?: boolean; error?: boolean; response?: boolean };

export type ResultModeType = ResultModePlaceholder | ResultModeUnion;

export type GetCallApiResult<
	TData,
	TErrorData,
	TResultMode extends ResultModeType,
	TThrowOnError extends ThrowOnErrorUnion,
	TResponseType extends ResponseTypeType,
	TComputedResultModeMapWithException extends ResultModeMapWithException<
		TData,
		TResponseType
	> = ResultModeMapWithException<TData, TResponseType>,
	TComputedResultModeMap extends ResultModeMap<
		TData,
		TErrorData,
		TResponseType,
		TThrowOnError
	> = ResultModeMap<TData, TErrorData, TResponseType, TThrowOnError>,
> =
	TErrorData extends false ? TComputedResultModeMapWithException["onlyData"]
	: TErrorData extends false | undefined ? TComputedResultModeMapWithException["onlyData"]
	: ResultModePlaceholder extends TResultMode ? TComputedResultModeMap["all"]
	: TResultMode extends ResultModeUnion ? TComputedResultModeMap[TResultMode]
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
		onlyData: () => details.data,
		onlyResponse: () => details.response,
		withoutResponse: () => omitKeys(details, ["response"]),
	};
};

type SuccessResult = CallApiResultSuccessVariant<unknown> | null;

// The CallApiResult type is used to cast all return statements due to a design limitation in ts.
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

type ErrorResult = {
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
