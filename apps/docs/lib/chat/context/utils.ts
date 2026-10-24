import fs from "node:fs/promises";
import path from "node:path";
import { findUp } from "find-up-simple";
import { callGithubApi, GitHubTreeResponseSchema } from "./github-api";

const CALLAPI_PACKAGE = "packages/callapi";
const PRIORITY_FILES = new Set(["index.ts", "createFetchClient.ts"]);

export type SourceFile = {
	content: string;
	path: string;
};

export const assembleContext = (title: string, intro: string, contents: string[]) => {
	return [`=== ${title} ===`, intro, ...contents].filter(Boolean).join("\n\n");
};

const filterAndSortFiles = (files: string[]) => {
	return (
		files
			.filter((f) => f.endsWith(".ts") && !f.includes(".test.") && !f.includes(".spec."))
			// eslint-disable-next-line unicorn/no-array-sort
			.sort((a, b) => {
				const aIsPriority = PRIORITY_FILES.has(path.basename(a));
				const bIsPriority = PRIORITY_FILES.has(path.basename(b));

				if (aIsPriority && !bIsPriority) {
					return -1;
				}

				if (!aIsPriority && bIsPriority) {
					return 1;
				}

				return a.localeCompare(b);
			})
	);
};

// === Local source ===

const getFilesRecursive = async (dir: string): Promise<string[]> => {
	const entries = await fs.readdir(dir, { withFileTypes: true });

	const files = await Promise.all(
		entries.map(async (entry) => {
			const fullPath = path.resolve(dir, entry.name);

			return entry.isDirectory() ? getFilesRecursive(fullPath) : fullPath;
		})
	);

	return files.flat();
};

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

	const [packageJson, allFiles] = await Promise.all([
		fs.readFile(path.join(libraryPath, "package.json"), "utf8"),
		getFilesRecursive(srcPath),
	]);

	const relativePaths = allFiles.map((f) => path.relative(srcPath, f).replaceAll("\\", "/"));

	const targetFiles = filterAndSortFiles(relativePaths);

	const sourceFiles = await Promise.all(
		targetFiles.map(async (relPath) => ({
			content: await fs.readFile(path.join(srcPath, relPath), "utf8"),
			path: `${CALLAPI_PACKAGE}/src/${relPath}`,
		}))
	);

	return [{ content: packageJson, path: `${CALLAPI_PACKAGE}/package.json` }, ...sourceFiles];
};

// === Remote source ===

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/zayne-labs/callapi/main";
const GITHUB_API_BASE = "https://api.github.com/repos/zayne-labs/callapi";

export const getRemoteSourceFiles = async (): Promise<SourceFile[]> => {
	const [contents, packageJson] = await Promise.all([
		callGithubApi(`${GITHUB_API_BASE}/contents/${CALLAPI_PACKAGE}`),
		callGithubApi(`${GITHUB_RAW_BASE}/${CALLAPI_PACKAGE}/package.json`, {
			responseType: "text",
		}),
	]);

	const srcDir = contents.find((item) => item.type === "dir" && item.name === "src");

	if (!srcDir) {
		throw new Error("Source directory not found in repository");
	}

	const treeData = await callGithubApi(srcDir.git_url, {
		query: { recursive: true },
		schema: { data: GitHubTreeResponseSchema },
	});

	const targetFiles = filterAndSortFiles(treeData.tree.map((item) => item.path));

	const sourceFiles = await Promise.all(
		targetFiles.map((filePath) =>
			callGithubApi(`${GITHUB_RAW_BASE}/${CALLAPI_PACKAGE}/src/:filePath`, {
				params: { filePath },
				responseType: "text",
			}).then((content) => ({
				content,
				path: `${CALLAPI_PACKAGE}/src/${filePath}`,
			}))
		)
	);

	return [{ content: packageJson, path: `${CALLAPI_PACKAGE}/package.json` }, ...sourceFiles];
};
