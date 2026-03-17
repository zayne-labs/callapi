import defaultComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

export const getMDXComponents = (extraComponents?: MDXComponents) => {
	return {
		...defaultComponents,
		...extraComponents,
	};
};

declare global {
	type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
