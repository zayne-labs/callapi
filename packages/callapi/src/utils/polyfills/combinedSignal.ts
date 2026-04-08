export const createCombinedSignal = (...signals: Array<AbortSignal | null | undefined>) => {
	const controller = new AbortController();

	const handleAbort = (actualSignal: AbortSignal) => {
		if (controller.signal.aborted) return;

		controller.abort(actualSignal.reason);
	};

	for (const actualSignal of signals) {
		if (actualSignal == null) continue;

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
