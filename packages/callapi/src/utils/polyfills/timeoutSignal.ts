export const createTimeoutSignalPolyfill = (milliseconds: number) => {
	const controller = new AbortController();

	const reason = new DOMException("Request timed out", "TimeoutError");

	const timeout = setTimeout(() => controller.abort(reason), milliseconds);

	controller.signal.addEventListener("abort", () => clearTimeout(timeout));

	return controller.signal;
};
