import { callApi, createFetchClient } from "@zayne-labs/callapi";
import { definePlugin, defineSchema } from "@zayne-labs/callapi/utils";

import * as z from "zod";

const { data } = await callApi("https://dummyjson.com/products/:id", {
	method: "GET",
	params: { id: 3 },
});

console.info(data);

const foo = definePlugin({
	id: "ds",
	name: "asa",
	schema: defineSchema({
		"/school": {
			data: z.object({
				id: z.number(),
				name: z.string(),
			}),
		},
	}),
});

const foo2 = definePlugin({
	id: "ds",
	name: "asa",
	schema: defineSchema({
		"/class": {
			data: z.object({
				id: z.number(),
				student: z.string(),
			}),
		},
	}),
});

const callBackendApi = createFetchClient({
	baseURL: "https://api.example.com",

	plugins: [foo, foo2],

	schema: defineSchema({
		"/products/:id": {
			data: z.object({
				category: z.string(),
				id: z.number(),
			}),
			params: z.object({ id: z.number() }).optional(),
		},
	}),
});

// Using object syntax for params validator
const result = await callBackendApi("/products/:id", {
	// params: {
	// 	id: 123,
	// },
	// params: ["electronics", "123"],
	// params: {
	// 	category: "electronics",
	// 	id: "123",
	// 	name: "product",
	// },
});

console.info(result);
