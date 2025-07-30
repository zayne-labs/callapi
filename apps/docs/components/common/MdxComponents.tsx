import Link from "fumadocs-core/link";
import * as Twoslash from "fumadocs-twoslash/ui";
import * as Tabs from "fumadocs-ui/components/tabs";
import * as TypeTable from "fumadocs-ui/components/type-table";
import defaultComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

export const getMDXComponents = (extraComponents?: MDXComponents): MDXComponents => {
	return {
		...defaultComponents,
		...Twoslash,
		...Tabs,
		...TypeTable,
		Link,
		...extraComponents,
	};
};
