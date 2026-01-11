import { fileURLToPath } from "node:url";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const getRoot = (rootPath = "/") => fileURLToPath(new URL(rootPath, import.meta.url));

const isDevMode = process.env.NODE_ENV !== "production";

const config: NextConfig = {
	devIndicators: {
		position: "bottom-left",
	},

	logging: {
		fetches: {
			fullUrl: true,
		},
	},

	reactStrictMode: true,

	rewrites: () => {
		return [
			{
				destination: "/llms.mdx/:path*",
				source: "/docs/:path*.mdx",
			},
		];
	},

	serverExternalPackages: ["typescript", "twoslash", "shiki"],

	...(isDevMode && {
		outputFileTracingRoot: getRoot(),
	}),

	typescript: {
		ignoreBuildErrors: true,
	},
};

export default withMDX(config);
