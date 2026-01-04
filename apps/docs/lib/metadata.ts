import type { Metadata } from "next";

export const baseURL =
	(
		process.env.NODE_ENV === "development"
		|| !(process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.URL)
	) ?
		"http://localhost:3000"
	:	(process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.URL);

const banner = "/banner.png";

export function createMetadata(overrides?: Metadata): Metadata {
	return {
		...overrides,

		alternates: {
			canonical: overrides?.alternates?.canonical ?? baseURL,
			...overrides?.alternates,
		},

		openGraph: {
			description: overrides?.description ?? undefined,
			images: banner,
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
			images: banner,
			title: overrides?.title ?? undefined,

			...overrides?.twitter,
		},
	};
}
