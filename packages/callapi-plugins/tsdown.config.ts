import { defineConfig, type UserConfig } from "tsdown";

const isDevMode = process.env.NODE_ENV === "development";

const commonOptions = {
	clean: true, // clean up dist folder,
	dts: true,
	entry: ["src/index.ts", "src/plugins/*/index.ts"],
	ignoreWatch: [".turbo"],
	platform: "neutral",
	sourcemap: !isDevMode,
	target: "esnext",
	treeshake: true,
	tsconfig: "tsconfig.json",
} satisfies UserConfig;

export default defineConfig([
	{
		...commonOptions,
		format: ["esm"],
		// outDir: "./dist/esm",
	},
]);
