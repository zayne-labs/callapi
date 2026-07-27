import { serve, type ServerType } from "@hono/node-server";
import { Hono } from "hono";
import { afterAll, beforeAll, expect, test } from "vitest";
import { createFetchClient } from "../../src";
import type { StandardSchemaV1 } from "../../src/types/standard-schema";
import { expectErrorResult, expectSuccessResult } from "../test-setup/assertions";

const nativeFetch = globalThis.fetch.bind(globalThis);

const app = new Hono();

app.post("/users", async (context) => {
	const body = await context.req.json();

	return context.json({
		body,
		contentType: context.req.header("content-type"),
	});
});

app.post("/form", async (context) => {
	const formData = await context.req.formData();

	return context.json({
		contentType: context.req.header("content-type"),
		fields: Object.fromEntries(formData),
	});
});

app.get("/stream", () => {
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(encoder.encode("first"));
			controller.enqueue(encoder.encode("-second"));
			controller.close();
		},
	});

	return new Response(stream, {
		headers: { "Content-Type": "text/plain" },
	});
});

app.get("/slow", async (context) => {
	await new Promise((resolve) => setTimeout(resolve, 100));
	return context.json({ status: "late" });
});

let baseURL = "";
let server: ServerType;

beforeAll(async () => {
	server = serve({
		fetch: app.fetch,
		port: 0,
	});

	await new Promise<void>((resolve) => {
		server.once("listening", resolve);
	});

	const address = server.address();

	if (!address || typeof address === "string") {
		throw new Error("Hono test server did not expose a TCP port");
	}

	baseURL = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
	await new Promise<void>((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
				return;
			}

			resolve();
		});
	});
});

test("Hono integration - validates a body before serialization", async () => {
	type BodyInput = { age: string; name: string };
	type BodyOutput = { age: number; name: string };

	const bodySchema: StandardSchemaV1<BodyInput, BodyOutput> = {
		"~standard": {
			validate: (input) => {
				const body = input as BodyInput;
				return { value: { age: Number(body.age), name: body.name } };
			},
			vendor: "callapi-tests",
			version: 1,
		},
	};

	const client = createFetchClient({
		baseURL,
		customFetchImpl: nativeFetch,
		schema: {
			routes: {
				"@post/users": { body: bodySchema },
			},
		},
	});

	const result = await client("@post/users", {
		body: { age: 42, name: "Ryan" },
	});

	expectSuccessResult(result);
	expect(result.data).toEqual({
		body: { age: 42, name: "Ryan" },
		contentType: "application/json",
	});
});

test("Hono integration - sends transformed FormData with a real multipart boundary", async () => {
	const client = createFetchClient({
		baseURL,
		customFetchImpl: nativeFetch,
	});

	const result = await client("/form", {
		body: { name: "Ryan", role: "maintainer" },
		bodyTransformer: ({ body }) => {
			const formData = new FormData();

			for (const [key, value] of Object.entries(body)) {
				formData.append(key, value);
			}

			return formData;
		},
		method: "POST",
	});

	expectSuccessResult(result);
	expect(result.data).toEqual({
		contentType: expect.stringMatching(/^multipart\/form-data; boundary=/),
		fields: { name: "Ryan", role: "maintainer" },
	});
});

test("Hono integration - returns a real response stream", async () => {
	const client = createFetchClient({
		baseURL,
		customFetchImpl: nativeFetch,
	});

	const result = await client("/stream", {
		responseType: "stream",
		resultMode: "onlyData",
		throwOnError: true,
	});

	expect(result).toBeInstanceOf(ReadableStream);
	await expect(new Response(result).text()).resolves.toBe("first-second");
});

test("Hono integration - aborts a slow request at the configured timeout", async () => {
	const client = createFetchClient({
		baseURL,
		customFetchImpl: nativeFetch,
	});

	const result = await client("/slow", {
		resultMode: "all",
		timeout: 10,
	});

	expectErrorResult(result);
	expect(result.error.name).toBe("TimeoutError");
});
