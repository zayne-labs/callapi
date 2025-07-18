import { source } from "@/lib/source";

export const revalidate = false;

export function GET() {
	const scanned: string[] = ["# Docs"];

	const map = new Map<string, string[]>();

	for (const page of source.getPages()) {
		const dir = page.slugs[0];

		if (dir === undefined) continue;

		const list = map.get(dir) ?? [];

		list.push(`- [${page.data.title}](${page.url}): ${page.data.description}`);

		map.set(dir, list);
	}

	for (const [key, value] of map) {
		scanned.push(`## ${key}`, value.join("\n"));
	}

	return new Response(scanned.join("\n\n"));
}
