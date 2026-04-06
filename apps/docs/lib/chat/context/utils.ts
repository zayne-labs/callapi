import fs from "node:fs/promises";
import path from "node:path";
import { findUp } from "find-up-simple";
import { callGithubApi, GitHubTreeResponseSchema } from "./github-api";

const CALLAPI_PACKAGE = "packages/callapi";
const PRIORITY_FILES = new Set(["index.ts", "createFetchClient.ts"]);

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

const formatFileContext = (relPath: string, content: string) => {
	const normalizedPath = relPath.startsWith("packages/") ? relPath : `${CALLAPI_PACKAGE}/src/${relPath}`;

	return `--- FILE: ${normalizedPath} ---\n${content}\n--- END FILE ---`;
};

export const assembleContext = (title: string, intro: string, contents: string[]) => {
	return [`=== ${title} ===`, intro, ...contents].filter(Boolean).join("\n\n");
};

const assembleSourceContext = (packageJson: string, fileContents: string[]) => {
	return assembleContext(
		"CALLAPI SOURCE CODE CONTEXT",
		"The following is the authoritative source code for the CallApi library. Use this for deep implementation details and TypeScript definitions.",
		[formatFileContext(`${CALLAPI_PACKAGE}/package.json`, packageJson), ...fileContents]
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

export const getLocalSourceContext = async (): Promise<string> => {
	const rootDir = await resolveMonorepoRoot();
	const libraryPath = path.join(rootDir, CALLAPI_PACKAGE);
	const srcPath = path.join(libraryPath, "src");

	const [packageJson, allFiles] = await Promise.all([
		fs.readFile(path.join(libraryPath, "package.json"), "utf8"),
		getFilesRecursive(srcPath),
	]);

	const relativePaths = allFiles.map((f) => path.relative(srcPath, f).replaceAll("\\", "/"));

	const targetFiles = filterAndSortFiles(relativePaths);

	const fileContents = await Promise.all(
		targetFiles.map((relPath) =>
			fs
				.readFile(path.join(srcPath, relPath), "utf8")
				.then((content) => formatFileContext(relPath, content))
		)
	);

	return assembleSourceContext(packageJson, fileContents);
};

// === Remote source ===

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/zayne-labs/callapi/main";
const GITHUB_API_BASE = "https://api.github.com/repos/zayne-labs/callapi";

export const getRemoteSourceContext = async (): Promise<string> => {
	const [contents, packageJson] = await Promise.all([
		callGithubApi(`${GITHUB_API_BASE}/contents/${CALLAPI_PACKAGE}`),
		callGithubApi(`${GITHUB_RAW_BASE}/${CALLAPI_PACKAGE}/package.json`, {
			responseType: "text",
		}).catch(() => "Failed to fetch package.json"),
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

	const results = await Promise.allSettled(
		targetFiles.map((filePath) =>
			callGithubApi(`${GITHUB_RAW_BASE}/${CALLAPI_PACKAGE}/src/:filePath`, {
				params: { filePath },
				responseType: "text",
			}).then((content) => formatFileContext(filePath, content))
		)
	);

	const fileContents = results
		.filter((res): res is PromiseFulfilledResult<string> => res.status === "fulfilled")
		.map((res) => res.value);

	return assembleSourceContext(packageJson, fileContents);
};
