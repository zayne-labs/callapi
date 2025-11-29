import { defineConfig, type Options } from "tsdown";

const isDevMode = process.env.NODE_ENV === "development";

const commonOptions = {
	clean: true, // clean up dist folder,
	dts: { newContext: true },
	entry: ["src/index.ts", "src/plugins/*/index.ts"],
	ignoreWatch: [".turbo"],
	platform: "browser",
	sourcemap: !isDevMode,
	target: "esnext",
	treeshake: true,
	tsconfig: "tsconfig.json",
} satisfies Options;

export default defineConfig([
	{
		...commonOptions,
		format: ["es"],
		// outDir: "./dist/esm",
	},
]);
