/**
 * Common utility tests - flat structure
 */

import { expect, test, vi } from "vitest";
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
} from "../../src/utils/common";
import { resetFetchMock } from "../test-setup/fetch-mock";

// Keys
test("omitKeys omits specified keys from object", () => {
	const obj = { a: 1, b: 2, c: 3 };
	expect(omitKeys(obj, ["b"])).toEqual({ a: 1, c: 3 });
});

test("pickKeys picks specified keys from object", () => {
	const obj = { a: 1, b: 2, c: 3 };
	expect(pickKeys(obj, ["a", "c"])).toEqual({ a: 1, c: 3 });
});

// Config
test("splitConfig and splitBaseConfig correctly separate fetch options from extra options", () => {
	const config = { method: "POST", baseURL: "https://api.com", retry: { attempts: 3 } };
	const [fetchOpts, extraOpts] = splitConfig(config as never);
	expect(fetchOpts).toEqual({ method: "POST" });
	expect(extraOpts).toEqual({ baseURL: "https://api.com", retry: { attempts: 3 } });

	const [baseFetch, baseExtra] = splitBaseConfig(config as never);
	expect(baseFetch).toEqual({ method: "POST" });
	expect(baseExtra).toEqual({ baseURL: "https://api.com", retry: { attempts: 3 } });
});

// Headers
test("objectifyHeaders converts Headers instance or arrays to plain object", () => {
	const headers = new Headers({ "Content-Type": "application/json" });
	expect(objectifyHeaders(headers)).toEqual({ "content-type": "application/json" });

	expect(objectifyHeaders([["X-A", "B"]])).toEqual({ "X-A": "B" });
});

test("getHeaders merges auth, body, and custom headers", async () => {
	const result = await getHeaders({
		auth: { type: "Bearer", value: "token" },
		body: { a: 1 },
		resolvedHeaders: { "X-Custom": "val" },
	});

	expect(result).toEqual({
		Authorization: "Bearer token",
		"Content-Type": "application/json",
		Accept: "application/json",
		"X-Custom": "val",
	});
});

// Method
test("getMethod returns uppercase method and prioritizes explicit method over URL prefix", () => {
	expect(getMethod({ initURL: "/test", method: "post" })).toBe("POST");
	expect(getMethod({ initURL: "@post/test", method: undefined })).toBe("POST");
	expect(getMethod({ initURL: "@post/test", method: "PUT" })).toBe("PUT");
});

// Body
test("getBody serializes body correctly and respects custom serializers", () => {
	const body = { a: 1 };
	expect(getBody({ body, bodySerializer: undefined, resolvedHeaders: {} })).toBe(JSON.stringify(body));

	const custom = vi.fn().mockReturnValue("serialized");
	expect(getBody({ body, bodySerializer: custom, resolvedHeaders: {} })).toBe("serialized");
});

// fetchImpl
test("getInitFetchImpl returns provided or global fetch", () => {
	const custom = vi.fn();
	expect(getInitFetchImpl(custom)).toBe(custom);

	const originalFetch = globalThis.fetch;
	const mockGlobal = vi.fn();
	globalThis.fetch = mockGlobal;
	expect(getInitFetchImpl(undefined)).toBe(mockGlobal);
	globalThis.fetch = originalFetch;
});

// waitFor
test("waitFor handles zero and non-zero delays", async () => {
	expect(waitFor(0)).toBeUndefined();
	const start = Date.now();
	await waitFor(50);
	expect(Date.now() - start).toBeGreaterThanOrEqual(45);
});

// Signals
test("createCombinedSignal combines multiple signals", () => {
	const c1 = new AbortController();
	const combined = createCombinedSignal(c1.signal);
	expect(combined).toBeInstanceOf(AbortSignal);
	c1.abort();
	expect(combined.aborted).toBe(true);
});

test("createTimeoutSignal creates a signal that times out", () => {
	const signal = createTimeoutSignal(100);
	expect(signal).toBeInstanceOf(AbortSignal);
});

// Hash
test("deterministicHashFn creates consistent hashes", () => {
	const obj1 = { a: 1, b: 2 };
	const obj2 = { b: 2, a: 1 };
	expect(deterministicHashFn(obj1)).toBe(deterministicHashFn(obj2));
});

// toArray
test("toArray wraps non-array values", () => {
	expect(toArray("a")).toEqual(["a"]);
	expect(toArray([1])).toEqual([1]);
});
