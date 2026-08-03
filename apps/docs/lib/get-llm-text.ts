import type { Page } from "./source";

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
