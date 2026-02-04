/**
 * Common test utilities
 * Centralized from helpers.ts and test-helpers.ts
 */

/**
 * Helper to wait for a specified time (useful for testing delays)
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to create a promise that can be resolved/rejected externally
 */
export function createDeferredPromise<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;

	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, reject, resolve };
}

/**
 * Helper to track function calls with timestamps
 */
export function createCallTracker() {
	const calls: Array<{ args: unknown[]; timestamp: number }> = [];

	const track = (...args: unknown[]) => {
		calls.push({ args, timestamp: Date.now() });
	};

	const getCalls = () => calls;
	const getCallCount = () => calls.length;
	const getLastCall = () => calls.at(-1);
	const reset = () => (calls.length = 0);

	return { getCallCount, getCalls, getLastCall, reset, track };
}

/**
 * Helper to mock network errors
 */
export function mockNetworkError(message = "Network error"): Error {
	return new Error(message);
}

/**
 * Helper to mock timeout errors
 */
export function mockTimeoutError(): Error {
	const error = new Error("The operation was aborted");
	error.name = "AbortError";
	return error;
}
