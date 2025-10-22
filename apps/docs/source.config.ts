import { defaultTwoslashOptions } from "@shikijs/twoslash";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { transformerTwoslash } from "fumadocs-twoslash";
import { createFileSystemTypesCache } from "fumadocs-twoslash/cache-fs";
import { remarkAutoTypeTable } from "fumadocs-typescript";
import type { ElementContent } from "hast";

export const docs = defineDocs({
	dir: "content/docs",
	docs: {
		postprocess: { includeProcessedMarkdown: true },
	},
});

const defaultTwoSlashOptionsObject = defaultTwoslashOptions();

export default defineConfig({
	lastModifiedTime: "git",
	mdxOptions: {
		rehypeCodeOptions: {
			inline: "tailing-curly-colon",
			langs: ["ts", "js", "html", "tsx", "mdx", "bash"],
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

				{
					code: (hast) => {
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

						replace(hast);
						return hast;
					},
					name: "@shikijs/transformers:remove-notation-escape",
				},
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

		remarkPlugins: [remarkAutoTypeTable],
	},
});
