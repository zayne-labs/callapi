import { expect, test } from "vitest";
import { callTestApi } from "../test-setup/callapi-setup";
import { createFetchMock, createMockResponse } from "../test-setup/fetch-mock";

test("Performance - CallApi fast path is similar to fetch speed", async () => {
	using mockFetch = createFetchMock();

	const ITERATIONS = 1000;
	const MAX_OVERHEAD_MS = 1;
	const TEST_URL = "https://api.example.com";

	mockFetch.mockImplementation(() => Promise.resolve(createMockResponse({ data: "test" })));

	// == Warmup to ensure JIT compiling and network mocks are primed
	await Promise.all(
		[...Array(100).keys()].map(async () => {
			await fetch(TEST_URL);
			await callTestApi(TEST_URL);
		})
	);

	const measurePerformance = async (requestFn: () => Promise<unknown>) => {
		const start = performance.now();

		for (let count = 0; count < ITERATIONS; count += 1) {
			await requestFn();
		}

		return performance.now() - start;
	};

	const fetchTime = await measurePerformance(() => fetch(TEST_URL));
	const callApiTime = await measurePerformance(() =>
		callTestApi(TEST_URL, { dedupeStrategy: "none", resultMode: "fetchApi" })
	);

	const overheadPerCall = (callApiTime - fetchTime) / ITERATIONS;

	console.info(`
		--- Performance Results (${ITERATIONS} iterations) ---
		Fetch Time:        ${fetchTime.toFixed(2)}ms
		CallApi Time:      ${callApiTime.toFixed(2)}ms
		Overhead Per Call: ${overheadPerCall.toFixed(4)}ms
	`);

	expect(overheadPerCall).toBeLessThan(MAX_OVERHEAD_MS);
});
