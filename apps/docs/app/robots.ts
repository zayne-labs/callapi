import type { MetadataRoute } from "next";
import { baseURL } from "@/lib/metadata";

const robots = (): MetadataRoute.Robots => {
	return {
		host: baseURL,
		rules: {
			allow: "/",
			userAgent: "*",
		},
		sitemap: `${baseURL}/sitemap.xml`,
	};
};

export default robots;
