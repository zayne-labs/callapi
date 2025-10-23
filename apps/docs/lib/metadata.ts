import type { Metadata } from "next";

export const baseURL =
	process.env.NODE_ENV === "development" || !process.env.URL ?
		new URL("http://localhost:3000")
	:	new URL(process.env.URL);

const banner = "/banner.png";

export function createMetadata(overrides?: Metadata): Metadata {
	return {
		...overrides,

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
