import { docsLlms } from "@/lib/llms";
import { source } from "@/lib/source";
import { assembleContext } from "./utils";

export const getDocumentationContext = async () => {
	const pages = source.getPages();
	const results = await Promise.allSettled(pages.map((page) => docsLlms.page(page)));

	const scannedPages = results
		.filter((res): res is PromiseFulfilledResult<string> => res.status === "fulfilled")
		.map((res) => res.value);

	return assembleContext(
		"CALLAPI DOCUMENTATION CONTEXT",
		"This context contains all information from the CallAPI documentation needed to help answer user questions accurately.",
		scannedPages.length > 0 ? scannedPages : ["No documentation content found."]
	);
};
