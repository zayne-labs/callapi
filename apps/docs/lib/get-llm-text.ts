import type { Page } from "@/lib/source";

export const getLLMText = async (page: Page) => {
	const category = "CallApi";

	const processed = await page.data.getText("processed");

	return `
	# ${category}: ${page.data.title}
	URL: ${page.url}
	Source: https://raw.githubusercontent.com/zayne-labs/callapi/refs/heads/main/apps/docs/content/docs/${page.path}

	${page.data.description}

	${processed}
`;
};
