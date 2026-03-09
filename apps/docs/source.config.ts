import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { applyMdxPreset, defineConfig, defineDocs } from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";
import type { RemarkAutoTypeTableOptions } from "fumadocs-typescript";
import type { ElementContent } from "hast";
import type { ShikiTransformer } from "shiki";
import { shikiConfig } from "./lib/shiki";

export const docs = defineDocs({
	dir: "content/docs",

	docs: {
		async: true,

		mdxOptions: async (options) => {
			const [
				{ defaultTwoslashOptions },
				{ rehypeCodeDefaultOptions },
				{ transformerTwoslash },
				{ createFileSystemGeneratorCache, createGenerator, remarkAutoTypeTable },
				{ createFileSystemTypesCache },
			] = await Promise.all([
				import("@shikijs/twoslash"),
				import("fumadocs-core/mdx-plugins/rehype-code"),
				import("fumadocs-twoslash"),
				import("fumadocs-typescript"),
				import("fumadocs-twoslash/cache-fs"),
			]);

			const typeTableOptions: RemarkAutoTypeTableOptions = {
				generator: createGenerator({
					cache: createFileSystemGeneratorCache(".next/fumadocs-typescript"),
				}),
				shiki: shikiConfig,
			};

			const defaultTwoSlashOptions = defaultTwoslashOptions();

			return applyMdxPreset({
				rehypeCodeOptions: {
					inline: "tailing-curly-colon",
					langs: ["ts", "js", "html", "tsx", "mdx", "bash"],
					themes: shikiConfig.defaultThemes.themes,

					transformers: [
						...(rehypeCodeDefaultOptions.transformers ?? []),
						transformerTwoslash({
							twoslashOptions: {
								// == Spreading default twoslash options from shiki cuz it contains the support for annotation tags like `@annotate`.
								...defaultTwoSlashOptions,
								compilerOptions: {
									...defaultTwoSlashOptions.compilerOptions,
									noErrorTruncation: true,
								},
							},
							typesCache: createFileSystemTypesCache(),
						}),
						transformerEscape(),
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

				remarkPlugins: [[remarkAutoTypeTable, typeTableOptions]],
			})(options);
		},

		postprocess: {
			extractLinkReferences: true,
			includeProcessedMarkdown: true,
		},

		schema: pageSchema,
	},

	meta: {
		schema: metaSchema,
	},
});

const transformerEscape = (): ShikiTransformer => {
	const replace = (node: ElementContent) => {
		if (node.type === "text") {
			// eslint-disable-next-line no-param-reassign
			node.value = node.value.replace(String.raw`[\!code`, "[!code");
		} else if ("children" in node) {
			for (const child of node.children) {
				replace(child);
			}
		}
	};

	return {
		name: "@shikijs/transformers:remove-notation-escape",

		// eslint-disable-next-line perfectionist/sort-objects
		code: (hast) => {
			replace(hast);
			return hast;
		},
	};
};

export default defineConfig({
	plugins: [lastModified()],
});
