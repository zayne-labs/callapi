/**
 * Common test utilities
 * Centralized from helpers.ts and test-helpers.ts
 */

/**
 * @description Helper to create a promise that can be resolved/rejected externally
 */
export const createDeferredPromise = <T>() => {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;

	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, reject, resolve };
};

/**
 * @description Helper to track function calls with timestamps
 */
export const createCallTracker = () => {
	const calls: Array<{ args: unknown[]; timestamp: number }> = [];

	const track = (...args: unknown[]) => {
		calls.push({ args, timestamp: Date.now() });
	};

	const getCalls = () => calls;
	const getCallCount = () => calls.length;
	const getLastCall = () => calls.at(-1);
	const reset = () => (calls.length = 0);

	return { getCallCount, getCalls, getLastCall, reset, track };
};

/**
 * @description Helper to mock network errors
 */
export const mockNetworkError = (message = "Network error"): Error => {
	return new Error(message);
};

/**
 *@description  Helper to mock timeout errors
 */
export const mockTimeoutError = (): Error => {
	const error = new Error("The operation was aborted");
	error.name = "AbortError";
	return error;
};
