import defaultComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

export const getMDXComponents = (extraComponents?: MDXComponents) => {
	return {
		...defaultComponents,
		...extraComponents,
	};
};

declare module "mdx/types.js" {
	// Augment the MDX types to make it understand React.
	// eslint-disable-next-line ts-eslint/no-namespace
	namespace JSX {
		type Element = React.JSX.Element;
		type ElementClass = React.JSX.ElementClass;
		type ElementType = React.JSX.ElementType;
		type IntrinsicElements = React.JSX.IntrinsicElements;
	}
}

declare global {
	type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
