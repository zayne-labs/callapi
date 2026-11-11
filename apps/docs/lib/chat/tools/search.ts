import { tool } from "ai";
import { Document, type DocumentData } from "flexsearch";
import { z } from "zod";
import { source } from "@/lib/source";

const createSearchServer = async () => {
	type CustomDocument = DocumentData & {
		content: string;
		description: string;
		title: string;
		url: string;
	};

	const search = new Document<CustomDocument>({
		document: {
			id: "url",
			index: ["title", "description", "content"],
			store: true,
		},

		// == Same tokenizer as fumadocs-core's flexsearch, matching parts of words like "drop" in "dropzone"
		tokenize: "full",
	});

	const docs = await Promise.all(
		source.getPages().map(async (page) => {
			if (!("getText" in page.data)) {
				return null;
			}

			return {
				content: await page.data.getText("processed"),
				description: page.data.description ?? "",
				title: page.data.title,
				url: page.url,
			};
		})
	);

	for (const doc of docs) {
		if (doc) {
			search.add(doc);
		}
	}

	return search;
};

let searchServerPromise: ReturnType<typeof createSearchServer> | undefined;

// == Built on the first search, not when the route module loads
const getSearchServer = () => {
	searchServerPromise ??= createSearchServer();
	return searchServerPromise;
};

const getSnippet = (content: string, query: string) => {
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
	const lowerContent = content.toLowerCase();
	const matchIndex = terms.reduce((earliest, term) => {
		const index = lowerContent.indexOf(term);

		return index !== -1 && (earliest === -1 || index < earliest) ? index : earliest;
	}, -1);
	const start = Math.max(0, matchIndex - 160);
	const end = Math.min(content.length, start + 480);
	const prefix = start > 0 ? "…" : "";
	const suffix = end < content.length ? "…" : "";

	return `${prefix}${content.slice(start, end).trim()}${suffix}`;
};

export const searchTool = tool({
	description:
		"Search CallApi documentation for evidence relevant to the user's question. Call this before answering CallApi questions. Returns a few matching pages, each with its title and URL under `doc`, plus a concise excerpt.",

	execute: async ({ limit, query }) => {
		const search = await getSearchServer();
		const matches = search.search(query, {
			enrich: true,
			limit,
			merge: true,
		});

		// == Each result has `doc: { title, url }`, the shape `AIChatSearch` from @fumadocs/ai-chat renders
		return matches.flatMap(({ doc }) => {
			if (!doc) {
				return [];
			}

			return {
				description: doc.description,
				doc: { title: doc.title, url: doc.url },
				snippet: getSnippet(doc.content, query),
			};
		});
	},

	inputSchema: z.object({
		limit: z.number().int().min(1).max(5).default(4),
		query: z.string().trim().min(2).max(256),
	}),
});

export type SearchToolType = typeof searchTool;
