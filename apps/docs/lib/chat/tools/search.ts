import { tool } from "ai";
import { Document, type DocumentData } from "flexsearch";
import { z } from "zod";
import { source } from "@/lib/source";

type CustomDocument = DocumentData & {
	content: string;
	description: string;
	title: string;
	url: string;
};

const chunkedAll = async <TResult>(resultPromises: Array<Promise<TResult>>): Promise<TResult[]> => {
	const SIZE = 50;

	const resultArray: TResult[] = [];

	for (let index = 0; index < resultPromises.length; index += SIZE) {
		// eslint-disable-next-line no-await-in-loop
		const resolved = await Promise.all(resultPromises.slice(index, index + SIZE));

		resultArray.push(...resolved);
	}

	return resultArray;
};

const createSearchServer = async () => {
	const search = new Document<CustomDocument>({
		document: {
			id: "url",
			index: ["title", "description", "content"],
			store: true,
		},
	});

	const docs = await chunkedAll(
		source.getPages().map(async (page) => {
			if (!("getText" in page.data)) {
				return null;
			}

			return {
				content: await page.data.getText("raw"),
				description: page.data.description,
				title: page.data.title,
				url: page.url,
			} as CustomDocument;
		})
	);

	for (const doc of docs) {
		if (!doc) continue;

		search.add(doc);
	}

	return search;
};

const searchServer = createSearchServer();

export const searchTool = tool({
	description: "Search the docs content and return raw JSON results.",

	execute: async ({ limit, query }) => {
		const search = await searchServer;

		return search.searchAsync(query, { enrich: true, limit, merge: true });
	},

	inputSchema: z.object({
		limit: z.number().int().min(1).max(100).default(10),
		query: z.string(),
	}),
});

export type SearchToolType = typeof searchTool;
