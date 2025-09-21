import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

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

	serverExternalPackages: ["typescript", "twoslash"],

	typescript: {
		ignoreBuildErrors: true,
	},
} satisfies NextConfig;

export default withMDX(config);
