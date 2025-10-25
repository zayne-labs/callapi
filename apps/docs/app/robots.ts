import { baseURL } from "@/lib/metadata";
import type { MetadataRoute } from "next";

const robots = (): MetadataRoute.Robots => {
	return {
		host: baseURL.toString(),
		rules: {
			allow: "/",
			userAgent: "*",
		},
		sitemap: ` ${baseURL}/sitemap.xml`,
	};
};

export default robots;
