import Link from "fumadocs-core/link";
import * as Twoslash from "fumadocs-twoslash/ui";
import * as Tabs from "fumadocs-ui/components/tabs";
import * as TypeTable from "fumadocs-ui/components/type-table";
import defaultComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

export const getMDXComponents = (extraComponents?: MDXComponents) => {
	return {
		...defaultComponents,
		...Twoslash,
		...Tabs,
		...TypeTable,
		Link,
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
