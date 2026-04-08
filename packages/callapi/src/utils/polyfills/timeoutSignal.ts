export const createTimeoutSignal = (ms: number | undefined) => {
	if (ms == null) return;

	const controller = new AbortController();

	const reason = new DOMException("Request timed out", "TimeoutError");

	const timeout = setTimeout(() => controller.abort(reason), ms);

	controller.signal.addEventListener("abort", () => clearTimeout(timeout));

	return controller.signal;
};
