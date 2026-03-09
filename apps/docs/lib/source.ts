import { loader, type InferPageType } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { docs } from "@/.source/server";

export const source = loader({
	baseUrl: "/docs",
	plugins: [lucideIconsPlugin()],
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
