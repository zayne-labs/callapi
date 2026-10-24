import { tool } from "ai";
import { Document, type DocumentData } from "flexsearch";
import { z } from "zod";
import { getLocalSourceFiles, getRemoteSourceFiles, type SourceFile } from "../context/utils";

const LinesPerChunk = 80;
const ChunkOverlap = 20;
const MaxExcerptLines = 16;
const MaxExcerptCharacters = 2_000;
const SearchStopWords = new Set([
	"about",
	"api",
	"callapi",
	"code",
	"details",
	"does",
	"explain",
	"for",
	"from",
	"how",
	"implementation",
	"library",
	"package",
	"source",
	"the",
	"this",
	"what",
	"when",
	"where",
	"which",
	"with",
	"work",
	"works",
]);

type SourceChunk = DocumentData & {
	content: string;
	path: string;
	startLine: number;
};

const getSourceFiles = async (): Promise<SourceFile[]> => {
	try {
		return await getLocalSourceFiles();
	} catch (localError) {
		console.warn("Local CallApi source unavailable; loading source from GitHub:", localError);
		return getRemoteSourceFiles();
	}
};

const splitIntoChunks = (file: SourceFile): SourceChunk[] => {
	const lines = file.content.split("\n");
	const chunks: SourceChunk[] = [];

	for (let start = 0; start < lines.length; start += LinesPerChunk - ChunkOverlap) {
		const content = lines.slice(start, start + LinesPerChunk).join("\n");

		chunks.push({
			content,
			path: file.path,
			startLine: start + 1,
		});
	}

	return chunks;
};

const createSourceSearch = async () => {
	const search = new Document<SourceChunk>({
		document: {
			id: "id",
			index: ["path", "content"],
			store: true,
		},
	});
	const files = await getSourceFiles();
	const chunks = files.flatMap((file) => splitIntoChunks(file));

	for (const [id, chunk] of chunks.entries()) {
		search.add({ ...chunk, id });
	}

	return search;
};

let sourceSearchPromise: ReturnType<typeof createSourceSearch> | undefined;

const getSourceSearch = () => {
	sourceSearchPromise ??= createSourceSearch();
	return sourceSearchPromise;
};

const getSearchTerms = (query: string) =>
	[...new Set((query.toLowerCase().match(/[\w$]+/g) ?? []).filter((term) => term.length > 1))]
		.filter((term) => !SearchStopWords.has(term))
		.slice(0, 8);

const escapeRegExp = (value: string) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const getChunkRelevance = (chunk: SourceChunk, terms: string[]) => {
	const content = chunk.content.toLowerCase();
	let score = 0;

	for (const term of terms) {
		if (!content.includes(term)) {
			continue;
		}

		score += 2;
		if (new RegExp(String.raw`\b${escapeRegExp(term)}\b`, "i").test(content)) {
			score += 2;
		}
	}

	return score;
};

const createExcerpt = (chunk: SourceChunk, terms: string[]) => {
	const lines = chunk.content.split("\n");
	const matchIndex = lines.reduce(
		(bestIndex, line, index) => {
			const lowerLine = line.toLowerCase();
			const score = terms.reduce((total, term) => total + Number(lowerLine.includes(term)), 0);

			return score > bestIndex.score ? { index, score } : bestIndex;
		},
		{ index: 0, score: 0 }
	).index;
	const excerptStart = Math.max(0, matchIndex - 2);
	const excerptEnd = Math.min(lines.length, excerptStart + MaxExcerptLines);
	const excerptLines: string[] = [];
	let excerptLength = 0;

	for (const line of lines.slice(excerptStart, excerptEnd)) {
		const remainingCharacters = MaxExcerptCharacters - excerptLength;

		if (remainingCharacters <= 0) {
			break;
		}

		excerptLines.push(
			line.length > remainingCharacters ? `${line.slice(0, remainingCharacters)}…` : line
		);
		excerptLength += line.length + 1;
	}

	return {
		endLine: chunk.startLine + excerptStart + excerptLines.length - 1,
		snippet: excerptLines.join("\n"),
		startLine: chunk.startLine + excerptStart,
	};
};

export const searchSourceTool = tool({
	description:
		"Search the CallApi package source code for implementation details, types, and exact behavior. Use this when a question asks how the library works internally, for API/type details, or when documentation search is insufficient. Cite returned file paths and line ranges.",
	execute: async ({ limit, query }) => {
		const terms = getSearchTerms(query);

		if (terms.length === 0) {
			return { results: [] };
		}

		const search = await getSourceSearch();

		const matches = search.search(terms.join(" "), {
			enrich: true,
			limit: Math.max(limit * 8, 24),
			merge: true,
		});

		const packageMetadataQuery =
			/\b(?:package(?:\.json)?|manifest|version|dependenc(?:y|ies)|exports?)\b/i.test(query);
		const rankedChunks = matches.flatMap(({ doc }) => {
			if (!doc || (doc.path.endsWith("/package.json") && !packageMetadataQuery)) {
				return [];
			}

			const score = getChunkRelevance(doc, terms);

			return score > 0 ? [{ chunk: doc, score }] : [];
		});

		rankedChunks.sort((a, b) => b.score - a.score);

		const seenPaths = new Set<string>();
		const relevantChunks = rankedChunks.filter(({ chunk }) => {
			if (seenPaths.has(chunk.path)) {
				return false;
			}

			seenPaths.add(chunk.path);
			return true;
		});

		return {
			results: relevantChunks.slice(0, limit).map(({ chunk }) => {
				const excerpt = createExcerpt(chunk, terms);

				return {
					path: chunk.path,
					...excerpt,
					url: `https://github.com/zayne-labs/callapi/blob/main/${chunk.path}#L${excerpt.startLine}-L${excerpt.endLine}`,
				};
			}),
		};
	},
	inputSchema: z.object({
		limit: z.number().int().min(1).max(4).default(3),
		query: z.string().trim().min(2).max(256),
	}),
});

export type SearchSourceToolType = typeof searchSourceTool;
