import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StructuredData } from "@/components/seo/structured-data";
import { baseURL, createMetadata } from "@/lib/metadata";
import { cnJoin } from "@/lib/utils/cn";
import { Providers } from "./Providers";
import "../tailwind.css";

const geistSans = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-geist-mono",
});

function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="en"
			className={cnJoin(geistSans.variable, geistMono.variable)}
			suppressHydrationWarning={true}
		>
			<head>
				<meta name="google-site-verification" content="rmU6PC2zhbh7_EYy2zvXm9NMmsxfpQvCcdzEKlryYKs" />
				<StructuredData variant="website" />
				<StructuredData variant="organization" />
			</head>
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}

export default RootLayout;

export const metadata: Metadata = createMetadata({
	description: "A lightweight, type-safe Fetch API wrapper with dozens of convenience features.",
	keywords: [
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
	],
	metadataBase: new URL(baseURL),
	title: {
		default: "CallApi",
		template: "%s | CallApi",
	},
});

export const viewport: Viewport = {
	themeColor: [
		{ color: "#0A0A0A", media: "(prefers-color-scheme: dark)" },
		{ color: "#ffffff", media: "(prefers-color-scheme: light)" },
	],
};
