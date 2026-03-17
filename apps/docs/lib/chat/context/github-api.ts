import { createFetchClient } from "@zayne-labs/callapi";
import { defineSchema } from "@zayne-labs/callapi/utils";
import { z } from "zod";

const GitHubContentItemSchema = z.object({
	git_url: z.string(),
	name: z.string(),
	type: z.string(),
});

export const GitHubTreeResponseSchema = z.object({
	tree: z.array(
		z.object({
			path: z.string(),
			type: z.enum(["blob", "tree"]),
		})
	),
});

const apiSchema = defineSchema({
	"https://api.github.com/repos/zayne-labs/callapi/contents/packages/callapi": {
		data: GitHubContentItemSchema.array(),
	},
	"https://raw.githubusercontent.com/zayne-labs/callapi/main/packages/callapi/package.json": {
		data: z.string(),
	},
	"https://raw.githubusercontent.com/zayne-labs/callapi/main/packages/callapi/src/:filePath": {
		data: z.string(),
	},
});

export const callGithubApi = createFetchClient({
	resultMode: "onlyData",
	schema: apiSchema,
	throwOnError: true,
});
