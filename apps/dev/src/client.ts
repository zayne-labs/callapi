import {
	type CallApiParameters,
	createFetchClient,
	type PluginHooksWithMoreOptions,
	type PluginSetupContext,
	type ResultModeUnion,
	type SuccessContext,
} from "@zayne-labs/callapi";
import { loggerPlugin } from "@zayne-labs/callapi-plugins";
import { definePlugin, defineSchema } from "@zayne-labs/callapi/utils";
import * as z from "zod";
import * as zv3 from "zod/v3";

const newOptionSchema1 = zv3.object({
	onUpload: zv3.function().args(
		zv3.object({
			loaded: zv3.number(),
			total: zv3.number(),
		})
	),
});

const newOptionSchema2 = zv3.object({
	onUploadSuccess: zv3.function().args(
		zv3.object({
			load: zv3.number(),
			tots: zv3.number(),
		})
	),
});

type Plugin2Options = zv3.infer<typeof newOptionSchema2>;

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

	name: "plugin",

	setup: ({ options, request }: PluginSetupContext<Plugin2Options>) => {
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
});

const apiSchema = defineSchema(
	{
		".": {
			// data: z.object({ random: z.number() }),
			// params: z.object({ per_page: z.number() }).optional(),
		},

		"@delete/products/:id": {
			data: z.object({ id: z.number() }),
			// headers: z.object({ Authorization: z.string() }).optional(),
		},

		"/products/:id": {
			data: z.object({ id: z.number(), price: z.number(), title: z.string() }),
		},

		"/products/{id}": {
			data: z.object({ id: z.number(), price: z.number(), title: z.string() }),
		},

		"https://api.github.com/repos/zayne-labs/ui/commits": {
			// body: z.object({ flow: z.string() }),
			// data: z.array(z.object({ version: z.string() })),
			query: z.object({ per_page: z.number() }),
		},
	},
	{ strict: true }
);
const callMainApi = createFetchClient({
	baseURL: "https://dummyjson.com",
	onRequest: [() => console.info("OnRequest1 - BASE"), () => console.info("OnRequest2 - BASE")],
	onUpload: (_progress) => {},
	onUploadSuccess: (_progress) => {},
	plugins: [pluginOne, pluginTwo, loggerPlugin({})],
	schema: apiSchema,
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

const [result1, result2, result3, result4, result5, result6, result7, result8] = await Promise.all([
	callMainApi<{ price: number }>("/products/:id", {
		onRequest: () => console.info("OnRequest - INSTANCE"),
		params: { id: 1 },
	}),

	callMainApi("/products/:id", {
		params: [1],
	}),

	callMainApi("/products/:id", {
		params: [1],
	}),

	callMainApi("/products/{id}", {
		params: [1],
	}),

	callMainApi("@delete/products/:id", {
		params: {
			id: "beans",
		},
	}),

	callMainApi("/products/{id}", {
		params: [1],
	}),

	callMainApi("/products/:id", {
		body: stream,
		method: "POST",
		onRequestStream: (ctx) => console.info("OnRequestStream", { event: ctx.event }),
		params: [1],
	}),

	callMainApi("https://api.github.com/repos/zayne-labs/ui/commits", {
		onRequestStream: (ctx) => console.info("OnRequestStream", { event: ctx.event }),
		onResponseStream: (ctx) => console.info("OnResponseStream", { event: ctx.event }),
		query: { per_page: 50 },
	}),
]);

console.info(result1, result2, result3, result4, result5, result6, result7, result8);

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
		resultMode: "onlyData",
		throwOnError: true,
		...config,
	});
};

// const getAllowedDomains = async () => {
// 	await wait(1000);
// 	return ["example.com", "company.com"];
// };

// const callApi = createFetchClient({
// 	baseURL: "https://api.example.com",

// 	schema: defineSchema({
// 		"/users": {
// 			// Async body validator with custom validation
// 			body: async (body) => {
// 				if (!body || typeof body !== "object") {
// 					throw new Error("Invalid request body");
// 				}

// 				// Required fields
// 				if (!("name" in body) || typeof body.name !== "string") {
// 					throw new Error("Name is required");
// 				}

// 				if (!("email" in body) || typeof body.email !== "string" || !body.email.includes("@")) {
// 					throw new Error("Valid email required");
// 				}

// 				// Validate domain against allowed list
// 				const domain = body.email.split("@")[1] ?? "";
// 				const allowed = await getAllowedDomains();

// 				if (!allowed.includes(domain)) {
// 					throw new Error(`Email domain ${domain} not allowed`);
// 				}

// 				return {
// 					email: body.email.toLowerCase(),
// 					name: body.name.trim(),
// 				};
// 			},

// 			// Response data validator
// 			data: (data) => {
// 				if (
// 					!data
// 					|| typeof data !== "object"
// 					|| !("id" in data)
// 					|| !("name" in data)
// 					|| !("email" in data)
// 				) {
// 					throw new Error("Invalid response data");
// 				}

// 				return data; // Type will be narrowed to { id: number; name: string; email: string }
// 			},
// 		},
// 	}),
// });

// // @annotate: Types are inferred from validator return types
// // eslint-disable-next-line ts-eslint/no-unused-vars
// const { data } = await callApi("/users", {
// 	body: {
// 		email: "JOHN@example.com",
// 		name: " John ", // Will be trimmed & lowercased.
// 	},
// });

// const callBApi = createFetchClient({
// 	baseURL: "https://api.example.com",
// 	schema: defineSchema(
// 		{
// 			"/user": {
// 				data: z.object({
// 					id: z.number(),
// 					name: z.string(),
// 				}),
// 			},
// 		},
// 		{
// 			// strict: true,
// 			disableRuntimeValidation: true,
// 		}
// 	),
// });

// const mad = await callBApi(new URL("/user/f", "https://api.example.com"), {
// 	schema: (ctx) => ({
// 		data: z.null(),
// 	}),
// 	// @annotate: This will override the base schema for this specific path
// 	schemaConfig: defineSchemaConfig((ctx) => ({
// 		disableRuntimeValidation: false,
// 		strict: false,
// 	})),
// });
