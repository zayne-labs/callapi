import { createFetchClient } from "@zayne-labs/callapi";
import { defineSchema } from "@zayne-labs/callapi/utils";
import * as z from "zod";

// void await callApi("https://dummyjson.com/products/:id", {
// 	method: "GET",
// 	params: { id: 3 },
// });

export const zoomOauthApiSchema = defineSchema(
	{
		"@post/access": {
			auth: z.object({
				password: z.string(),
				type: z.literal("Basic"),
				username: z.string(),
			}),
			data: z.object({
				access_token: z.jwt(),
				api_url: z.url(),
				expires_in: z.number(),
				scope: z.string(),
				token_type: z.string(),
			}),
			query: z.object({
				account_id: z.string(),
				grant_type: z.literal(["account_credentials"]),
			}),
		},
		/**
		 * @description Gets a zoom access token.
		 * @see https://developers.zoom.us/docs/integrations/oauth/#request-an-access-token
		 */
		token: {
			auth: z.object({
				password: z.string(),
				type: z.literal("Basic"),
				username: z.string(),
			}),
			data: z.object({
				access_token: z.jwt(),
				api_url: z.url(),
				expires_in: z.number(),
				scope: z.string(),
				token_type: z.string(),
			}),
			query: z.object({
				account_id: z.string(),
				grant_type: z.literal(["account_credentials"]),
			}),
		},
	},
	{ prefix: "api.main/", strict: true }
);

const callZoomApi = createFetchClient({
	schema: zoomOauthApiSchema,
});

// eslint-disable-next-line ts-eslint/no-unused-vars -- Ignore
const resultFromZoomApi = await callZoomApi("api.main/token", {
	auth: {
		password: "123456",
		type: "Basic",
		username: "zoom@example.com",
	},
	query: {
		account_id: "123456",
		grant_type: "account_credentials",
	},
});
