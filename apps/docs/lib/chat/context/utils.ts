import fs from "node:fs/promises";
import path from "node:path";
import { findUp } from "find-up-simple";
import { CALLAPI_PACKAGE, callGithubApi, callGithubRaw } from "./github-api";

const SOURCE_FILE_EXTENSIONS = [".ts"];

export type SourceFile = {
	content: string;
	path: string;
};

// == Paths are relative to the package's `src` folder, with `/` separators
const isSourceFile = (filePath: string) =>
	SOURCE_FILE_EXTENSIONS.some((ext) => filePath.endsWith(ext))
	&& !filePath.includes(".test.")
	&& !filePath.includes(".spec.");

// === Local source ===

const resolveMonorepoRoot = async (): Promise<string> => {
	const manifest = await findUp("pnpm-workspace.yaml");

	if (!manifest) {
		throw new Error("Could not locate monorepo root — is pnpm-workspace.yaml missing?");
	}

	return path.dirname(manifest);
};

export const getLocalSourceFiles = async (): Promise<SourceFile[]> => {
	const rootDir = await resolveMonorepoRoot();
	const libraryPath = path.join(rootDir, CALLAPI_PACKAGE);
	const srcPath = path.join(libraryPath, "src");

	const [packageJson, allPaths] = await Promise.all([
		fs.readFile(path.join(libraryPath, "package.json"), "utf8"),
		fs.readdir(srcPath, { recursive: true }),
	]);

	const targetFiles = allPaths
		.map((filePath) => filePath.replaceAll("\\", "/"))
		.filter((filePath) => isSourceFile(filePath));

	const sourceFiles = await Promise.all(
		targetFiles.map(async (filePath) => ({
			content: await fs.readFile(path.join(srcPath, filePath), "utf8"),
			path: `${CALLAPI_PACKAGE}/src/${filePath}`,
		}))
	);

	return [{ content: packageJson, path: `${CALLAPI_PACKAGE}/package.json` }, ...sourceFiles];
};

// === Remote source ===

export const getRemoteSourceFiles = async (): Promise<SourceFile[]> => {
	const srcPrefix = `${CALLAPI_PACKAGE}/src/`;

	const [treeData, packageJson] = await Promise.all([
		callGithubApi("/git/trees/:ref", { params: { ref: "main" }, query: { recursive: true } }),
		callGithubRaw("/package.json"),
	]);

	const targetFiles = treeData.tree
		.filter((item) => item.type === "blob" && item.path.startsWith(srcPrefix))
		.map((item) => item.path.slice(srcPrefix.length))
		.filter((filePath) => isSourceFile(filePath));

	const sourceFiles = await Promise.all(
		targetFiles.map(async (filePath) => ({
			content: await callGithubRaw(`/src/${filePath}`),
			path: `${srcPrefix}${filePath}`,
		}))
	);

	return [{ content: packageJson, path: `${CALLAPI_PACKAGE}/package.json` }, ...sourceFiles];
};
