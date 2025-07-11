import { callApi, createFetchClient, defineSchema } from "@zayne-labs/callapi";

import * as z from "zod/v4";

const { data } = await callApi("https://dummyjson.com/products/:id", {
	method: "GET",
	params: { id: 3 },
});

console.info(data);

const callBackendApi = createFetchClient({
	baseURL: "https://api.example.com",

	schema: defineSchema({
		"/products/:id": {
			data: z.object({
				category: z.string(),
				id: z.number(),
			}),
			params: z
				.object({
					id: z.number(),
				})
				.optional(),
		},

		// Using params validator
		// "/products/:id/:category": {
		// 	// data: z.object({
		// 	// 	category: z.string(),
		// 	// 	id: z.number(),
		// 	// }),
		// 	// params: z.object({
		// 	// 	category: z.string(),
		// 	// 	id: z.string(),
		// 	// 	name: z.string(),
		// 	// }),
		// },
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
