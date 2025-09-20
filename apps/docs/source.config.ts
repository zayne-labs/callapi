import { defaultTwoslashOptions } from "@shikijs/twoslash";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { remarkInstall } from "fumadocs-docgen";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { transformerTwoslash } from "fumadocs-twoslash";
import { createFileSystemTypesCache } from "fumadocs-twoslash/cache-fs";
import { createGenerator, remarkAutoTypeTable } from "fumadocs-typescript";

export const { docs, meta } = defineDocs({
	dir: "content/docs",
	docs: {
		postprocess: { includeProcessedMarkdown: true },
	},
});

const generator = createGenerator();

const defaultTwoSlashOptionsObject = defaultTwoslashOptions();

export default defineConfig({
	mdxOptions: {
		rehypeCodeOptions: {
			experimentalJSEngine: true,
			inline: "tailing-curly-colon",
			langs: ["js", "bash"],
			lazy: true,
			themes: {
				dark: "material-theme-darker",
				light: "material-theme-lighter",
			},

			transformers: [
				...(rehypeCodeDefaultOptions.transformers ?? []),

				transformerTwoslash({
					twoslashOptions: {
						// == Adding default twoslash options from shiki cuz it contains the support for custom annotation tags like `@annotate`.
						...defaultTwoSlashOptionsObject,
						compilerOptions: {
							...defaultTwoSlashOptionsObject.compilerOptions,
							noErrorTruncation: true,
						},
					},
					typesCache: createFileSystemTypesCache(),
				}),
			],
		},

		remarkPlugins: [
			[remarkInstall, { persist: { id: "persist-install" } }],
			[remarkAutoTypeTable, { generator }],
		],
	},
});
