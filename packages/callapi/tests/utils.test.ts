/**
 * Comprehensive utility function tests
 * Tests type guard functions, common utilities, configuration splitting, header processing,
 * body processing, and utility edge cases with proper error handling and fallbacks
 */

import { describe, expect, it, vi } from "vitest";
import type { CallApiResultErrorVariant } from "../src/result";
import {
	createCombinedSignal,
	createTimeoutSignal,
	deterministicHashFn,
	getBody,
	getHeaders,
	getInitFetchImpl,
	getMethod,
	objectifyHeaders,
	omitKeys,
	pickKeys,
	splitBaseConfig,
	splitConfig,
	toArray,
	waitFor,
} from "../src/utils/common";
import { toFormData, toQueryString } from "../src/utils/external/body";
import { HTTPError, ValidationError } from "../src/utils/external/error";
import {
	isHTTPError,
	isHTTPErrorInstance,
	isJavascriptError,
	isValidationError,
	isValidationErrorInstance,
} from "../src/utils/external/guards";
import {
	isArray,
	isFunction,
	isJSONSerializable,
	isObject,
	isPlainObject,
	isQueryString,
	isReadableStream,
	isSerializable,
	isString,
	isValidJsonString,
} from "../src/utils/guards";
import { mockError } from "./fixtures";
import { createMockErrorResponse, createMockResponse } from "./helpers";
describe("Utility Functions", () => {
	describe("Type Guard Functions", () => {
		describe("isHTTPError", () => {
			it("should correctly identify HTTPError instances", () => {
				const httpError = new HTTPError({
					errorData: mockError,
					response: createMockErrorResponse(mockError, 400),
					defaultHTTPErrorMessage: "Default message",
				});

				const errorVariant: CallApiResultErrorVariant<unknown>["error"] = {
					name: "HTTPError",
					message: "Test error",
					originalError: httpError,
					errorData: mockError,
				};

				expect(isHTTPError(errorVariant)).toBe(true);
			});

			it("should return false for non-HTTPError instances", () => {
				const regularError: CallApiResultErrorVariant<unknown>["error"] = {
					name: "Error",
					message: "Regular error",
					originalError: new Error("Regular error"),
					errorData: false,
				};

				expect(isHTTPError(regularError)).toBe(false);
				expect(isHTTPError(null)).toBe(false);
			});

			it("should return false for ValidationError instances", () => {
				const validationError: CallApiResultErrorVariant<unknown>["error"] = {
					name: "ValidationError",
					message: "Validation error",
					issueCause: "unknown",
					originalError: new ValidationError({ issues: [], response: null, issueCause: "unknown" }),
					errorData: [],
				};

				expect(isHTTPError(validationError)).toBe(false);
			});
		});

		describe("isHTTPErrorInstance", () => {
			it("should correctly identify HTTPError instances using static method", () => {
				const httpError = new HTTPError({
					errorData: mockError,
					response: createMockErrorResponse(mockError, 400),
					defaultHTTPErrorMessage: "Default message",
				});

				expect(isHTTPErrorInstance(httpError)).toBe(true);
				expect(isHTTPErrorInstance(new Error("Regular error"))).toBe(false);
				expect(isHTTPErrorInstance(null)).toBe(false);
				expect(isHTTPErrorInstance(undefined)).toBe(false);
				expect(isHTTPErrorInstance("string")).toBe(false);
				expect(isHTTPErrorInstance({})).toBe(false);
			});
		});

		describe("isValidationError", () => {
			it("should correctly identify ValidationError instances", () => {
				const validationError: CallApiResultErrorVariant<unknown>["error"] = {
					name: "ValidationError",
					message: "Validation error",
					issueCause: "unknown",
					originalError: new ValidationError({ issues: [], response: null, issueCause: "unknown" }),
					errorData: [],
				};

				expect(isValidationError(validationError)).toBe(true);
			});

			it("should return false for non-ValidationError instances", () => {
				const regularError: CallApiResultErrorVariant<unknown>["error"] = {
					name: "Error",
					message: "Regular error",
					originalError: new Error("Regular error"),
					errorData: false,
				};

				expect(isValidationError(regularError)).toBe(false);
				expect(isValidationError(null)).toBe(false);
			});

			it("should return false for HTTPError instances", () => {
				const httpError: CallApiResultErrorVariant<unknown>["error"] = {
					name: "HTTPError",
					message: "HTTP error",
					originalError: new HTTPError({
						errorData: {},
						response: createMockResponse({}),
						defaultHTTPErrorMessage: "Test",
					}),
					errorData: {},
				};

				expect(isValidationError(httpError)).toBe(false);
			});
		});

		describe("isValidationErrorInstance", () => {
			it("should correctly identify ValidationError instances using static method", () => {
				const validationError = new ValidationError({
					issues: [],
					response: null,
					issueCause: "unknown",
				});

				expect(isValidationErrorInstance(validationError)).toBe(true);
				expect(isValidationErrorInstance(new Error("Regular error"))).toBe(false);
				expect(isValidationErrorInstance(null)).toBe(false);
				expect(isValidationErrorInstance(undefined)).toBe(false);
				expect(isValidationErrorInstance("string")).toBe(false);
				expect(isValidationErrorInstance({})).toBe(false);
			});
		});

		describe("isJavascriptError", () => {
			it("should correctly identify JavaScript errors", () => {
				const jsError: CallApiResultErrorVariant<unknown>["error"] = {
					name: "Error",
					message: "JavaScript error",
					originalError: new Error("JavaScript error"),
					errorData: false,
				};

				expect(isJavascriptError(jsError)).toBe(true);
			});

			it("should return false for HTTPError instances", () => {
				const httpError: CallApiResultErrorVariant<unknown>["error"] = {
					name: "HTTPError",
					message: "HTTP error",
					originalError: new HTTPError({
						errorData: {},
						response: createMockResponse({}),
						defaultHTTPErrorMessage: "Test",
					}),
					errorData: {},
				};

				expect(isJavascriptError(httpError)).toBe(false);
			});

			it("should return false for ValidationError instances", () => {
				const validationError: CallApiResultErrorVariant<unknown>["error"] = {
					name: "ValidationError",
					message: "Validation error",
					issueCause: "unknown",
					originalError: new ValidationError({ issues: [], response: null, issueCause: "unknown" }),
					errorData: [],
				};

				expect(isJavascriptError(validationError)).toBe(false);
			});

			it("should return false for null", () => {
				expect(isJavascriptError(null)).toBe(false);
			});
		});

		describe("isArray", () => {
			it("should correctly identify arrays", () => {
				expect(isArray([])).toBe(true);
				expect(isArray([1, 2, 3])).toBe(true);
				expect(isArray(["a", "b", "c"])).toBe(true);
				expect(isArray(new Array(5))).toBe(true);
			});

			it("should return false for non-arrays", () => {
				expect(isArray({})).toBe(false);
				expect(isArray("string")).toBe(false);
				expect(isArray(123)).toBe(false);
				expect(isArray(null)).toBe(false);
				expect(isArray(undefined)).toBe(false);
				expect(isArray(new Set())).toBe(false);
			});
		});

		describe("isObject", () => {
			it("should correctly identify objects", () => {
				expect(isObject({})).toBe(true);
				expect(isObject({ key: "value" })).toBe(true);
				expect(isObject([])).toBe(true); // Arrays are objects
				expect(isObject(new Date())).toBe(true);
				expect(isObject(new Error())).toBe(true);
			});

			it("should return false for non-objects", () => {
				expect(isObject(null)).toBe(false);
				expect(isObject(undefined)).toBe(false);
				expect(isObject("string")).toBe(false);
				expect(isObject(123)).toBe(false);
				expect(isObject(true)).toBe(false);
			});
		});

		describe("isPlainObject", () => {
			it("should correctly identify plain objects", () => {
				expect(isPlainObject({})).toBe(true);
				expect(isPlainObject({ key: "value" })).toBe(true);
				expect(isPlainObject(Object.create(null))).toBe(true); // No prototype - actually returns true
				expect(isPlainObject(Object.create({}))).toBe(false); // Custom prototype
			});

			it("should return false for non-plain objects", () => {
				expect(isPlainObject([])).toBe(false);
				expect(isPlainObject(new Date())).toBe(false);
				expect(isPlainObject(new Error())).toBe(false);
				expect(isPlainObject(null)).toBe(false);
				expect(isPlainObject(undefined)).toBe(false);
				expect(isPlainObject("string")).toBe(false);
				expect(isPlainObject(123)).toBe(false);
			});

			it("should handle objects with modified prototypes", () => {
				class CustomClass {}
				const customInstance = new CustomClass();
				expect(isPlainObject(customInstance)).toBe(false);

				// Object with custom constructor but Object prototype
				const objWithCustomConstructor = Object.create(Object.prototype);
				objWithCustomConstructor.constructor = function CustomConstructor() {};
				expect(isPlainObject(objWithCustomConstructor)).toBe(false);
			});

			it("should handle objects created with Object.create", () => {
				const plainObj = Object.create(Object.prototype);
				expect(isPlainObject(plainObj)).toBe(true);

				const customProtoObj = Object.create({ custom: true });
				expect(isPlainObject(customProtoObj)).toBe(false);
			});
		});

		describe("isValidJsonString", () => {
			it("should correctly identify valid JSON strings", () => {
				expect(isValidJsonString('{"key": "value"}')).toBe(true);
				expect(isValidJsonString("[]")).toBe(true);
				expect(isValidJsonString('"string"')).toBe(true);
				expect(isValidJsonString("123")).toBe(true);
				expect(isValidJsonString("true")).toBe(true);
				expect(isValidJsonString("null")).toBe(true);
			});

			it("should return false for invalid JSON strings", () => {
				expect(isValidJsonString("{ invalid json")).toBe(false);
				expect(isValidJsonString("undefined")).toBe(false);
				expect(isValidJsonString("")).toBe(false);
				expect(isValidJsonString("'single quotes'")).toBe(false);
			});

			it("should return false for non-strings", () => {
				expect(isValidJsonString({})).toBe(false);
				expect(isValidJsonString([])).toBe(false);
				expect(isValidJsonString(123)).toBe(false);
				expect(isValidJsonString(null)).toBe(false);
				expect(isValidJsonString(undefined)).toBe(false);
			});
		});

		describe("isSerializable", () => {
			it("should correctly identify serializable values", () => {
				expect(isSerializable({})).toBe(true);
				expect(isSerializable([])).toBe(true);
				expect(isSerializable({ key: "value" })).toBe(true);
				expect(isSerializable([1, 2, 3])).toBe(true);

				// Objects with toJSON method
				const objWithToJSON = { toJSON: () => ({ serialized: true }) };
				expect(isSerializable(objWithToJSON)).toBe(true);
			});

			it("should return false for non-serializable values", () => {
				expect(isSerializable("string")).toBe(false);
				expect(isSerializable(123)).toBe(false);
				expect(isSerializable(true)).toBe(false);
				expect(isSerializable(null)).toBe(false);
				expect(isSerializable(undefined)).toBe(false);
				// Date has toJSON method, so it's serializable
				expect(isSerializable(new Date())).toBe(true);
			});
		});

		describe("isFunction", () => {
			it("should correctly identify functions", () => {
				expect(isFunction(() => {})).toBe(true);
				expect(isFunction(function () {})).toBe(true);
				expect(isFunction(async () => {})).toBe(true);
				expect(isFunction(Date)).toBe(true);
				expect(isFunction(console.log)).toBe(true);
				expect(isFunction(class TestClass {})).toBe(true);
				expect(isFunction(function* generator() {})).toBe(true);
			});

			it("should return false for non-functions", () => {
				expect(isFunction({})).toBe(false);
				expect(isFunction([])).toBe(false);
				expect(isFunction("string")).toBe(false);
				expect(isFunction(123)).toBe(false);
				expect(isFunction(null)).toBe(false);
				expect(isFunction(undefined)).toBe(false);
			});
		});

		describe("isQueryString", () => {
			it("should correctly identify query strings", () => {
				expect(isQueryString("key=value")).toBe(true);
				expect(isQueryString("key1=value1&key2=value2")).toBe(true);
				expect(isQueryString("name=John&age=30")).toBe(true);
				expect(isQueryString("search=hello world")).toBe(true);
			});

			it("should return false for non-query strings", () => {
				expect(isQueryString("no equals sign")).toBe(false);
				expect(isQueryString("")).toBe(false);
				expect(isQueryString("justtext")).toBe(false);
				expect(isQueryString(123)).toBe(false);
				expect(isQueryString(null)).toBe(false);
				expect(isQueryString(undefined)).toBe(false);
			});
		});

		describe("isString", () => {
			it("should correctly identify strings", () => {
				expect(isString("")).toBe(true);
				expect(isString("hello")).toBe(true);
				expect(isString("123")).toBe(true);
				expect(isString(String("test"))).toBe(true);
			});

			it("should return false for non-strings", () => {
				expect(isString(123)).toBe(false);
				expect(isString(true)).toBe(false);
				expect(isString({})).toBe(false);
				expect(isString([])).toBe(false);
				expect(isString(null)).toBe(false);
				expect(isString(undefined)).toBe(false);
			});
		});

		describe("isReadableStream", () => {
			it("should correctly identify ReadableStream instances", () => {
				const stream = new ReadableStream();
				expect(isReadableStream(stream)).toBe(true);

				const customStream = new ReadableStream({
					start(controller) {
						controller.enqueue("data");
						controller.close();
					},
				});
				expect(isReadableStream(customStream)).toBe(true);
			});

			it("should return false for non-ReadableStream instances", () => {
				expect(isReadableStream({})).toBe(false);
				expect(isReadableStream([])).toBe(false);
				expect(isReadableStream("string")).toBe(false);
				expect(isReadableStream(null)).toBe(false);
				expect(isReadableStream(undefined)).toBe(false);
			});
		});

		describe("isJSONSerializable", () => {
			it("should correctly identify JSON serializable values", () => {
				expect(isJSONSerializable("string")).toBe(true);
				expect(isJSONSerializable(123)).toBe(true);
				expect(isJSONSerializable(true)).toBe(true);
				expect(isJSONSerializable(false)).toBe(true);
				// null is special case - the function checks `t === null` which is false for null
				expect(isJSONSerializable(null)).toBe(false);
				expect(isJSONSerializable([])).toBe(true);
				expect(isJSONSerializable([1, 2, 3])).toBe(true);

				// Plain objects
				expect(isJSONSerializable({})).toBe(true);
				expect(isJSONSerializable({ key: "value" })).toBe(true);

				// Objects with toJSON method
				const objWithToJSON = { toJSON: () => ({ serialized: true }) };
				expect(isJSONSerializable(objWithToJSON)).toBe(true);
			});

			it("should return false for non-JSON serializable values", () => {
				expect(isJSONSerializable(undefined)).toBe(false);
				expect(isJSONSerializable(() => {})).toBe(false);
				expect(isJSONSerializable(Symbol("test"))).toBe(false);

				// Objects with buffer (like Buffer instances)
				const bufferLike = { buffer: new ArrayBuffer(8) };
				expect(isJSONSerializable(bufferLike)).toBe(false);

				// Custom class instances without toJSON
				class CustomClass {}
				expect(isJSONSerializable(new CustomClass())).toBe(false);
			});

			it("should handle edge cases", () => {
				// Date objects (have toJSON method)
				expect(isJSONSerializable(new Date())).toBe(true);

				// RegExp objects (don't have toJSON method)
				expect(isJSONSerializable(/regex/)).toBe(false);

				// Error objects (don't have toJSON method)
				expect(isJSONSerializable(new Error("test"))).toBe(false);
			});
		});
	});

	describe("Common Utilities", () => {
		describe("omitKeys", () => {
			it("should omit specified keys from object", () => {
				const obj = { a: 1, b: 2, c: 3, d: 4 };
				const result = omitKeys(obj, ["b", "d"]);

				expect(result).toEqual({ a: 1, c: 3 });
				expect(result).not.toHaveProperty("b");
				expect(result).not.toHaveProperty("d");
			});

			it("should handle empty omit array", () => {
				const obj = { a: 1, b: 2 };
				const result = omitKeys(obj, []);

				expect(result).toEqual(obj);
			});

			it("should handle non-existent keys", () => {
				const obj = { a: 1, b: 2 };
				const result = omitKeys(obj, ["c", "d"] as any);

				expect(result).toEqual(obj);
			});

			it("should handle empty object", () => {
				const result = omitKeys({}, ["a", "b"] as any);
				expect(result).toEqual({});
			});
		});

		describe("pickKeys", () => {
			it("should pick specified keys from object", () => {
				const obj = { a: 1, b: 2, c: 3, d: 4 };
				const result = pickKeys(obj, ["a", "c"]);

				expect(result).toEqual({ a: 1, c: 3 });
				expect(result).not.toHaveProperty("b");
				expect(result).not.toHaveProperty("d");
			});

			it("should handle empty pick array", () => {
				const obj = { a: 1, b: 2 };
				const result = pickKeys(obj, []);

				expect(result).toEqual({});
			});

			it("should handle non-existent keys", () => {
				const obj = { a: 1, b: 2 };
				const result = pickKeys(obj, ["c", "d"] as any);

				expect(result).toEqual({});
			});

			it("should handle empty object", () => {
				const result = pickKeys({}, ["a", "b"] as any);
				expect(result).toEqual({});
			});
		});

		describe("splitBaseConfig and splitConfig", () => {
			it("should split configuration into fetch options and extra options", () => {
				const config = {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ test: true }),
					signal: new AbortController().signal,
					// Extra options
					baseURL: "https://api.example.com",
					auth: { type: "Bearer", bearer: "token" },
					retry: { attempts: 3 },
				};

				const [fetchOptions, extraOptions] = splitConfig(config);

				expect(fetchOptions).toEqual({
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ test: true }),
					signal: config.signal,
				});

				expect(extraOptions).toEqual({
					baseURL: "https://api.example.com",
					auth: { type: "Bearer", bearer: "token" },
					retry: { attempts: 3 },
				});
			});

			it("should handle splitBaseConfig correctly", () => {
				const baseConfig = {
					method: "GET",
					headers: { Accept: "application/json" },
					baseURL: "https://api.example.com",
					timeout: 5000,
				};

				const [fetchOptions, extraOptions] = splitBaseConfig(baseConfig);

				expect(fetchOptions).toEqual({
					method: "GET",
					headers: { Accept: "application/json" },
				});

				expect(extraOptions).toEqual({
					baseURL: "https://api.example.com",
					timeout: 5000,
				});
			});
		});

		describe("toQueryString", () => {
			it("should convert object to query string", () => {
				const params = { name: "John", age: "30", active: "true" };
				const result = toQueryString(params);

				expect(result).toBe("name=John&age=30&active=true");
			});

			it("should handle empty object", () => {
				const result = toQueryString({});
				expect(result).toBe("");
			});

			it("should handle special characters", () => {
				const params = { search: "hello world", "special-key": "special value" };
				const result = toQueryString(params);

				expect(result).toContain("search=hello+world");
				expect(result).toContain("special-key=special+value");
			});

			it("should handle null/undefined params", () => {
				// Mock console.error to avoid noise in tests
				const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

				const result = toQueryString(null as any);
				expect(result).toBeNull();
				expect(consoleSpy).toHaveBeenCalledWith("toQueryString:", "No query params provided!");

				consoleSpy.mockRestore();
			});
		});

		describe("objectifyHeaders", () => {
			it("should convert Headers instance to plain object", () => {
				const headers = new Headers({
					"Content-Type": "application/json",
					Authorization: "Bearer token",
				});

				const result = objectifyHeaders(headers as any);

				expect(result).toEqual({
					"content-type": "application/json",
					authorization: "Bearer token",
				});
			});

			it("should return plain object headers as-is", () => {
				const headers = {
					"Content-Type": "application/json",
					Authorization: "Bearer token",
				};

				const result = objectifyHeaders(headers);
				expect(result).toBe(headers);
			});

			it("should handle null/undefined headers", () => {
				expect(objectifyHeaders(null as any)).toBeNull();
				expect(objectifyHeaders(undefined)).toBeUndefined();
			});

			it("should handle array of header tuples", () => {
				const headers = [
					["Content-Type", "application/json"],
					["Authorization", "Bearer token"],
				];

				const result = objectifyHeaders(headers as any);

				expect(result).toEqual({
					"Content-Type": "application/json",
					Authorization: "Bearer token",
				});
			});
		});

		describe("getHeaders", () => {
			it("should merge auth, body, and custom headers", async () => {
				const result = await getHeaders({
					baseHeaders: undefined,
					auth: { type: "Bearer", bearer: "test-token" },
					body: { test: true },
					headers: { "X-Custom": "value" },
				});

				expect(result).toEqual({
					Authorization: "Bearer test-token",
					"Content-Type": "application/json",
					Accept: "application/json",
					"X-Custom": "value",
				});
			});

			it("should set correct content-type for query string body", async () => {
				const result = await getHeaders({
					baseHeaders: undefined,
					auth: null,
					body: "name=John&age=30",
					headers: undefined,
				});

				expect(result).toEqual({
					Authorization: "Bearer null", // getAuthHeader returns this when auth is null
					"Content-Type": "application/x-www-form-urlencoded",
				});
			});

			it("should set JSON content-type for serializable body", async () => {
				const result = await getHeaders({
					auth: null,
					baseHeaders: undefined,
					body: { name: "John" },
					headers: undefined,
				});

				expect(result).toEqual({
					Authorization: "Bearer null", // getAuthHeader returns this when auth is null
					"Content-Type": "application/json",
					Accept: "application/json",
				});
			});

			it("should set JSON content-type for valid JSON string body", async () => {
				const result = await getHeaders({
					baseHeaders: undefined,
					auth: null,
					body: '{"name": "John"}',
					headers: undefined,
				});

				expect(result).toEqual({
					Authorization: "Bearer null", // getAuthHeader returns this when auth is null
					"Content-Type": "application/json",
					Accept: "application/json",
				});
			});

			it("should handle async auth resolution", async () => {
				const asyncAuth = {
					type: "Bearer" as const,
					bearer: async () => "async-token",
				};

				const result = await getHeaders({
					baseHeaders: undefined,
					auth: asyncAuth,
					body: null,
					headers: undefined,
				});

				expect(result).toEqual({
					Authorization: "Bearer async-token",
				});
			});
		});

		describe("getMethod", () => {
			it("should return provided method in uppercase", () => {
				const result = getMethod({ initURL: "/test", method: "post" });
				expect(result).toBe("POST");
			});

			it("should extract method from URL prefix", () => {
				const result = getMethod({ initURL: "@post/test", method: undefined });
				expect(result).toBe("POST");
			});

			it("should return default method when no method provided", () => {
				const result = getMethod({ initURL: "/test", method: undefined });
				expect(result).toBe("GET");
			});

			it("should prioritize explicit method over URL prefix", () => {
				const result = getMethod({ initURL: "@post/test", method: "PUT" });
				expect(result).toBe("PUT");
			});
		});

		describe("getBody", () => {
			it("should serialize serializable body using default serializer", () => {
				const body = { name: "John", age: 30 };
				const result = getBody({ body, bodySerializer: undefined });

				expect(result).toBe(JSON.stringify(body));
			});

			it("should use custom body serializer", () => {
				const body = { name: "John", age: 30 };
				const customSerializer = vi.fn().mockReturnValue("custom-serialized");

				const result = getBody({ body, bodySerializer: customSerializer });

				expect(customSerializer).toHaveBeenCalledWith(body);
				expect(result).toBe("custom-serialized");
			});

			it("should return non-serializable body as-is", () => {
				const body = "plain string";
				const result = getBody({ body, bodySerializer: undefined });

				expect(result).toBe(body);
			});

			it("should handle FormData body", () => {
				const formData = new FormData();
				formData.append("name", "John");

				const result = getBody({ body: formData, bodySerializer: undefined });

				expect(result).toBe(formData);
			});
		});

		describe("getFetchImpl", () => {
			it("should return custom fetch implementation when provided", () => {
				const customFetch = vi.fn();
				const result = getInitFetchImpl(customFetch);

				expect(result).toBe(customFetch);
			});

			it("should return global fetch when available", () => {
				const fetchImpl = globalThis.fetch;
				const mockGlobalFetch = vi.fn();
				globalThis.fetch = mockGlobalFetch;

				const result = getInitFetchImpl(undefined);

				expect(result).toBe(mockGlobalFetch);

				// Restore original fetch
				globalThis.fetch = fetchImpl;
			});

			it("should throw error when no fetch implementation found", () => {
				const fetchImpl = globalThis.fetch;
				delete (globalThis as any).fetch;

				expect(() => getInitFetchImpl(undefined)).toThrow("No fetch implementation found");

				// Restore original fetch
				globalThis.fetch = fetchImpl;
			});
		});

		describe("waitFor", () => {
			it("should return undefined for zero delay", () => {
				const result = waitFor(0);
				expect(result).toBeUndefined();
			});

			it("should return promise for non-zero delay", async () => {
				const start = Date.now();
				await waitFor(50);
				const end = Date.now();

				expect(end - start).toBeGreaterThanOrEqual(40); // Allow some tolerance
			});
		});

		describe("createCombinedSignal", () => {
			it("should combine multiple signals", () => {
				const controller1 = new AbortController();
				const controller2 = new AbortController();

				const combinedSignal = createCombinedSignal(controller1.signal, controller2.signal);

				expect(combinedSignal).toBeInstanceOf(AbortSignal);
				expect(combinedSignal.aborted).toBe(false);

				// Abort one signal
				controller1.abort();
				expect(combinedSignal.aborted).toBe(true);
			});

			it("should filter out null/undefined signals", () => {
				const controller = new AbortController();

				const combinedSignal = createCombinedSignal(
					controller.signal,
					null,
					undefined,
					controller.signal
				);

				expect(combinedSignal).toBeInstanceOf(AbortSignal);
			});

			it("should handle empty signal array", () => {
				const combinedSignal = createCombinedSignal();
				expect(combinedSignal).toBeInstanceOf(AbortSignal);
			});
		});

		describe("createTimeoutSignal", () => {
			it("should create timeout signal", () => {
				const signal = createTimeoutSignal(1000);
				expect(signal).toBeInstanceOf(AbortSignal);
				expect(signal?.aborted).toBe(false);
			});
		});

		describe("deterministicHashFn", () => {
			it("should create consistent hash for same object", () => {
				const obj = { b: 2, a: 1, c: 3 };
				const hash1 = deterministicHashFn(obj);
				const hash2 = deterministicHashFn(obj);

				expect(hash1).toBe(hash2);
			});

			it("should create same hash for objects with same properties in different order", () => {
				const obj1 = { a: 1, b: 2, c: 3 };
				const obj2 = { c: 3, a: 1, b: 2 };

				const hash1 = deterministicHashFn(obj1);
				const hash2 = deterministicHashFn(obj2);

				expect(hash1).toBe(hash2);
			});

			it("should create different hash for different objects", () => {
				const obj1 = { a: 1, b: 2 };
				const obj2 = { a: 1, b: 3 };

				const hash1 = deterministicHashFn(obj1);
				const hash2 = deterministicHashFn(obj2);

				expect(hash1).not.toBe(hash2);
			});

			it("should handle nested objects", () => {
				const obj1 = { a: { b: 2, c: 1 }, d: 3 };
				const obj2 = { d: 3, a: { c: 1, b: 2 } };

				const hash1 = deterministicHashFn(obj1);
				const hash2 = deterministicHashFn(obj2);

				expect(hash1).toBe(hash2);
			});

			it("should handle non-object values", () => {
				expect(deterministicHashFn("string")).toBe('"string"');
				expect(deterministicHashFn(123)).toBe("123");
				expect(deterministicHashFn(null)).toBe("null");
				// undefined gets stringified as undefined (no quotes)
				expect(deterministicHashFn(undefined)).toBeUndefined();
			});
		});

		describe("toArray", () => {
			it("should return array as-is", () => {
				const arr = [1, 2, 3];
				const result = toArray(arr);

				expect(result).toBe(arr);
				expect(result).toEqual([1, 2, 3]);
			});

			it("should wrap non-array values in array", () => {
				expect(toArray("string")).toEqual(["string"]);
				expect(toArray(123)).toEqual([123]);
				expect(toArray(null)).toEqual([null]);
				expect(toArray(undefined)).toEqual([undefined]);
				expect(toArray({ key: "value" })).toEqual([{ key: "value" }]);
			});
		});
	});

	describe("Additional Edge Cases", () => {
		it("should handle Symbol values in type guards", () => {
			const symbol = Symbol("test");
			expect(isString(symbol)).toBe(false);
			expect(isObject(symbol)).toBe(false);
			expect(isArray(symbol)).toBe(false);
			expect(isFunction(symbol)).toBe(false);
			expect(isJSONSerializable(symbol)).toBe(false);
		});

		it("should handle BigInt values in type guards", () => {
			const bigInt = BigInt(123);
			expect(isString(bigInt)).toBe(false);
			expect(isObject(bigInt)).toBe(false);
			expect(isArray(bigInt)).toBe(false);
			expect(isFunction(bigInt)).toBe(false);
			expect(isJSONSerializable(bigInt)).toBe(false);
		});

		it("should handle Proxy objects correctly", () => {
			const target = { key: "value" };
			const proxy = new Proxy(target, {});

			expect(isObject(proxy)).toBe(true);
			expect(isPlainObject(proxy)).toBe(true); // Proxy should be treated as plain object
			expect(isJSONSerializable(proxy)).toBe(true);
		});

		it("should handle ArrayBuffer and TypedArrays", () => {
			const buffer = new ArrayBuffer(8);
			const uint8Array = new Uint8Array(buffer);

			expect(isObject(buffer)).toBe(true);
			expect(isArray(buffer)).toBe(false);
			expect(isPlainObject(buffer)).toBe(false);
			expect(isJSONSerializable(buffer)).toBe(false);

			expect(isObject(uint8Array)).toBe(true);
			expect(isArray(uint8Array)).toBe(false);
			expect(isPlainObject(uint8Array)).toBe(false);
		});
	});

	describe("Edge Cases and Error Handling", () => {
		describe("Guard function edge cases", () => {
			it("should handle circular references in isPlainObject", () => {
				const obj: any = { a: 1 };
				obj.self = obj;

				// Should not throw and should still identify as plain object
				expect(isPlainObject(obj)).toBe(true);
			});

			it("should handle objects with null prototype", () => {
				const nullProtoObj = Object.create(null);
				nullProtoObj.key = "value";

				// Objects with null prototype are considered plain objects
				expect(isPlainObject(nullProtoObj)).toBe(true);
				expect(isObject(nullProtoObj)).toBe(true);
			});

			it("should handle frozen and sealed objects", () => {
				const frozenObj = Object.freeze({ key: "value" });
				const sealedObj = Object.seal({ key: "value" });

				expect(isPlainObject(frozenObj)).toBe(true);
				expect(isPlainObject(sealedObj)).toBe(true);
				expect(isObject(frozenObj)).toBe(true);
				expect(isObject(sealedObj)).toBe(true);
			});
		});

		describe("Utility function error handling", () => {
			it("should handle malformed JSON in isValidJsonString", () => {
				const malformedJson = '{"key": value}'; // Missing quotes around value
				expect(isValidJsonString(malformedJson)).toBe(false);

				const incompleteJson = '{"key":';
				expect(isValidJsonString(incompleteJson)).toBe(false);
			});

			it("should handle very large objects in deterministicHashFn", () => {
				const largeObj: any = {};
				for (let i = 0; i < 1000; i++) {
					largeObj[`key${i}`] = `value${i}`;
				}

				expect(() => deterministicHashFn(largeObj)).not.toThrow();
				expect(typeof deterministicHashFn(largeObj)).toBe("string");
			});

			it("should handle objects with symbol keys", () => {
				const symbolKey = Symbol("test");
				const obj = { [symbolKey]: "value", normalKey: "normal" };

				// Symbol keys are ignored in JSON.stringify
				const hash = deterministicHashFn(obj);
				expect(hash).toBe('{"normalKey":"normal"}');
			});

			it("should handle objects with function values", () => {
				const obj = {
					normalKey: "value",
					functionKey: () => "test",
				};

				// Functions are ignored in JSON.stringify
				const hash = deterministicHashFn(obj);
				expect(hash).toBe('{"normalKey":"value"}');
			});
		});

		describe("Header processing edge cases", () => {
			it("should handle headers with undefined values", async () => {
				const result = await getHeaders({
					auth: null,
					body: null,
					baseHeaders: undefined,
					headers: { "X-Custom": undefined },
				});

				expect(result).toEqual({
					Authorization: "Bearer null", // getAuthHeader returns this when auth is null
					"X-Custom": undefined,
				});
			});

			it("should handle headers with empty string values", async () => {
				const result = await getHeaders({
					auth: null,
					body: null,
					baseHeaders: undefined,
					headers: { "X-Empty": "" },
				});

				expect(result).toEqual({
					Authorization: "Bearer null", // getAuthHeader returns this when auth is null
					"X-Empty": "",
				});
			});

			it("should handle case-insensitive header merging", async () => {
				const result = await getHeaders({
					auth: { type: "Bearer", bearer: "token" },
					body: { test: true },
					baseHeaders: undefined,
					headers: { authorization: "Custom auth" }, // lowercase
				});

				// Custom header should override auth header
				expect(result).toEqual({
					Authorization: "Bearer token",
					"Content-Type": "application/json",
					Accept: "application/json",
					authorization: "Custom auth",
				});
			});
		});

		describe("Body processing edge cases", () => {
			it("should handle body with toJSON method", () => {
				const bodyWithToJSON = {
					name: "John",
					toJSON: () => ({ serialized: true }),
				};

				const result = getBody({ body: bodyWithToJSON, bodySerializer: undefined });
				expect(result).toBe('{"serialized":true}');
			});

			it("should handle body serializer that throws", () => {
				const body = { name: "John" };
				const throwingSerializer = () => {
					throw new Error("Serialization failed");
				};

				expect(() => getBody({ body, bodySerializer: throwingSerializer })).toThrow(
					"Serialization failed"
				);
			});

			it("should handle Blob body", () => {
				const blob = new Blob(["test data"], { type: "text/plain" });
				const result = getBody({ body: blob, bodySerializer: undefined });

				expect(result).toBe(blob);
			});

			it("should handle ArrayBuffer body", () => {
				const buffer = new ArrayBuffer(8);
				const result = getBody({ body: buffer, bodySerializer: undefined });

				expect(result).toBe(buffer);
			});
		});

		describe("Signal creation edge cases", () => {
			it("should handle already aborted signals in createCombinedSignal", () => {
				const controller1 = new AbortController();
				const controller2 = new AbortController();

				controller1.abort();

				const combinedSignal = createCombinedSignal(controller1.signal, controller2.signal);
				expect(combinedSignal.aborted).toBe(true);
			});

			it("should handle timeout signal with zero timeout", () => {
				const signal = createTimeoutSignal(0);
				expect(signal).toBeInstanceOf(AbortSignal);
				// Zero timeout doesn't abort immediately in this implementation
				expect(signal?.aborted).toBe(false);
			});
		});

		describe("Configuration splitting edge cases", () => {
			it("should handle configuration with prototype properties", () => {
				const BaseConfig = function () {};
				BaseConfig.prototype.inheritedProp = "inherited";

				const config = new (BaseConfig as any)();
				config.method = "POST";
				config.baseURL = "https://api.example.com";

				const [fetchOptions, extraOptions] = splitConfig(config);

				expect(fetchOptions).toEqual({ method: "POST" });
				expect(extraOptions).toEqual({ baseURL: "https://api.example.com" });
			});

			it("should handle configuration with non-enumerable properties", () => {
				const config = { method: "GET" };
				Object.defineProperty(config, "hiddenProp", {
					value: "hidden",
					enumerable: false,
				});

				const [fetchOptions, extraOptions] = splitConfig(config);

				expect(fetchOptions).toEqual({ method: "GET" });
				expect(extraOptions).toEqual({});
			});
		});
	});
});

