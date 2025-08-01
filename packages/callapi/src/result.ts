import { extraOptionDefaults } from "./constants/default-options";
import type { HTTPError, ValidationError } from "./error";
import type { CallApiExtraOptions, ThrowOnErrorUnion } from "./types";
import type { DefaultDataType } from "./types/default-types";
import type { AnyString, Awaitable, UnmaskType } from "./types/type-helpers";
import { isHTTPErrorInstance, isValidationErrorInstance } from "./utils/guards";

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

export const resolveResponseData = <TResponse>(
	response: Response,
	responseType?: ResponseTypeUnion,
	parser?: Parser<TResponse>
) => {
	const selectedParser = parser ?? extraOptionDefaults().responseParser;
	const selectedResponseType = responseType ?? extraOptionDefaults().responseType;

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

export type ResultModeMap<
	TData = DefaultDataType,
	TErrorData = DefaultDataType,
	TResponseType extends ResponseTypeUnion = ResponseTypeUnion,
	TComputedData = GetResponseType<TData, TResponseType>,
	TComputedErrorData = GetResponseType<TErrorData, TResponseType>,
> = UnmaskType<{
	/* eslint-disable perfectionist/sort-union-types -- I need the first one to be first */
	all: CallApiResultSuccessVariant<TComputedData> | CallApiResultErrorVariant<TComputedErrorData>;

	allWithException: CallApiResultSuccessVariant<TComputedData>;

	onlySuccess:
		| CallApiResultErrorVariant<TComputedErrorData>["data"]
		| CallApiResultSuccessVariant<TComputedData>["data"];

	onlySuccessWithException: CallApiResultSuccessVariant<TComputedData>["data"];
	/* eslint-enable perfectionist/sort-union-types -- I need the first one to be first */
}>;

export type ResultModeUnion = keyof ResultModeMap | null;

export type GetCallApiResult<
	TData,
	TErrorData,
	TResultMode extends ResultModeUnion,
	TThrowOnError extends ThrowOnErrorUnion,
	TResponseType extends ResponseTypeUnion,
> =
	TErrorData extends false ? ResultModeMap<TData, TErrorData, TResponseType>["onlySuccessWithException"]
	: TErrorData extends false | undefined ?
		ResultModeMap<TData, TErrorData, TResponseType>["onlySuccessWithException"]
	: TErrorData extends false | null ? ResultModeMap<TData, TErrorData, TResponseType>["onlySuccess"]
	: null extends TResultMode ?
		TThrowOnError extends true ?
			ResultModeMap<TData, TErrorData, TResponseType>["allWithException"]
		:	ResultModeMap<TData, TErrorData, TResponseType>["all"]
	: TResultMode extends NonNullable<ResultModeUnion> ?
		ResultModeMap<TData, TErrorData, TResponseType>[TResultMode]
	:	never;

type SuccessInfo = {
	response: Response;
	resultMode: CallApiExtraOptions["resultMode"];
};

type LazyResultModeMap = {
	[key in keyof ResultModeMap]: () => ResultModeMap[key];
};

const getResultModeMap = (
	details: CallApiResultErrorVariant<unknown> | CallApiResultSuccessVariant<unknown>
) => {
	const resultModeMap = {
		all: () => details,
		allWithException: () => resultModeMap.all() as never,
		onlySuccess: () => details.data,
		onlySuccessWithException: () => resultModeMap.onlySuccess(),
	} satisfies LazyResultModeMap as LazyResultModeMap;

	return resultModeMap;
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

type ErrorResult = CallApiResultErrorVariant<unknown> | null;

export const resolveErrorResult = (error: unknown, info: ErrorInfo): ErrorResult => {
	const { cloneResponse, message: customErrorMessage, resultMode } = info;

	let details = {
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

		details = {
			data: null,
			error: { errorData, message, name: "ValidationError", originalError: error },
			response,
		};
	}

	if (isHTTPErrorInstance<never>(error)) {
		const { errorData, message, name, response } = error;

		details = {
			data: null,
			error: { errorData, message, name, originalError: error },
			response: cloneResponse ? response.clone() : response,
		};
	}

	const resultModeMap = getResultModeMap(details);

	const errorResult = resultModeMap[resultMode ?? "all"]();

	return errorResult as ErrorResult;
};

export const getCustomizedErrorResult = (
	errorResult: ErrorResult,
	customErrorInfo: { message: string | undefined }
): ErrorResult => {
	if (!errorResult) {
		return null;
	}

	const { message = errorResult.error.message } = customErrorInfo;

	return {
		...errorResult,
		error: {
			...errorResult.error,
			message,
		} satisfies NonNullable<ErrorResult>["error"] as never,
	};
};
