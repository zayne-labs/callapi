import { baseURL } from "@/lib/metadata";
import { source } from "@/lib/source";
import type { MetadataRoute } from "next";

export const revalidate = false;

const url = (path: string): string => new URL(path, baseURL).toString();

const sitemap = (): MetadataRoute.Sitemap => {
	const docsSiteMap = source.getPages().map((page) => {
		const lastModified =
			page.data.lastModified ? new Date(page.data.lastModified).toISOString() : undefined;

		return {
			changeFrequency: "weekly",
			lastModified,
			priority: 0.5,
			url: url(page.url),
		} satisfies MetadataRoute.Sitemap[number];
	});

	return [
		{
			changeFrequency: "monthly",
			priority: 1,
			url: url("/"),
		},
		{
			changeFrequency: "monthly",
			priority: 0.8,
			url: url("/docs"),
		},

		...docsSiteMap,
	];
};

export default sitemap;
