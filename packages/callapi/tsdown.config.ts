import { defineConfig, type Options } from "tsdown";

const isDevMode = process.env.NODE_ENV === "development";

const commonOptions = {
	clean: true,
	dts: { newContext: true },
	entry: ["src/index.ts", "src/utils/index.ts"],
	platform: "neutral",
	sourcemap: !isDevMode,
	target: "esnext",
	treeshake: true,
	tsconfig: "tsconfig.json",
} satisfies Options;

export default defineConfig([
	{
		...commonOptions,
		format: ["esm"],
		outDir: "./dist/esm",
	},
]);
