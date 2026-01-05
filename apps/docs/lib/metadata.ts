import type { Metadata } from "next";

const VERCEL_PROJECT_PRODUCTION_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const NETLIFY_PRODUCTION_URL = process.env.URL;

const withHttps = (url: string | undefined) => {
	if (!url) {
		return;
	}

	if (!url.startsWith("https")) {
		return `https://${url}`;
	}

	return url;
};

const SELECTED_PRODUCTION_URL = withHttps(VERCEL_PROJECT_PRODUCTION_URL ?? NETLIFY_PRODUCTION_URL);

export const baseURL =
	process.env.NODE_ENV === "development" || !SELECTED_PRODUCTION_URL ?
		"http://localhost:3000"
	:	SELECTED_PRODUCTION_URL;

const bannerImage = "/banner.png";

export function createMetadata(overrides?: Metadata): Metadata {
	return {
		...overrides,

		alternates: {
			canonical: overrides?.alternates?.canonical ?? baseURL,
			...overrides?.alternates,
		},

		openGraph: {
			description: overrides?.description ?? undefined,
			images: bannerImage,
			siteName: "CallApi",
			title: overrides?.title ?? undefined,
			type: "website",
			url: baseURL,

			...overrides?.openGraph,
		},
		twitter: {
			card: "summary_large_image",
			creator: "@zayne_el_kaiser",
			description: overrides?.description ?? undefined,
			images: bannerImage,
			title: overrides?.title ?? undefined,

			...overrides?.twitter,
		},
	};
}
