import type { MetadataRoute } from "next";
import { baseURL } from "@/lib/metadata";
import { source } from "@/lib/source";

export const revalidate = false;

const url = (path: string): string => new URL(path, baseURL).toString();

const sitemap = (): MetadataRoute.Sitemap => {
	const pages = source.getPages();

	const docsSiteMap = pages.map((page) => {
		return {
			changeFrequency: "weekly",
			lastModified: page.data.lastModified,
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
