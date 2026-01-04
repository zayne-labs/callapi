import { loader, type InferMetaType, type InferPageType, type LoaderPlugin } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { createElement } from "react";
import { docs } from "@/.source/server";

const pageTreeCodeTitles = () => {
	return {
		transformPageTree: {
			file: (node) => {
				if (
					typeof node.name === "string"
					&& (node.name.endsWith("()") || /^<\w+ \/>$/.test(node.name))
				) {
					return {
						...node,
						name: createElement("code", { children: node.name, className: "text-[0.8125rem]" }),
					};
				}

				return node;
			},
		},
	} satisfies LoaderPlugin;
};

export const source = loader({
	baseUrl: "/docs",
	plugins: [pageTreeCodeTitles(), lucideIconsPlugin()],
	source: docs.toFumadocsSource(),
});

export type Page = InferPageType<typeof source>;
export type Meta = InferMetaType<typeof source>;

export function getPageImage(page: InferPageType<typeof source>) {
	const segments = [...page.slugs, "image.png"];

	return {
		segments,
		url: `/og/docs/${segments.join("/")}`,
	};
}
