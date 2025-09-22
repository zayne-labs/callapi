import createBundleAnalyzer from "@next/bundle-analyzer";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const withAnalyzer = createBundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
});

const withMDX = createMDX();

const getRoot = (rootPath = "/") => fileURLToPath(new URL(rootPath, import.meta.url));

const config = {
	devIndicators: {
		position: "bottom-right",
	},

	eslint: {
		ignoreDuringBuilds: true,
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

	serverExternalPackages: ["typescript", "twoslash", "shiki"],

	turbopack: {
		root: getRoot(),
	},

	typescript: {
		ignoreBuildErrors: true,
	},
} satisfies NextConfig;

export default withAnalyzer(withMDX(config));
