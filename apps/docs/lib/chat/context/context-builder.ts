import { getLLMText, source } from "@/lib/source";
import { assembleContext, getLocalSourceContext, getRemoteSourceContext } from "./utils";

export const getDocumentationContext = async () => {
	const pages = source.getPages();
	const results = await Promise.allSettled(pages.map((element) => getLLMText(element)));

	const scannedPages = results
		.filter((res): res is PromiseFulfilledResult<string> => res.status === "fulfilled")
		.map((res) => res.value);

	return assembleContext(
		"CALLAPI DOCUMENTATION CONTEXT",
		"This context contains all information from the CallAPI documentation needed to help answer user questions accurately.",
		scannedPages.length > 0 ? scannedPages : ["No documentation content found."]
	);
};

export const getSourceCodeContext = async () => {
	try {
		return await getLocalSourceContext();
	} catch (localError) {
		console.warn("Local source code access failed, falling back to GitHub:", localError);

		return getRemoteSourceContext().catch((error: unknown) => {
			console.error("Failed to fetch source code context from both local and remote:", error);

			return "Error: Unable to retrieve source code context.";
		});
	}
};
