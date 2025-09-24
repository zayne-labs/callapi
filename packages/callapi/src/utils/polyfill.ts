export const createCombinedSignalPolyfill = (signals: AbortSignal[]) => {
	const controller = new AbortController();

	const handleAbort = (actualSignal: AbortSignal) => {
		if (controller.signal.aborted) return;

		controller.abort(actualSignal.reason);
	};

	for (const actualSignal of signals) {
		if (actualSignal.aborted) {
			handleAbort(actualSignal);
			break;
		}

		actualSignal.addEventListener("abort", () => handleAbort(actualSignal), {
			signal: controller.signal,
		});
	}

	return controller.signal;
};

export const createTimeoutSignalPolyfill = (milliseconds: number) => {
	const controller = new AbortController();

	const reason = new DOMException("Request timed out", "TimeoutError");

	const timeout = setTimeout(() => controller.abort(reason), milliseconds);

	controller.signal.addEventListener("abort", () => clearTimeout(timeout));

	return controller.signal;
};
