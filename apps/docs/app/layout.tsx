import { baseURL, createMetadata } from "@/lib/metadata";
import { cnJoin } from "@/lib/utils/cn";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../tailwind.css";
import { Providers } from "./Providers";

const geistSans = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-geist-mono",
});

export const metadata: Metadata = createMetadata({
	description: "A lightweight, type-safe Fetch API wrapper with dozens of convenience features.",
	keywords: ["fetch", "type-safe", "interceptors", "callapi", "dedupe", "hooks", "zayne callapi"],
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

function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="en"
			className={cnJoin(geistSans.variable, geistMono.variable)}
			suppressHydrationWarning={true}
		>
			<head>
				<link rel="icon" href="/favicon/favicon.ico" sizes="any" />
				<meta name="google-site-verification" content="LH-8qDRpnWdy6YKOKmi18ZQ4gW9EgoeDkarkyQc8Tl8" />
			</head>
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}

export default RootLayout;
