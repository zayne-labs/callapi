/**
 * Type guard utility tests - flat structure
 */

import { expect, test } from "vitest";
import { HTTPError, ValidationError } from "../../src/utils/external/error";
import {
	isHTTPError,
	isHTTPErrorInstance,
	isJavascriptError,
	isValidationError,
	isValidationErrorInstance,
} from "../../src/utils/external/guards";
import {
	isArray,
	isFunction,
	isJSONSerializable,
	isObject,
	isPlainObject,
	isQueryString,
	isReadableStream,
	isSerializableObject,
	isString,
	isValidJsonString,
} from "../../src/utils/guards";
import { createMockErrorResponse, createMockResponse } from "../test-setup/fetch-mock";
import { mockError } from "../test-setup/fixtures";

// isHTTPError
test("isHTTPError correctly identifies HTTPError instances", () => {
	const httpError = new HTTPError({
		errorData: mockError,
		response: createMockErrorResponse(mockError, 400),
		defaultHTTPErrorMessage: "Default message",
	});

	const errorVariant = {
		name: "HTTPError",
		message: "Test error",
		originalError: httpError,
		errorData: mockError,
	};

	expect(isHTTPError(errorVariant as never)).toBe(true);
});

test("isHTTPError returns false for non-HTTPError instances", () => {
	const regularError = {
		name: "Error",
		message: "Regular error",
		originalError: new Error("Regular error"),
		errorData: false,
	};

	expect(isHTTPError(regularError as never)).toBe(false);
	expect(isHTTPError(null)).toBe(false);
});

// isHTTPErrorInstance
test("isHTTPErrorInstance correctly identifies HTTPError instances using static method", () => {
	const httpError = new HTTPError({
		errorData: mockError,
		response: createMockErrorResponse(mockError, 400),
		defaultHTTPErrorMessage: "Default message",
	});

	expect(isHTTPErrorInstance(httpError)).toBe(true);
	expect(isHTTPErrorInstance(new Error("Regular error"))).toBe(false);
});

// isValidationError
test("isValidationError correctly identifies ValidationError instances", () => {
	const validationError = {
		name: "ValidationError",
		message: "Validation error",
		issueCause: "unknown",
		originalError: new ValidationError({ issues: [], response: null, issueCause: "unknown" }),
		errorData: [],
	};

	expect(isValidationError(validationError as never)).toBe(true);
});

// isValidationErrorInstance
test("isValidationErrorInstance correctly identifies ValidationError instances using static method", () => {
	const validationError = new ValidationError({
		issues: [],
		response: null,
		issueCause: "unknown",
	});

	expect(isValidationErrorInstance(validationError)).toBe(true);
	expect(isValidationErrorInstance(new Error("Regular error"))).toBe(false);
});

// isJavascriptError
test("isJavascriptError correctly identifies JavaScript errors", () => {
	const jsError = {
		name: "Error",
		message: "JavaScript error",
		originalError: new Error("JavaScript error"),
		errorData: false,
	};

	expect(isJavascriptError(jsError as never)).toBe(true);
});

test("isJavascriptError returns false for HTTPError and ValidationError", () => {
	expect(isJavascriptError({ name: "HTTPError" } as never)).toBe(false);
	expect(isJavascriptError({ name: "ValidationError" } as never)).toBe(false);
});

// primitives
test("isArray correctly identifies arrays", () => {
	expect(isArray([])).toBe(true);
	expect(isArray({})).toBe(false);
});

test("isObject correctly identifies objects", () => {
	expect(isObject({})).toBe(true);
	expect(isObject(null)).toBe(false);
});

test("isPlainObject correctly identifies plain objects", () => {
	expect(isPlainObject({})).toBe(true);
	expect(isPlainObject([])).toBe(false);
	expect(isPlainObject(new Date())).toBe(false);
});

test("isValidJsonString correctly identifies valid JSON strings", () => {
	expect(isValidJsonString('{"key": "value"}')).toBe(true);
	expect(isValidJsonString("{ invalid json")).toBe(false);
});

test("isSerializableObject correctly identifies serializable values", () => {
	expect(isSerializableObject({})).toBe(true);
	expect(isSerializableObject(new Date())).toBe(true); // Date has toJSON
	expect(isSerializableObject("string")).toBe(false);
});

test("isFunction correctly identifies functions", () => {
	expect(isFunction(() => {})).toBe(true);
	expect(isFunction({})).toBe(false);
});

test("isQueryString correctly identifies query strings", () => {
	expect(isQueryString("key=value")).toBe(true);
	expect(isQueryString("justtext")).toBe(false);
});

test("isString correctly identifies strings", () => {
	expect(isString("")).toBe(true);
	expect(isString(123)).toBe(false);
});

test("isReadableStream correctly identifies ReadableStream instances", () => {
	expect(isReadableStream(new ReadableStream())).toBe(true);
	expect(isReadableStream({})).toBe(false);
});

test("isJSONSerializable correctly identifies JSON serializable values", () => {
	expect(isJSONSerializable({ a: 1 })).toBe(true);
	expect(isJSONSerializable(undefined)).toBe(false);
	expect(isJSONSerializable(/regex/)).toBe(false);
});

// Edge Cases
test("type guards handle Symbol and BigInt correctly", () => {
	const sym = Symbol("test");
	const big = BigInt(123);
	expect(isString(sym)).toBe(false);
	expect(isObject(big)).toBe(false);
});

test("type guards handle Proxy and null prototype objects", () => {
	expect(isPlainObject(new Proxy({}, {}))).toBe(true);
	expect(isPlainObject(Object.create(null))).toBe(true);
});
