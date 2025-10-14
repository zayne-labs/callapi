// import { callApi } from "@zayne-labs/callapi";
import { source } from "../source";
import { getLLMText } from "../get-llm-text";

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
