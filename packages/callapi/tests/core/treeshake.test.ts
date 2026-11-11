import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { expect, test } from "vitest";

const utilsEntryPath = fileURLToPath(new URL("../../src/utils/external/index.ts", import.meta.url));

// == Step 1: bundle the entry into one file, like the published `dist` output.
// == (Bundling the source files directly would hide the problem, since unused files get dropped whole.)
const buildPackageFile = async (entryPath: string) => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "callapi-treeshake-"));
	const outFile = path.join(tempDir, "index.js");

	await build({
		bundle: true,
		entryPoints: [entryPath],
		format: "esm",
		outfile: outFile,
		packages: "external",
	});

	await fs.writeFile(path.join(tempDir, "package.json"), JSON.stringify({ sideEffects: false }));

	return outFile;
};

// == Step 2: bundle a single named import from that file, the way a consumer's bundler would
const bundleImport = async (packageFile: string, importNames: string) => {
	const result = await build({
		bundle: true,
		format: "esm",
		logLevel: "silent",
		minify: true,
		stdin: {
			contents: `export { ${importNames} } from ${JSON.stringify(packageFile)};`,
			resolveDir: path.dirname(packageFile),
		},
		write: false,
	});

	return result.outputFiles[0]?.text ?? "";
};

// == esbuild keeps any code that runs when a module loads (e.g. `export const x = fn()`), along with
// == everything it uses. This fails if a load-time call that pulls in the rest of the package gets added.
test("tree-shaking - importing one small util doesn't pull in the rest of the package", async () => {
	const packageFile = await buildPackageFile(utilsEntryPath);

	const code = await bundleImport(packageFile, "isHTTPError");

	expect(code.length).toBeLessThan(300);
	// == Runs two esbuild builds, which can be slow when other tasks run alongside (e.g. in the pre-commit hook)
}, 30_000);
