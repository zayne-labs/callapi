import { createFetchClient } from "@zayne-labs/callapi";
import { defineSchema } from "@zayne-labs/callapi/utils";
import { z } from "zod";
import { repoName, repoOwner } from "@/lib/github";

export const CALLAPI_PACKAGE = "packages/callapi";

// == `type` stays a string: besides "blob" and "tree", submodules show up as "commit"
const GitHubTreeResponseSchema = z.object({
	tree: z.array(
		z.object({
			path: z.string(),
			type: z.string(),
		})
	),
});

export const callGithubApi = createFetchClient({
	baseURL: `https://api.github.com/repos/${repoOwner}/${repoName}`,
	resultMode: "onlyData",
	schema: defineSchema(
		{
			"/git/trees/:ref": {
				data: GitHubTreeResponseSchema,
				params: z.object({ ref: z.string() }),
				query: z.object({ recursive: z.boolean() }),
			},
		},
		{ strict: true }
	),
	throwOnError: true,
});

// == Raw files of the package on `main`. File paths contain `/`, which path params would encode,
// == so they're appended to the URL and typed by the fallback route instead
export const callGithubRaw = createFetchClient({
	baseURL: `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${CALLAPI_PACKAGE}`,
	responseType: "text",
	resultMode: "onlyData",
	throwOnError: true,
});
