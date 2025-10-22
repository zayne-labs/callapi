import { fileURLToPath } from "node:url";
import createBundleAnalyzer from "@next/bundle-analyzer";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withAnalyzer = createBundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
});

const withMDX = createMDX();

const getRoot = (rootPath = "/") => fileURLToPath(new URL(rootPath, import.meta.url));

const isDevMode = process.env.NODE_ENV !== "production";

const config: NextConfig = {
	devIndicators: {
		position: "bottom-right",
	},

	reactStrictMode: true,

	// eslint-disable-next-line ts-eslint/require-await
	async rewrites() {
		return [
			{
				destination: "/llms.mdx/:path*",
				source: "/docs/:path*.mdx",
			},
		];
	},

	...(isDevMode && {
		outputFileTracingRoot: getRoot(),
	}),

	typescript: {
		ignoreBuildErrors: true,
	},
};

export default withAnalyzer(withMDX(config));
