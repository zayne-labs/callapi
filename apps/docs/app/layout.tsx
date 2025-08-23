/* eslint-disable react-refresh/only-export-components */

import { Geist, Geist_Mono } from "next/font/google";
import { baseURL, createMetadata } from "@/lib/metadata";
import { cnJoin } from "@/lib/utils/cn";
import { Providers } from "./Providers";
import "../tailwind.css";
import type { Metadata } from "next";

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
	keywords: ["fetch", "type-safe", "interceptors", "callapi", "dedupe"],
	metadataBase: new URL(baseURL),
	title: {
		default: "CallApi",
		template: "%s | CallApi",
	},
});

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
