/**
 * Result mode tests - flat structure without nested describe blocks
 * Tests all result mode behaviors: all, onlyData, onlyResponse, fetchApi, withoutResponse
 */

import { expect, test, vi } from "vitest";
import { callApi } from "../../src/createFetchClient";
import { HTTPError } from "../../src/utils/external/error";
import { expectErrorResult, expectSuccessResult } from "../test-setup/assertions";
import {
	createFetchMock,
	createMockErrorResponse,
	createMockResponse,
	mockFetchError,
	mockFetchSuccess,
} from "../test-setup/fetch-mock";
import { mockHTTPError, mockUser } from "../test-setup/fixtures";

test("resultMode 'all' returns data, error, and response for success", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	const result = await callApi("https://api.example.com/users/1");

	expectSuccessResult(result);
	expect(result.data).toEqual(mockUser);
	expect(result.error).toBeNull();
	expect(result.response).toBeInstanceOf(Response);
});

test("resultMode 'onlyData' returns only data for success", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	const result = await callApi("https://api.example.com/users/1", {
		resultMode: "onlyData",
	});

	expect(result).toEqual(mockUser);
});

test("resultMode 'onlyResponse' returns only response for success", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	const result = await callApi("https://api.example.com/users/1", {
		resultMode: "onlyResponse",
		cloneResponse: true,
	});

	expect(result).toBeInstanceOf(Response);
	const data = await result?.json();
	expect(data).toEqual(mockUser);
});

test("resultMode 'fetchApi' returns raw response and skips internal parsing", async () => {
	using mockFetch = createFetchMock();
	const response = createMockResponse(mockUser);
	mockFetch.mockResolvedValue(response);

	const result = await callApi("https://api.example.com/users/1", {
		resultMode: "fetchApi",
	});

	expect(result).toBe(response);
	expect(result).toBeInstanceOf(Response);
});

test("resultMode 'fetchApi' has null data in hooks", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);
	const onSuccess = vi.fn();

	await callApi("https://api.example.com/users/1", {
		onSuccess,
		resultMode: "fetchApi",
	});

	expect(onSuccess).toHaveBeenCalledWith(
		expect.objectContaining({
			data: null,
		})
	);
});

test("resultMode 'fetchApi' skips data and errorData schema validation", async () => {
	const dataValidator = vi.fn((data) => data);
	const errorDataValidator = vi.fn((error) => error);
	const bodyValidator = vi.fn((body) => body);

	using mockFetch = createFetchMock();
	mockFetch.mockResolvedValue(createMockResponse({ success: true }));

	await callApi("https://api.example.com/data", {
		body: { foo: "bar" },
		resultMode: "fetchApi",
		schema: {
			body: bodyValidator,
			data: dataValidator,
			errorData: errorDataValidator,
		},
	});

	expect(bodyValidator).toHaveBeenCalled();
	expect(dataValidator).not.toHaveBeenCalled();
	expect(errorDataValidator).not.toHaveBeenCalled();

	// Test with error response
	mockFetch.mockResolvedValue(createMockResponse({ error: "failed" }, 400));
	await callApi("https://api.example.com/error", {
		resultMode: "fetchApi",
		schema: {
			data: dataValidator,
			errorData: errorDataValidator,
		},
	});
	expect(dataValidator).not.toHaveBeenCalled();
	expect(errorDataValidator).not.toHaveBeenCalled();
});

test("resultMode 'withoutResponse' returns data and error without response", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	const result = await callApi("https://api.example.com/users/1", {
		resultMode: "withoutResponse",
	});

	expect(result).toEqual({
		data: mockUser,
		error: null,
	});

	expect((result as { response?: Response }).response).toBeUndefined();
});

test("resultMode 'all' returns error structure for HTTP errors", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchError(mockHTTPError, 404);

	const result = await callApi("https://api.example.com/users/999", {
		resultMode: "all",
	});

	expectErrorResult(result);
	expect(result.data).toBeNull();
	expect(result.error.name).toBe("HTTPError");
	expect(result.error.errorData).toEqual(mockHTTPError);
	expect(result.response).toBeInstanceOf(Response);
	expect(result.response?.status).toBe(404);
});

test("resultMode 'onlyData' returns null for HTTP errors", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchError(mockHTTPError, 404);

	const result = await callApi("https://api.example.com/users/999", {
		resultMode: "onlyData",
	});

	expect(result).toBeNull();
});

test("resultMode 'onlyResponse' returns response for HTTP errors", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchError(mockHTTPError, 404);

	const result = await callApi("https://api.example.com/users/999", {
		resultMode: "onlyResponse",
	});

	expect(result).toBeInstanceOf(Response);
	expect(result?.status).toBe(404);
});

test("resultMode 'fetchApi' returns raw response for HTTP errors", async () => {
	using mockFetch = createFetchMock();
	const response = createMockErrorResponse(mockHTTPError, 404);
	mockFetch.mockResolvedValue(response);

	const result = await callApi("https://api.example.com/users/999", {
		resultMode: "fetchApi",
	});

	expect(result).toBe(response);
	expect(result?.status).toBe(404);
});

test("resultMode 'withoutResponse' returns error without response", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchError(mockHTTPError, 404);

	const result = await callApi("https://api.example.com/users/999", {
		resultMode: "withoutResponse",
	});

	expect(result).toEqual({
		data: null,
		error: expect.objectContaining({
			name: "HTTPError",
			errorData: mockHTTPError,
		}),
	});
	// @ts-expect-error - response should be omitted
	expect(result.response).toBeUndefined();
});

test("resultMode 'all' with throwOnError true returns data structure on success", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	const result = await callApi("https://api.example.com/users/1", {
		resultMode: "all",
		throwOnError: true,
	});

	expect(result).toEqual({
		data: mockUser,
		error: null,
		response: expect.any(Response),
	});
});

test("resultMode 'onlyData' with throwOnError true returns only data on success", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	const result = await callApi("https://api.example.com/users/1", {
		resultMode: "onlyData",
		throwOnError: true,
	});

	expect(result).toEqual(mockUser);
});

test("throwOnError true throws HTTPError instead of returning", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchError(mockHTTPError, 404);

	await expect(
		callApi("https://api.example.com/users/999", {
			resultMode: "onlyData",
			throwOnError: true,
		})
	).rejects.toThrow(HTTPError);
});
