import { createFetchClient } from "@zayne-labs/callapi";
import { z } from "zod";
import { getLLMText } from "../get-llm-text";
import { source } from "../source";

// const baseURL = process.env.URL ?? "http://localhost:3000";

export const getDocumentationContext = async () => {
	const scan = source.getPages().map((page) => getLLMText(page));

	const scannedPages = await Promise.all(scan);

	// if (error) {
	// 	console.error("Failed to fetch documentation context:", error.message);
	// 	throw error.originalError;
	// }

	const contextParts = [
		"=== CALLAPI DOCUMENTATION CONTEXT ===",
		"This context contains all information from the CallAPI documentation needed to help answer user questions accurately.",
		scannedPages,
	];

	return contextParts.join("\n\n");
};

const GitHubContentItemSchema = z.object({
	download_url: z.string().nullable(),
	git_url: z.string(),
	name: z.string(),
	path: z.string(),
	sha: z.string(),
	size: z.number().optional(),
	type: z.string(),
});

const GitHubContentResponseSchema = GitHubContentItemSchema.array();

const GitHubTreeItemSchema = z.object({
	mode: z.string(),
	path: z.string(),
	sha: z.string(),
	size: z.number().optional(),
	type: z.enum(["blob", "tree"]),
	url: z.string(),
});

const GitHubTreeResponseSchema = z.object({
	sha: z.string(),
	tree: GitHubTreeItemSchema.array(),
	truncated: z.boolean(),
	url: z.string(),
});

const callGithubApi = createFetchClient({
	resultMode: "onlyData",
	throwOnError: true,
});

export const getSourceCodeContext = async () => {
	try {
		const srcDirGitURL = await callGithubApi(
			"https://api.github.com/repos/zayne-labs/callapi/contents/packages/callapi",
			{ schema: { data: GitHubContentResponseSchema } }
		).then((contents) => contents.find((item) => item.name === "src" && item.type === "dir")?.git_url);

		if (!srcDirGitURL) {
			throw new Error("Source directory not found");
		}

		const treeData = await callGithubApi(srcDirGitURL, {
			query: { recursive: true },
			schema: { data: GitHubTreeResponseSchema },
		});

		const filePaths = treeData.tree
			.filter((item) => item.type === "blob" && item.path.endsWith(".ts"))
			.map((item) => item.path);

		const fileContents = await Promise.all(
			filePaths.map(async (filePath) => {
				const content = await callGithubApi(
					"https://raw.githubusercontent.com/zayne-labs/callapi/main/packages/callapi/src/:filePath",
					{
						params: { filePath },
						responseType: "text",
					}
				);

				return `// File: packages/callapi/src/${filePath}\n${content}`;
			})
		);

		return `
		=== CALLAPI SOURCE CODE CONTEXT ===
		${fileContents.join("\n\n")}
	`;
	} catch (error) {
		console.error("Failed to fetch source code context:", error);

		return `
		=== CALLAPI SOURCE CODE CONTEXT ===
		Failed to fetch source code context.
	`;
	}
};

export const getSystemPromptContext = () => {
	return `
		You are an expert assistant for this library, CallApi, a modern and advanced HTTP client library built on the Fetch API. Your role is solely to help developers understand and effectively use CallApi for their projects.

		When asked about yourself, you are to say that you are an expert assistant for CallApi, a modern and advanced HTTP client library built on the Fetch API

		**When helping users:**
		- Provide working code snippets relevant to their use case. Never use code or api's that don't exist in the CallApi library.
		- Explain the reasoning behind configuration choices
		- Address common scenarios: migration from Axios/fetch, library integrations, error handling, authentication, file handling, request deduplication
		- Point to specific documentation sections when helpful
		- Help debug TypeScript errors, validation failures, and configuration issues

		**Code examples should:**
		- Be production-ready with proper TypeScript typing
		- Show appropriate error handling patterns
		- Demonstrate the most suitable CallApi features for the problem
		- Consider performance, bundle size, and developer experience

		Focus on practical solutions that solve their immediate needs.
	`;
};
