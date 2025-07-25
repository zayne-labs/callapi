import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const config = {
	devIndicators: {
		position: "bottom-right",
	},

	experimental: {
		devtoolNewPanelUI: true,
		devtoolSegmentExplorer: true,
	},

	eslint: {
		ignoreDuringBuilds: true,
	},
	reactStrictMode: true,
	async rewrites() {
		return [
			{
				destination: "/llms.mdx/:path*",
				source: "/docs/:path*.mdx",
			},
		];
	},
	serverExternalPackages: ["twoslash", "typescript", "shiki"],
} satisfies NextConfig;

export default withMDX(config);
