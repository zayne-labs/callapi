import { loader, type InferMetaType, type InferPageType } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import type { RemarkAutoTypeTableOptions } from "fumadocs-typescript";
import { shikiOptions } from "../shiki";

export const docs = defineDocs({
	dir: "content/docs",

	docs: {
		async: true,
		compiler: "satteri",

		lastModified: true,

		postprocess: {
			extractLinkReferences: true,
			includeProcessedMarkdown: true,
		},

		satteriOptions: async () => {
			const [
				{ defaultTwoslashOptions },
				{ rehypeCodeDefaultOptions },
				{ transformerTwoslash },
				{ createFileSystemGeneratorCache, createGenerator },
				{ createFileSystemTypesCache },
				{ remarkAutoTypeTable },
			] = await Promise.all([
				import("@shikijs/twoslash"),
				import("fumadocs-core/mdx-plugins/rehype-code"),
				import("fumadocs-twoslash"),
				import("fumadocs-typescript"),
				import("fumadocs-twoslash/cache-fs"),
				import("@fumadocs/satteri/remark-auto-type-table"),
			]);

			const typeTableGenerator = createGenerator({
				cache: createFileSystemGeneratorCache(".next/cache/fumadocs-typescript"),
			});

			const typeTableOptions: RemarkAutoTypeTableOptions = {
				generator: typeTableGenerator,
				shiki: {
					themes: shikiOptions.themes,
				},
			};

			const defaultTwoSlashOptions = defaultTwoslashOptions();

			return {
				mdastPlugins: (plugins) => [remarkAutoTypeTable(typeTableOptions), ...plugins],

				rehypeCodeOptions: {
					inline: "tailing-curly-colon",
					langs: ["ts", "js", "html", "tsx", "mdx", "bash"],
					themes: shikiOptions.themes,

					transformers: [
						...(rehypeCodeDefaultOptions.transformers ?? []),
						transformerTwoslash({
							twoslashOptions: {
								// == Spreading default twoslash options from shiki cuz it contains the support for annotation tags like `@annotate`.
								...defaultTwoSlashOptions,
								compilerOptions: {
									types: ["node"],
									...defaultTwoSlashOptions.compilerOptions,
									noErrorTruncation: true,
								},
							},
							typesCache: createFileSystemTypesCache(),
						}),
					],
				},

				remarkCodeTabOptions: {
					parseMdx: true,
				},

				remarkNpmOptions: {
					persist: {
						id: "package-manager",
					},
				},
			};
		},

		schema: pageSchema,
	},

	meta: {
		schema: metaSchema,
	},
});

export const source = loader({
	baseUrl: "/docs",
	plugins: [lucideIconsPlugin()],
	source: docs.toFumadocsSource(),
});

export type Page = InferPageType<typeof source>;
export type Meta = InferMetaType<typeof source>;