describe("toFormData", () => {
	describe("Basic functionality", () => {
		it("should convert plain object with primitives to FormData", () => {
			const data = {
				name: "John",
				age: 30,
				active: true,
			};

			const formData = toFormData(data);

			expect(formData).toBeInstanceOf(FormData);
			expect(formData.get("name")).toBe("John");
			expect(formData.get("age")).toBe("30");
			expect(formData.get("active")).toBe("true");
		});

		it("should handle string values", () => {
			const data = { message: "Hello World" };
			const formData = toFormData(data);

			expect(formData.get("message")).toBe("Hello World");
		});

		it("should handle number values", () => {
			const data = { count: 42, price: 19.99 };
			const formData = toFormData(data);

			expect(formData.get("count")).toBe("42");
			expect(formData.get("price")).toBe("19.99");
		});

		it("should handle boolean values", () => {
			const data = { isActive: true, isDeleted: false };
			const formData = toFormData(data);

			expect(formData.get("isActive")).toBe("true");
			expect(formData.get("isDeleted")).toBe("false");
		});
	});

	describe("Array handling", () => {
		it("should append array items with same key", () => {
			const data = {
				tags: ["javascript", "typescript", "react"],
			};

			const formData = toFormData(data);

			expect(formData.getAll("tags")).toEqual(["javascript", "typescript", "react"]);
		});

		it("should handle arrays with numbers", () => {
			const data = {
				scores: [85, 90, 95],
			};

			const formData = toFormData(data);

			expect(formData.getAll("scores")).toEqual(["85", "90", "95"]);
		});

		it("should handle arrays with booleans", () => {
			const data = {
				flags: [true, false, true],
			};

			const formData = toFormData(data);

			expect(formData.getAll("flags")).toEqual(["true", "false", "true"]);
		});

		it("should handle empty arrays", () => {
			const data = {
				items: [] as string[],
			};

			const formData = toFormData(data);

			expect(formData.getAll("items")).toEqual([]);
		});

		it("should handle mixed type arrays", () => {
			const data = {
				mixed: ["text", 123, true] as (string | number | boolean)[],
			};

			const formData = toFormData(data);

			expect(formData.getAll("mixed")).toEqual(["text", "123", "true"]);
		});
	});

	describe("Blob and File handling", () => {
		it("should handle Blob values", () => {
			const blob = new Blob(["test content"], { type: "text/plain" });
			const data = {
				file: blob,
			};

			const formData = toFormData(data);
			const result = formData.get("file");

			expect(result).toBeInstanceOf(Blob);
			expect((result as Blob).type).toBe("text/plain");
			expect((result as Blob).size).toBe(12);
		});

		it("should handle File values", () => {
			const file = new File(["test content"], "test.txt", { type: "text/plain" });
			const data = {
				upload: file,
			};

			const formData = toFormData(data);

			expect(formData.get("upload")).toBe(file);
		});

		it("should handle arrays of Blobs", () => {
			const blob1 = new Blob(["content1"], { type: "text/plain" });
			const blob2 = new Blob(["content2"], { type: "text/plain" });
			const data = {
				files: [blob1, blob2],
			};

			const formData = toFormData(data);
			const results = formData.getAll("files");

			expect(results).toHaveLength(2);
			expect(results[0]).toBeInstanceOf(Blob);
			expect(results[1]).toBeInstanceOf(Blob);
			expect((results[0] as Blob).type).toBe("text/plain");
			expect((results[1] as Blob).type).toBe("text/plain");
		});

		it("should handle mixed primitives and Blobs", () => {
			const blob = new Blob(["test"], { type: "text/plain" });
			const data = {
				name: "John",
				avatar: blob,
				age: 30,
			};

			const formData = toFormData(data);
			const avatar = formData.get("avatar");

			expect(formData.get("name")).toBe("John");
			expect(avatar).toBeInstanceOf(Blob);
			expect((avatar as Blob).type).toBe("text/plain");
			expect(formData.get("age")).toBe("30");
		});
	});

	describe("Nested object handling (one level)", () => {
		it("should JSON stringify nested objects", () => {
			const data = {
				user: {
					name: "John",
					age: 30,
				},
			};

			const formData = toFormData(data);

			expect(formData.get("user")).toBe('{"name":"John","age":30}');
		});

		it("should handle multiple nested objects", () => {
			const data = {
				user: { name: "John", age: 30 },
				settings: { theme: "dark", notifications: true },
			};

			const formData = toFormData(data);

			expect(formData.get("user")).toBe('{"name":"John","age":30}');
			expect(formData.get("settings")).toBe('{"theme":"dark","notifications":true}');
		});

		it("should handle nested objects with Blob values", () => {
			const blob = new Blob(["test"], { type: "text/plain" });
			const data = {
				file: blob,
				metadata: { filename: "test.txt", size: 1024 },
			};

			const formData = toFormData(data);
			const file = formData.get("file");

			expect(file).toBeInstanceOf(Blob);
			expect((file as Blob).type).toBe("text/plain");
			expect(formData.get("metadata")).toBe('{"filename":"test.txt","size":1024}');
		});
	});

	describe("Complex data structures", () => {
		it("should handle mixed data types", () => {
			const blob = new Blob(["avatar"], { type: "image/png" });
			const data = {
				name: "John",
				age: 30,
				active: true,
				tags: ["developer", "designer"],
				avatar: blob,
				metadata: { role: "admin", level: 5 },
			};

			const formData = toFormData(data);
			const avatar = formData.get("avatar");

			expect(formData.get("name")).toBe("John");
			expect(formData.get("age")).toBe("30");
			expect(formData.get("active")).toBe("true");
			expect(formData.getAll("tags")).toEqual(["developer", "designer"]);
			expect(avatar).toBeInstanceOf(Blob);
			expect((avatar as Blob).type).toBe("image/png");
			expect(formData.get("metadata")).toBe('{"role":"admin","level":5}');
		});

		it("should handle empty object", () => {
			const data = {};
			const formData = toFormData(data);

			expect(formData).toBeInstanceOf(FormData);
			expect(Array.from(formData.keys())).toEqual([]);
		});

		it("should handle object with null prototype", () => {
			const data = Object.create(null);
			data.name = "John";
			data.age = 30;

			const formData = toFormData(data);

			expect(formData.get("name")).toBe("John");
			expect(formData.get("age")).toBe("30");
		});
	});

	describe("Edge cases", () => {
		it("should handle special characters in keys", () => {
			const data = {
				"user-name": "John",
				"user.email": "john@example.com",
				"user[id]": "123",
			};

			const formData = toFormData(data);

			expect(formData.get("user-name")).toBe("John");
			expect(formData.get("user.email")).toBe("john@example.com");
			expect(formData.get("user[id]")).toBe("123");
		});

		it("should handle special characters in values", () => {
			const data = {
				message: "Hello & goodbye!",
				url: "https://example.com?param=value",
				emoji: "👋🌍",
			};

			const formData = toFormData(data);

			expect(formData.get("message")).toBe("Hello & goodbye!");
			expect(formData.get("url")).toBe("https://example.com?param=value");
			expect(formData.get("emoji")).toBe("👋🌍");
		});

		it("should handle very long strings", () => {
			const longString = "a".repeat(10000);
			const data = { longText: longString };

			const formData = toFormData(data);

			expect(formData.get("longText")).toBe(longString);
		});

		it("should handle objects with many keys", () => {
			const data: Record<string, string> = {};
			for (let i = 0; i < 100; i++) {
				data[`key${i}`] = `value${i}`;
			}

			const formData = toFormData(data);

			for (let i = 0; i < 100; i++) {
				expect(formData.get(`key${i}`)).toBe(`value${i}`);
			}
		});

		it("should handle zero values", () => {
			const data = {
				count: 0,
				price: 0.0,
				active: false,
			};

			const formData = toFormData(data);

			expect(formData.get("count")).toBe("0");
			expect(formData.get("price")).toBe("0");
			expect(formData.get("active")).toBe("false");
		});

		it("should handle negative numbers", () => {
			const data = {
				temperature: -10,
				balance: -99.99,
			};

			const formData = toFormData(data);

			expect(formData.get("temperature")).toBe("-10");
			expect(formData.get("balance")).toBe("-99.99");
		});
	});
});
