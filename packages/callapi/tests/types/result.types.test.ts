import { expectTypeOf, test } from "vitest";
import {
	createFetchClient,
	type CallApiResult,
	type CallApiResultSuccessVariant,
	type DefaultCallApiContext,
} from "../../src";

type User = {
	id: string;
	name: string;
};

type ApiError = {
	code: string;
};

const client = createFetchClient({
	baseURL: "https://api.example.com",
});

test("Result types - infer every result mode", () => {
	const defaultResult = () => client<User, ApiError>("/users");
	const throwingResult = () =>
		client<User, ApiError, "all", DefaultCallApiContext, true>("/users", {
			resultMode: "all",
			throwOnError: true,
		});
	const nullableData = () =>
		client<User, ApiError, "onlyData">("/users", {
			resultMode: "onlyData",
		});
	const throwingData = () =>
		client<User, ApiError, "onlyData", DefaultCallApiContext, true>("/users", {
			resultMode: "onlyData",
			throwOnError: true,
		});
	const onlyResponse = () =>
		client<User, ApiError, "onlyResponse">("/users", {
			resultMode: "onlyResponse",
		});
	const fetchApi = () =>
		client<User, ApiError, "fetchApi">("/users", {
			resultMode: "fetchApi",
		});
	const withoutResponse = () =>
		client<User, ApiError, "withoutResponse">("/users", {
			resultMode: "withoutResponse",
		});

	expectTypeOf(defaultResult).returns.toEqualTypeOf<Promise<CallApiResult<User, ApiError, null>>>();
	expectTypeOf(throwingResult).returns.toEqualTypeOf<Promise<CallApiResultSuccessVariant<User>>>();
	expectTypeOf(nullableData).returns.toEqualTypeOf<Promise<User | null>>();
	expectTypeOf(throwingData).returns.toEqualTypeOf<Promise<User>>();
	expectTypeOf(onlyResponse).returns.toEqualTypeOf<Promise<Response | null>>();
	expectTypeOf(fetchApi).returns.toEqualTypeOf<Promise<Response | null>>();
	expectTypeOf(withoutResponse).returns.toEqualTypeOf<
		Promise<CallApiResult<User, ApiError, "withoutResponse">>
	>();
});

test("Result types - enforce false error-data constraints", () => {
	const validRequest = () =>
		client<unknown, false, "onlyData", DefaultCallApiContext, true>("/health", {
			resultMode: "onlyData",
			throwOnError: true,
		});

	const invalidResultMode = () =>
		client<unknown, false, "all", DefaultCallApiContext, true>("/health", {
			// @ts-expect-error -- false error data only supports the direct-data result
			resultMode: "all",
			// @ts-expect-error -- the invalid result mode makes this config impossible
			throwOnError: true,
		});

	const invalidThrowMode = () =>
		client<unknown, false, "onlyData", DefaultCallApiContext, false>("/health", {
			resultMode: "onlyData",
			// @ts-expect-error -- false error data requires errors to be thrown
			throwOnError: false,
		});

	expectTypeOf(validRequest).returns.toEqualTypeOf<Promise<unknown>>();
	expectTypeOf(invalidResultMode).toBeFunction();
	expectTypeOf(invalidThrowMode).toBeFunction();
});

test("Result types - map response types to their parsed data", () => {
	const textRequest = () =>
		client<unknown, unknown, "onlyData", DefaultCallApiContext, true, "text">("/text", {
			responseType: "text",
			resultMode: "onlyData",
			throwOnError: true,
		});
	const blobRequest = () =>
		client<unknown, unknown, "onlyData", DefaultCallApiContext, true, "blob">("/blob", {
			responseType: "blob",
			resultMode: "onlyData",
			throwOnError: true,
		});
	const streamRequest = () =>
		client<unknown, unknown, "onlyData", DefaultCallApiContext, true, "stream">("/stream", {
			responseType: "stream",
			resultMode: "onlyData",
			throwOnError: true,
		});

	expectTypeOf(textRequest).returns.toEqualTypeOf<Promise<string>>();
	expectTypeOf(blobRequest).returns.toEqualTypeOf<Promise<Blob>>();
	expectTypeOf(streamRequest).returns.toEqualTypeOf<
		Promise<ReadableStream<Uint8Array<ArrayBuffer>> | null>
	>();
});
