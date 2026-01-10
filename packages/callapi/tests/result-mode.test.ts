import { describe, expect, it, vi } from "vitest";
import { callApi } from "../src/createFetchClient";
import { HTTPError } from "../src/utils/external/error";
import { mockHTTPError, mockUser } from "./fixtures";
import {
	createMockErrorResponse,
	createMockResponse,
	expectErrorResult,
	expectSuccessResult,
} from "./helpers";
import { mockFetch } from "./setup";

describe("resultMode behavior", () => {
	describe("success scenarios", () => {
		it("should handle resultMode: 'all' (default)", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const result = await callApi("https://api.example.com/users/1");

			expectSuccessResult(result);
			expect(result.data).toEqual(mockUser);
			expect(result.error).toBeNull();
			expect(result.response).toBeInstanceOf(Response);
		});

		it("should handle resultMode: 'onlyData'", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const result = await callApi("https://api.example.com/users/1", {
				resultMode: "onlyData",
			});

			expect(result).toEqual(mockUser);
		});

		it("should handle resultMode: 'onlyResponse'", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const result = await callApi("https://api.example.com/users/1", {
				resultMode: "onlyResponse",
				cloneResponse: true,
			});

			expect(result).toBeInstanceOf(Response);
			const data = await result?.json();
			expect(data).toEqual(mockUser);
		});

		it("should handle resultMode: 'fetchApi'", async () => {
			const response = createMockResponse(mockUser);
			mockFetch.mockResolvedValueOnce(response);

			const result = await callApi("https://api.example.com/users/1", {
				resultMode: "fetchApi",
			});

			// Should return the exact same response object and skip internal parsing
			expect(result).toBe(response);
			expect(result).toBeInstanceOf(Response);
		});

		it("should have null data in hooks when resultMode is 'fetchApi'", async () => {
			const onSuccess = vi.fn();
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

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

		it("should skip data and errorData schema validation when resultMode is 'fetchApi'", async () => {
			const dataValidator = vi.fn((data) => data);
			const errorDataValidator = vi.fn((error) => error);
			const bodyValidator = vi.fn((body) => body);

			mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));
			await callApi("https://api.example.com/data", {
				body: { foo: "bar" },
				resultMode: "fetchApi",
				schema: {
					body: bodyValidator,
					data: dataValidator,
					errorData: errorDataValidator,
				},
			});
			// Body validation SHOULD still run
			expect(bodyValidator).toHaveBeenCalled();
			// Data/ErrorData validation SHOULD NOT run
			expect(dataValidator).not.toHaveBeenCalled();
			expect(errorDataValidator).not.toHaveBeenCalled();

			// Test with error response
			mockFetch.mockResolvedValueOnce(createMockResponse({ error: "failed" }, 400));
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

		it("should handle resultMode: 'withoutResponse'", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const result = await callApi("https://api.example.com/users/1", {
				resultMode: "withoutResponse",
			});

			expect(result).toEqual({
				data: mockUser,
				error: null,
			});

			expect((result as { response?: Response }).response).toBeUndefined();
		});
	});

	describe("error scenarios", () => {
		it("should handle resultMode: 'all' on error", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockHTTPError, 404));

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

		it("should handle resultMode: 'onlyData' on error", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockHTTPError, 404));

			const result = await callApi("https://api.example.com/users/999", {
				resultMode: "onlyData",
			});

			expect(result).toBeNull();
		});

		it("should handle resultMode: 'onlyResponse' on error", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockHTTPError, 404));

			const result = await callApi("https://api.example.com/users/999", {
				resultMode: "onlyResponse",
			});

			expect(result).toBeInstanceOf(Response);
			expect(result?.status).toBe(404);
		});

		it("should handle resultMode: 'fetchApi' on error", async () => {
			const response = createMockErrorResponse(mockHTTPError, 404);
			mockFetch.mockResolvedValueOnce(response);

			const result = await callApi("https://api.example.com/users/999", {
				resultMode: "fetchApi",
			});

			expect(result).toBe(response);
			expect(result?.status).toBe(404);
		});

		it("should handle resultMode: 'withoutResponse' on error", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockHTTPError, 404));

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
	});

	describe("with throwOnError: true", () => {
		it("should return only data for resultMode: 'all' when throwOnError is true", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const result = await callApi("https://api.example.com/users/1", {
				resultMode: "all",
				throwOnError: true,
			});

			// Even with throwOnError: true, 'all' mode still returns the {data, error, response} structure
			// but 'error' is guaranteed to be null in the type.
			expect(result).toEqual({
				data: mockUser,
				error: null,
				response: expect.any(Response),
			});
		});

		it("should return only data for resultMode: 'onlyData' when throwOnError is true", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const result = await callApi("https://api.example.com/users/1", {
				resultMode: "onlyData",
				throwOnError: true,
			});

			expect(result).toEqual(mockUser);
		});

		it("should throw error and NOT return when throwOnError is true", async () => {
			mockFetch.mockResolvedValueOnce(createMockErrorResponse(mockHTTPError, 404));

			await expect(
				callApi("https://api.example.com/users/999", {
					resultMode: "onlyData",
					throwOnError: true,
				})
			).rejects.toThrow(HTTPError);
		});
	});
});
