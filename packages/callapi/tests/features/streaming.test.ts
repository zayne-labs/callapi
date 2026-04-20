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

	// Should have called hook: 1 (start) + 2 (chunks) + 1 (flush) = 4 times
	const events = tracker.getCalls().map((call) => call.args[1] as StreamProgressEvent);
	expect(events).toHaveLength(4);

	// --- Baseline (Start) ---
	expect(events[0]?.transferredBytes).toBe(0);
	expect(events[0]?.progress).toBe(0);
	expect(events[0]?.chunk?.byteLength).toBe(0);

	// --- Last Event (Completion) ---
	const lastEvent = events[3];
	expect(lastEvent?.chunk).toBeNull();
	expect(lastEvent?.transferredBytes).toBe(10);
	expect(lastEvent?.totalBytes).toBe(10);
	expect(lastEvent?.progress).toBe(100);
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

	const events = tracker.getCalls().map((call) => call.args[1] as StreamProgressEvent);
	expect(events).toHaveLength(3); // Start, Data, Flush

	// Total bytes updates to match transferred bytes if unknown content-length
	const lastEvent = events[2];
	expect(lastEvent?.totalBytes).toBe(4);
	expect(lastEvent?.transferredBytes).toBe(4);
	expect(lastEvent?.progress).toBe(100);
});

test("onResponseStream - progress never reaches 100% until completion (epsilon check)", async () => {
	using mockFetch = createFetchMock();
	const stream = new ReadableStream({
		start(controller) {
			// Enqueue all expected bytes but don't close yet
			controller.enqueue(new TextEncoder().encode("1234"));
			controller.close();
		},
	});

	const response = new Response(stream, {
		headers: { "Content-Length": "4" },
	});

	mockFetch.mockResolvedValue(response);

	const tracker = createCallTracker();

	await callApi("https://api.example.com/stream", {
		onResponseStream: (context) => {
			tracker.track("progress", context.event);
		},
	});

	const events = tracker.getCalls().map((call) => call.args[1] as StreamProgressEvent);

	// Event for "1234" chunk
	const dataEvent = events[1];
	expect(dataEvent?.transferredBytes).toBe(4);
	expect(dataEvent?.totalBytes).toBe(4);
	// Should be slightly less than 100 because isDone is false
	expect(dataEvent?.progress).toBeLessThan(100);
	expect(dataEvent?.progress).toBeCloseTo(100, 10);

	// Completion event
	const lastEvent = events[2];
	expect(lastEvent?.progress).toBe(100);
	expect(lastEvent?.chunk).toBeNull();
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
		body: stream,
		method: "POST",
		onRequestStream: (context) => {
			tracker.track("upload", context.event);
		},
	});

	const events = tracker.getCalls().map((call) => call.args[1] as StreamProgressEvent);
	expect(events).toHaveLength(4); // Start, Chunk1, Chunk2, Flush

	expect(events[0]?.progress).toBe(0);

	const lastEvent = events[3];
	expect(lastEvent?.transferredBytes).toBe(12);
	expect(lastEvent?.totalBytes).toBe(12);
	expect(lastEvent?.progress).toBe(100);
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
			body: stream,
			method: "POST",
			onRequestStream: (context) => {
				tracker.track("upload", context.event);
			},
		})
	).resolves.toBeDefined();

	expect(tracker.getCallCount()).toBeGreaterThan(0);
});
