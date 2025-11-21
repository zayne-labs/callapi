import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";
import type { ElementContent } from "hast";
import type { ShikiTransformer } from "shiki";

export const docs = defineDocs({
	dir: "content/docs",
	docs: {
		postprocess: { includeProcessedMarkdown: true },
	},
});

const transformerEscape = () => {
	return {
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
	} satisfies ShikiTransformer;
};

export default defineConfig({
	mdxOptions: async () => {
		const [
			{ defaultTwoslashOptions },
			{ rehypeCodeDefaultOptions },
			{ transformerTwoslash },
			{ createGenerator, remarkAutoTypeTable },
			{ createFileSystemTypesCache },
		] = await Promise.all([
			import("@shikijs/twoslash"),
			import("fumadocs-core/mdx-plugins/rehype-code"),
			import("fumadocs-twoslash"),
			import("fumadocs-typescript"),
			import("fumadocs-twoslash/cache-fs"),
		]);

		const generator = createGenerator();

		const defaultTwoSlashOptionsObject = defaultTwoslashOptions();

		return {
			rehypeCodeOptions: {
				inline: "tailing-curly-colon",
				langs: ["ts", "js", "html", "tsx", "mdx", "bash"],
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

			remarkPlugins: [[remarkAutoTypeTable, { generator }]],
		};
	},

	plugins: [lastModified()],
});
