import { loader, type InferPageType, type LoaderPlugin } from "fumadocs-core/source";
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
						name: createElement("code", { children: node.name, className: "text-[13px]" }),
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

export const getLLMText = async (page: Page) => {
	const processed = await page.data.getText("processed");

	return `
# Title: ${page.data.title}
Description: ${page.data.description}
URL: ${page.url}
Source: https://raw.githubusercontent.com/zayne-labs/callapi/refs/heads/main/apps/docs/content/docs/${page.path}

${processed}
`;
};

export function getPageImage(page: Page) {
	const segments = [...page.slugs, "image.webp"];

	return {
		segments,
		url: `/og/docs/${segments.join("/")}`,
	};
}
