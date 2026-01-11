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

const defaultKeywords = [
	"fetch",
	"type-safe",
	"interceptors",
	"callapi",
	"dedupe",
	"hooks",
	"zayne callapi",
	"typescript fetch",
	"fetch wrapper",
	"http client",
	"api client",
	"fetch alternative",
	"typescript http",
	"request library",
	"fetch api wrapper",
	"type safe fetch",
	"javascript fetch",
	"typescript api client",
	"http request library",
	"fetch interceptors",
	"request deduplication",
	"fetch hooks",
	"api wrapper",
	"fetch utility",
	"typescript request",
	"fetch helper",
	"http wrapper",
	"fetch library",
	"request client",
	"fetch typescript",
	"api request",
	"fetch plugin",
	"request hooks",
	"fetch middleware",
	"http api client",
	"fetch validation",
	"request retry",
	"fetch timeout",
	"api fetch",
	"fetch error handling",
	"request response",
	"fetch schema",
	"typescript fetch client",
	"fetch request library",
	"http fetch wrapper",
	"fetch api client",
	"request fetch library",
	"fetch response handling",
];

export const defaultDescription =
	"A lightweight, type-safe Fetch API wrapper with dozens of convenience features.";

export function createMetadata(overrides?: Metadata): Metadata {
	return {
		...overrides,

		alternates: {
			canonical: overrides?.alternates?.canonical ?? baseURL,
			...overrides?.alternates,
		},

		description: overrides?.description ?? defaultDescription,

		keywords: overrides?.keywords ?? defaultKeywords,

		openGraph: {
			description: overrides?.description ?? defaultDescription,
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
			description: overrides?.description ?? defaultDescription,
			images: bannerImage,
			title: overrides?.title ?? undefined,

			...overrides?.twitter,
		},
	};
}
