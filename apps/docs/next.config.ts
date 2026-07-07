import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const config: NextConfig = {
	devIndicators: {
		position: "bottom-left",
	},

	experimental: {
		typedEnv: true,
	},

	logging: {
		fetches: {
			fullUrl: true,
		},
	},

	// rewrites: () => {
	// 	return [
	// 		{
	// 			destination: "/llms.mdx/docs/:path*",
	// 			source: "/docs/:path*.mdx",
	// 		},
	// 	];
	// },

	reactStrictMode: true,

	serverExternalPackages: ["typescript", "twoslash", "shiki", "@takumi-rs/image-response"],

	typedRoutes: true,

	typescript: {
		ignoreBuildErrors: true,
	},
};

export default withMDX(config);
