import { source } from "@/lib/source";

export const revalidate = false;

export function GET() {
	const scanned = ["# Docs"];

	const pageMap = new Map<string, string[]>();

	for (const page of source.getPages()) {
		const category = page.slugs[0];

		if (category === undefined) continue;

		const categoryList = pageMap.get(category) ?? [];

		categoryList.push(`- [${page.data.title}](${page.url}): ${page.data.description}`);

		pageMap.set(category, categoryList);
	}

	for (const [key, value] of pageMap) {
		scanned.push(`## ${key}`, value.join("\n"));
	}

	return new Response(scanned.join("\n\n"));
}
