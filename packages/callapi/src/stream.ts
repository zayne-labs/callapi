import {
	executeHooks,
	type RequestContext,
	type RequestStreamContext,
	type ResponseStreamContext,
} from "./hooks";
import type { Awaitable, DistributivePick } from "./types/type-helpers";
import { isString } from "./utils/guards";

export type StreamProgressEvent = {
	/**
	 * Current chunk of data being streamed.
	 *
	 * Will be `null` on the final completion tick (when progress reaches 100%).
	 */
	chunk: Uint8Array | null;
	/**
	 * Progress in percentage
	 */
	progress: number;
	/**
	 * Total size of data in bytes
	 */
	totalBytes: number;
	/**
	 * Amount of data transferred so far
	 */
	transferredBytes: number;
};

type CreateProgressEventOptions = Omit<StreamProgressEvent, "chunk" | "progress">
	& (
		| {
				chunk: null;
				isDone: true;
		  }
		| {
				chunk: Uint8Array;
				isDone?: false;
		  }
	);

const createProgressEvent = (options: CreateProgressEventOptions): StreamProgressEvent => {
	const { chunk, isDone, totalBytes, transferredBytes } = options;

	let percentage = totalBytes === 0 ? 0 : transferredBytes / totalBytes;

	// == Avoid reporting 100% progress before the stream is actually finished (in case totalBytes is inaccurate)
	if (percentage >= 1) {
		// == Epsilon is used here to get as close as possible to 100% without reaching it.
		// == If we were to hardcode 0.99 here, the percentage could potentially go backwards.
		percentage = 1 - Number.EPSILON;
	}

	const progress = (isDone ? 1 : percentage) * 100;

	return {
		chunk,
		progress,
		totalBytes,
		transferredBytes,
	};
};

const textEncoder = new TextEncoder();

const estimateBodySize = (body: RequestContext["request"]["body"]): number => {
	if (!body) {
		return 0;
	}

	if (body instanceof ReadableStream) {
		return 0;
	}

	if (body instanceof FormData) {
		let size = 0;

		for (const [key, value] of body) {
			size += 40; // Size in bytes of a typical form boundary (e.g., '------WebKitFormBoundaryaxpyiPgbbPti10Rw'), used to help estimate upload size
			size += textEncoder.encode(`Content-Disposition: form-data; name="${key}"`).byteLength;
			size += isString(value) ? textEncoder.encode(value).byteLength : value.size;
		}

		return size;
	}

	if (body instanceof Blob) {
		return body.size;
	}

	if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
		return body.byteLength;
	}

	if (isString(body) || body instanceof URLSearchParams) {
		return textEncoder.encode(String(body)).byteLength;
	}

	return 0;
};

const createTrackedStream = (streamOptions: {
	initialTotalBytes: number;
	onStream: (event: StreamProgressEvent) => Awaitable<void>;
	streamBody: ReadableStream<Uint8Array<ArrayBuffer>>;
}) => {
	const { initialTotalBytes, onStream, streamBody } = streamOptions;

	let totalBytes = initialTotalBytes;
	let transferredBytes = 0;

	const reportProgress = async (
		progressOptions: DistributivePick<CreateProgressEventOptions, "chunk" | "isDone">
	) => {
		const { chunk, isDone } = progressOptions;

		if (isDone) {
			await onStream(createProgressEvent({ chunk: null, isDone: true, totalBytes, transferredBytes }));
			return;
		}

		transferredBytes += chunk.byteLength;
		totalBytes = Math.max(totalBytes, transferredBytes);

		await onStream(createProgressEvent({ chunk, totalBytes, transferredBytes }));
	};

	return streamBody.pipeThrough(
		new TransformStream({
			flush: async () => {
				await reportProgress({ chunk: null, isDone: true });
			},
			start: async () => {
				await reportProgress({ chunk: new Uint8Array() });
			},
			transform: async (chunk, controller) => {
				controller.enqueue(chunk);
				await reportProgress({ chunk });
			},
		})
	);
};

type ToStreamableRequestContext = RequestContext;

export const toStreamableRequest = (context: ToStreamableRequestContext): Request | RequestInit => {
	const { baseConfig, config, options, request } = context;

	if (!options.onRequestStream || !request.body) {
		return request as RequestInit;
	}

	const requestInstance = new Request(
		options.fullURL as NonNullable<typeof options.fullURL>,
		{ ...request, duplex: "half" } as RequestInit
	);

	const contentLength = requestInstance.headers.get("content-length");

	const initialTotalBytes =
		contentLength ?
			Math.max(0, Number(contentLength) || 0)
		:	estimateBodySize(config.body ?? request.body);

	const streamBody = requestInstance.body;

	if (!streamBody) {
		return requestInstance;
	}

	const requestStreamContext = {
		baseConfig,
		config,
		options,
		request,
		requestInstance,
	} satisfies Omit<RequestStreamContext, "event">;

	const trackedStream = createTrackedStream({
		initialTotalBytes,
		onStream: async (event) => {
			await executeHooks(options.onRequestStream?.({ ...requestStreamContext, event }));
		},
		streamBody,
	});

	return new Request(requestInstance, { body: trackedStream, duplex: "half" } as RequestInit);
};

type StreamableResponseContext = RequestContext & {
	response: Response;
};

export const toStreamableResponse = (context: StreamableResponseContext): Response => {
	const { baseConfig, config, options, request, response } = context;

	if (!options.onResponseStream || !response.body || response.status === 204) {
		return response;
	}

	const initialTotalBytes = Math.max(0, Number(response.headers.get("content-length")) || 0);

	const streamBody = response.body;

	const responseStreamContext = {
		baseConfig,
		config,
		options,
		request,
		response,
	} satisfies Omit<ResponseStreamContext, "event">;

	const stream = createTrackedStream({
		initialTotalBytes,
		onStream: async (event) => {
			await executeHooks(options.onResponseStream?.({ ...responseStreamContext, event }));
		},
		streamBody,
	});

	return new Response(stream, response);
};
