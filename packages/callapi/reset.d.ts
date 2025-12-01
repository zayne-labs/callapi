import "@total-typescript/ts-reset";
import "@total-typescript/ts-reset/dom";

declare global {
	// eslint-disable-next-line ts-eslint/consistent-type-definitions -- Ignore
	interface ReadableStream<R> {
		[Symbol.asyncIterator]: () => AsyncIterableIterator<R>;
	}
}
