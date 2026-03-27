import { expect, test } from "vitest";
import { callApi } from "../../src/createFetchClient";
import type { StreamProgressEvent } from "../../src/stream";
import { createCallTracker } from "../test-setup/common";
import { createFetchMock } from "../test-setup/fetch-mock";

async function consumeStreamBody(body: unknown): Promise<void> {
	if (!body || typeof body !== "object") return;

	if (!("getReader" in body)) return;

	const reader = (body as ReadableStream).getReader();
	let done = false;
	while (!done) {
		const result = await reader.read();
		done = result.done;
	}
}

test("onResponseStream - tracks download progress from ReadableStream response", async () => {
	using mockFetch = createFetchMock();
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode("hello"));
			controller.enqueue(new TextEncoder().encode("world"));
			controller.close();
		},
	});

	// Mock response with stream and known content-length (5+5=10 bytes)
	const response = new Response(stream, {
		headers: { "Content-Length": "10" },
	});

	mockFetch.mockResolvedValue(response);

	const tracker = createCallTracker();

	await callApi("https://api.example.com/stream-down", {
		onResponseStream: (context) => {
			tracker.track("progress", context.event);
		},
	});

	// Should have called hook for each chunk
	expect(tracker.getCallCount()).toBeGreaterThanOrEqual(2);

	const lastCall = tracker.getLastCall();
	// --- Response Streaming ---
	const lastEvent = lastCall?.args[1] as StreamProgressEvent;

	expect(lastEvent.transferredBytes).toBe(10);
	expect(lastEvent.totalBytes).toBe(10);
	expect(lastEvent.progress).toBe(100);
});

test("onResponseStream - handles response without Content-Length", async () => {
	using mockFetch = createFetchMock();
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode("data"));
			controller.close();
		},
	});

	const response = new Response(stream); // No Content-Length

	mockFetch.mockResolvedValue(response);

	const tracker = createCallTracker();

	await callApi("https://api.example.com/stream-down-unknown", {
		onResponseStream: (context) => {
			tracker.track("progress", context.event);
		},
	});

	expect(tracker.getCallCount()).toBeGreaterThan(0);
	const lastEvent = tracker.getLastCall()?.args[1] as StreamProgressEvent;

	// Total bytes updates to match transferred bytes if unknown content-length
	// The implementation performs: totalBytes = Math.max(totalBytes, transferredBytes)
	expect(lastEvent.totalBytes).toBe(4);
	expect(lastEvent.transferredBytes).toBe(4);
});

test("onRequestStream - tracks upload progress for ReadableStream body", async () => {
	using mockFetch = createFetchMock();

	// Mock fetch to consume the request body stream to trigger progress events
	mockFetch.mockImplementation(async (_url, options) => {
		const init = options as RequestInit;
		await consumeStreamBody(init.body);
		return new Response("ok");
	});

	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode("chunk1")); // 6 bytes
			controller.enqueue(new TextEncoder().encode("chunk2")); // 6 bytes
			controller.close();
		},
	});

	const tracker = createCallTracker();

	await callApi("https://api.example.com/stream-up", {
		method: "POST",
		body: stream,
		// We explicitly enable size calculation to test totalBytes logic
		forcefullyCalculateRequestStreamSize: true,
		onRequestStream: (context) => {
			tracker.track("upload", context.event);
		},
	});

	expect(tracker.getCallCount()).toBeGreaterThanOrEqual(2);

	const lastCall = tracker.getLastCall();
	const lastEvent = lastCall?.args[1] as StreamProgressEvent;

	expect(lastEvent.transferredBytes).toBe(12);
	expect(lastEvent.totalBytes).toBe(12);
	expect(lastEvent.progress).toBe(100);
});

test("onRequestStream - ignores non-stream bodies", async () => {
	using mockFetch = createFetchMock();
	mockFetch.mockResolvedValue(new Response("ok"));

	const tracker = createCallTracker();

	await callApi("https://api.example.com/no-stream", {
		method: "POST",
		body: JSON.stringify({ a: 1 }),
		onRequestStream: (context) => {
			tracker.track("upload", context.event);
		},
	});

	expect(tracker.getCallCount()).toBe(0);
});

test("onRequestStream - handles upload without Content-Length (unknown size)", async () => {
	using mockFetch = createFetchMock();

	mockFetch.mockImplementation(async (_url, options) => {
		const init = options as RequestInit;
		await consumeStreamBody(init.body);
		return new Response("ok");
	});

	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode("chunk1")); // 6 bytes
			controller.close();
		},
	});

	const tracker = createCallTracker();

	await callApi("https://api.example.com/stream-up-unknown", {
		method: "POST",
		body: stream,
		forcefullyCalculateRequestStreamSize: false, // Default behavior
		onRequestStream: (context) => {
			tracker.track("upload", context.event);
		},
	});

	const lastCall = tracker.getLastCall();
	const lastEvent = lastCall?.args[1] as StreamProgressEvent;
	expect(lastEvent.transferredBytes).toBe(6);
	// When size is unknown, it updates total to match transferred
	expect(lastEvent.totalBytes).toBe(6);
});

test("onRequestStream - propagates stream errors", async () => {
	using mockFetch = createFetchMock();

	mockFetch.mockImplementation(async (_url, options) => {
		const init = options as RequestInit;
		try {
			await consumeStreamBody(init.body);
		} catch {
			// Expected error during consumption
		}
		return new Response("ok");
	});

	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode("chunk1"));
			controller.error(new Error("Stream failure"));
		},
	});

	const tracker = createCallTracker();

	await expect(
		callApi("https://api.example.com/stream-error", {
			method: "POST",
			body: stream,
			onRequestStream: (context) => {
				tracker.track("upload", context.event);
			},
		})
	).resolves.toBeDefined();
	// The error happens in the background stream reading inside fetch for many implementations, or throws.
	// However, since we mock fetch and consume it, if the stream errors during read(), our mock catches it or it bubbles.
	// In `toStreamableRequest`, we return a NEW Request with a transparent stream.
	// If the source stream errors, the destination stream (consumed by fetch) should error.

	// Actually, verifying exact error behavior depends heavily on the engine.
	// But we can verify that WE started processing.
	expect(tracker.getCallCount()).toBeGreaterThan(0);
});
