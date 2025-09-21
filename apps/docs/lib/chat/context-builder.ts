import { source } from "@/lib/source";
import { getLLMText } from "../get-llm-text";

export const getDocumentationContext = async () => {
	const pages = source.getPages();

	const scannedPagePromises = pages.map((page) => getLLMText(page));
	const scannedPages = await Promise.all(scannedPagePromises);

	const contextParts = [
		"=== CALLAPI DOCUMENTATION CONTEXT ===",
		"This context contains all information from the CallAPI documentation needed to help answer user questions accurately.",

		...scannedPages,
	];

	return contextParts.join("\n\n");
};

export const getSystemPromptContext = () => {
	return `
		You are an expert assistant for this library, CallApi, a modern and advanced HTTP client library built on the Fetch API. Help developers understand and effectively use CallApi for their projects.

		**When helping users:**
		- Provide working code snippets relevant to their use case
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
