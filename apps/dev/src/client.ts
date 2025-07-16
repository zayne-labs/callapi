import {
	type CallApiParameters,
	createFetchClient,
	definePlugin,
	defineSchema,
	type PluginHooksWithMoreOptions,
	type PluginInitContext,
	type ResultModeUnion,
	type SuccessContext,
} from "@zayne-labs/callapi";
import { loggerPlugin } from "@zayne-labs/callapi-plugins";
import * as z from "zod/v3";

const newOptionSchema1 = z.object({
	onUpload: z.function().args(
		z.object({
			loaded: z.number(),
			total: z.number(),
		})
	),
});

const newOptionSchema2 = z.object({
	onUploadSuccess: z.function().args(
		z.object({
			load: z.number(),
			tots: z.number(),
		})
	),
});

type Plugin2Options = z.infer<typeof newOptionSchema2>;

const pluginOne = definePlugin({
	defineExtraOptions: () => newOptionSchema1,

	hooks: {
		onRequest: () => console.info("OnRequest - PLUGIN1"),
	},

	id: "1",

	name: "plugin",
});

const pluginTwo = definePlugin({
	defineExtraOptions: () => newOptionSchema2,

	hooks: {
		onRequest: () => console.info("OnRequest - PLUGIN2"),
		onSuccess: (_ctx: SuccessContext<{ foo: string }>) => console.info("OnSuccess - PLUGIN2"),
	} satisfies PluginHooksWithMoreOptions<Plugin2Options>,

	id: "2",

	init: ({ options, request }: PluginInitContext<Plugin2Options>) => {
		options.onUploadSuccess?.({ load: 0, tots: 0 });

		return {
			request: {
				...request,
				headers: {
					...request.headers,
					Authorization: request.headers["X-Environment"],
				},
			},
		};
	},

	name: "plugin",
});

const callMainApi = createFetchClient({
	baseURL: "https://dummyjson.com",
	onRequest: [() => console.info("OnRequest1 - BASE"), () => console.info("OnRequest2 - BASE")],
	onUpload: (_progress) => {},
	onUploadSuccess: (_progress) => {},
	plugins: [pluginOne, pluginTwo, loggerPlugin()],

	schema: defineSchema({
		"@delete/products/:id": {
			data: z.object({
				id: z.number(),
			}),
			headers: z
				.object({
					Authorization: z.string(),
				})
				.optional(),
		},

		"/products/:id": {
			data: z.object({
				id: z.number(),
				price: z.number(),
				title: z.string(),
			}),
		},
	}),
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const stream = new ReadableStream({
	async start(controller) {
		await wait(1000);
		controller.enqueue("This ");
		await wait(1000);
		controller.enqueue("is ");
		await wait(1000);
		controller.enqueue("a ");
		await wait(1000);
		controller.enqueue("slow ");
		await wait(1000);
		controller.enqueue("request.");
		controller.close();
	},
}).pipeThrough(new TextEncoderStream());

const [result1, result2, result3, result4, result5, result6] = await Promise.all([
	callMainApi("/products/:id/sd", {
		onRequest: () => console.info("OnRequest - INSTANCE"),
		params: [1],
		schemaConfig: () => ({ strict: false }),
	}),

	callMainApi("/products/:id", {
		params: [1],
	}),

	callMainApi("@delete/products/:id", {
		method: "DELETE",
		params: {
			id: "beans",
		},
	}),

	callMainApi("/products/:id", {
		params: [1302],
	}),

	callMainApi("/products/:id", {
		body: stream,
		method: "POST",
		onRequestStream: (ctx) => console.info("OnRequestStream", { event: ctx.event }),
		params: [1],
	}),

	callMainApi("https://api.github.com/repos/zayne-labs/ui/commits?per_page=50", {
		onRequestStream: (ctx) => console.info("OnRequestStream", { event: ctx.event }),
		onResponseStream: (ctx) => console.info("OnResponseStream", { event: ctx.event }),
	}),
]);

console.info(result1, result2, result3, result4, result5, result6);

export type ApiSuccessResponse<TData> = {
	data?: TData;
	message: string;
	status: "success";
	success: true;
};

export type ApiErrorResponse<TError = Record<string, string>> = {
	errors?: TError;
	message: string;
	status: "error";
	success: false;
};

const sharedFetchClient = createFetchClient({
	baseURL: "/api/v1",
	credentials: "same-origin",
});

export const callBackendApi = <
	TData = unknown,
	TErrorData = unknown,
	TResultMode extends ResultModeUnion = ResultModeUnion,
>(
	...parameters: CallApiParameters<ApiSuccessResponse<TData>, ApiErrorResponse<TErrorData>, TResultMode>
) => {
	const [url, config] = parameters;

	return sharedFetchClient(url, config);
};

export const callBackendApiOne = <
	TData = unknown,
	TError = unknown,
	TResultMode extends ResultModeUnion = ResultModeUnion,
>(
	...args: CallApiParameters<TData, TError, TResultMode>
) => {
	const [initUrl, config] = args;

	return sharedFetchClient(initUrl, config);
};

export const callBackendApiForQuery = <TData = unknown>(
	...parameters: CallApiParameters<ApiSuccessResponse<TData>, false | undefined>
) => {
	const [url, config] = parameters;

	return sharedFetchClient(url, {
		resultMode: "onlySuccessWithException",
		throwOnError: true,
		...config,
	});
};
