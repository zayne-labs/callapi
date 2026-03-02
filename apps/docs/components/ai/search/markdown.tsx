import { tw } from "@zayne-labs/toolkit-core";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { ElementContent, Root, RootContent } from "hast";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import {
	Children,
	Suspense,
	use,
	useDeferredValue,
	type ComponentProps,
	type ReactElement,
	type ReactNode,
} from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import { visit } from "unist-util-visit";

export type Processor = {
	process: (content: string) => Promise<ReactNode>;
};

function rehypeWrapWords() {
	// eslint-disable-next-line unicorn/consistent-function-scoping
	return (tree: Root) => {
		visit(tree, ["text", "element"], (node, index, parent) => {
			if (node.type === "element" && node.tagName === "pre") {
				return "skip";
			}

			if (node.type !== "text" || !parent || index === undefined) return;

			const words = node.value.split(/(?=\s)/);

			// == Create new span nodes for each word and whitespace
			const newNodes: ElementContent[] = words.flatMap((word) => {
				if (word.length === 0) {
					return [];
				}

				return {
					children: [{ type: "text", value: word }],
					properties: {
						class: tw`animate-fd-fade-in`,
					},
					tagName: "span",
					type: "element",
				};
			});

			Object.assign(node, {
				children: newNodes,
				properties: {},
				tagName: "span",
				type: "element",
			} satisfies RootContent);

			return "skip";
		});
	};
}

function createProcessor(): Processor {
	const processor = remark().use(remarkGfm).use(remarkRehype).use(rehypeWrapWords);

	return {
		async process(content) {
			const nodes = processor.parse({ value: content });
			const hast = await processor.run(nodes);

			return toJsxRuntime(hast, {
				components: {
					...defaultMdxComponents,
					img: undefined, // use JSX
					pre: Pre,
				},
				development: false,
				Fragment,
				jsx,
				jsxs,
			}) as React.JSX.Element;
		},
	};
}

function Pre(props: ComponentProps<"pre">) {
	const { children } = props;

	const code = Children.only(children) as ReactElement;
	const codeProps = code.props as ComponentProps<"code">;
	const content = codeProps.children;

	if (typeof content !== "string") {
		return null;
	}

	let lang =
		codeProps.className
			?.split(" ")
			.find((v) => v.startsWith("language-"))
			?.slice("language-".length) ?? "text";

	if (lang === "mdx") {
		lang = "md";
	}

	return <DynamicCodeBlock lang={lang} code={content.trimEnd()} />;
}

const processor = createProcessor();

export function Markdown(props: { text: string }) {
	const { text } = props;

	const deferredText = useDeferredValue(text);

	return (
		<Suspense fallback={<p className="invisible">{text}</p>}>
			<Renderer text={deferredText} />
		</Suspense>
	);
}

const cache = new Map<string, Promise<ReactNode>>();

function Renderer(props: { text: string }) {
	const { text } = props;

	const result = cache.get(text) ?? processor.process(text);
	cache.set(text, result);

	return use(result);
}
