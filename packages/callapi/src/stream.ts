import {
	executeHooks,
	type RequestContext,
	type RequestStreamContext,
	type ResponseStreamContext,
} from "./hooks";
import { isObject, isReadableStream } from "./utils/guards";

export type StreamProgressEvent = {
	/**
	 * Current chunk of data being streamed
	 */
	chunk: Uint8Array;
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

const createProgressEvent = (options: {
	chunk: Uint8Array;
	totalBytes: number;
	transferredBytes: number;
}): StreamProgressEvent => {
	const { chunk, totalBytes, transferredBytes } = options;

	return {
		chunk,
		progress: Math.round((transferredBytes / totalBytes) * 100) || 0,
		totalBytes,
		transferredBytes,
	};
};

const calculateTotalBytesFromBody = async (
	requestBody: Request["body"] | null,
	existingTotalBytes: number
) => {
	let totalBytes = existingTotalBytes;

	if (!requestBody) {
		return totalBytes;
	}

	for await (const chunk of requestBody) {
		totalBytes += chunk.byteLength;
	}

	return totalBytes;
};

type ToStreamableRequestContext = RequestContext;

export const toStreamableRequest = async (
	context: ToStreamableRequestContext
): Promise<Request | RequestInit> => {
	const { baseConfig, config, options, request } = context;

	if (!options.onRequestStream || !isReadableStream(request.body)) {
		return request as RequestInit;
	}

	const requestInstance = new Request(
		options.fullURL as NonNullable<typeof options.fullURL>,
		{ ...request, duplex: "half" } as RequestInit
	);

	const contentLength = requestInstance.headers.get("content-length");

	let totalBytes = Number(contentLength ?? 0);

	const shouldForcefullyCalcStreamSize =
		isObject(options.forcefullyCalculateStreamSize) ?
			options.forcefullyCalculateStreamSize.request
		:	options.forcefullyCalculateStreamSize;

	// == If no content length is present, we read the total bytes from the body
	if (!contentLength && shouldForcefullyCalcStreamSize) {
		totalBytes = await calculateTotalBytesFromBody(requestInstance.clone().body, totalBytes);
	}

	let transferredBytes = 0;

	const stream = new ReadableStream({
		start: async (controller) => {
			const body = requestInstance.body;

			if (!body) return;

			const requestStreamContext = {
				baseConfig,
				config,
				event: createProgressEvent({ chunk: new Uint8Array(), totalBytes, transferredBytes }),
				options,
				request,
				requestInstance,
			} satisfies RequestStreamContext;

			await executeHooks(options.onRequestStream?.(requestStreamContext));

			for await (const chunk of body) {
				transferredBytes += chunk.byteLength;

				totalBytes = Math.max(totalBytes, transferredBytes);

				await executeHooks(
					options.onRequestStream?.({
						...requestStreamContext,
						event: createProgressEvent({ chunk, totalBytes, transferredBytes }),
					})
				);

				controller.enqueue(chunk);
			}

			controller.close();
		},
	});

	return new Request(requestInstance, { body: stream, duplex: "half" } as RequestInit);
};

type StreamableResponseContext = RequestContext & { response: Response };

export const toStreamableResponse = async (context: StreamableResponseContext): Promise<Response> => {
	const { baseConfig, config, options, request, response } = context;

	if (!options.onResponseStream || !response.body) {
		return response;
	}

	const contentLength = response.headers.get("content-length");

	let totalBytes = Number(contentLength ?? 0);

	const shouldForceContentLengthCalc =
		isObject(options.forcefullyCalculateStreamSize) ?
			options.forcefullyCalculateStreamSize.response
		:	options.forcefullyCalculateStreamSize;

	// == If no content length is present and `forceContentLengthCalculation` is enabled, we read the total bytes from the body
	if (!contentLength && shouldForceContentLengthCalc) {
		totalBytes = await calculateTotalBytesFromBody(response.clone().body, totalBytes);
	}

	let transferredBytes = 0;

	const stream = new ReadableStream({
		start: async (controller) => {
			const body = response.body;

			if (!body) return;

			const responseStreamContext = {
				baseConfig,
				config,
				event: createProgressEvent({ chunk: new Uint8Array(), totalBytes, transferredBytes }),
				options,
				request,
				response,
			} satisfies ResponseStreamContext;

			await executeHooks(options.onResponseStream?.(responseStreamContext));

			for await (const chunk of body) {
				transferredBytes += chunk.byteLength;

				totalBytes = Math.max(totalBytes, transferredBytes);

				await executeHooks(
					options.onResponseStream?.({
						...responseStreamContext,
						event: createProgressEvent({ chunk, totalBytes, transferredBytes }),
					})
				);

				controller.enqueue(chunk);
			}

			controller.close();
		},
	});

	return new Response(stream, response);
};
