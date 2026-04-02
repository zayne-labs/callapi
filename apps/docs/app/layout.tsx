import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StructuredData } from "@/components/seo/structured-data";
import { baseURL, createMetadata, defaultSiteName } from "@/lib/metadata";
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
			data-scroll-behavior="smooth"
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
	metadataBase: new URL(baseURL),
	title: {
		default: defaultSiteName,
		template: `%s | ${defaultSiteName}`,
	},
});

export const viewport: Viewport = {
	colorScheme: "dark light",
	themeColor: [
		{ color: "#0A0A0A", media: "(prefers-color-scheme: dark)" },
		{ color: "#ffffff", media: "(prefers-color-scheme: light)" },
	],
};
