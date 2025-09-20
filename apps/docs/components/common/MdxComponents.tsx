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

// declare module "mdx/types.js" {
// 	// eslint-disable-next-line ts-eslint/no-namespace
// 	namespace JSX {
// 		type Element = React.JSX.Element;
// 		type ElementClass = React.JSX.ElementClass;
// 		type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
// 		type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
// 		type IntrinsicElements = React.JSX.IntrinsicElements;
// 	}
// }

declare global {
	type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
