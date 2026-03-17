import fs from "node:fs/promises";
import path from "node:path";
import { callGithubApi, GitHubTreeResponseSchema } from "./github-api";

const PRIORITY_FILES = new Set(["index.ts", "createFetchClient.ts"]);

const filterAndSortFiles = (files: string[]) => {
	return files
		.filter((f) => f.endsWith(".ts") && !f.includes(".test.") && !f.includes(".spec."))
		.toSorted((a, b) => {
			const aBase = path.basename(a);
			const bBase = path.basename(b);

			const isAPriority = PRIORITY_FILES.has(aBase);
			const isBPriority = PRIORITY_FILES.has(bBase);

			if (isAPriority && !isBPriority) {
				return -1;
			}
			if (!isAPriority && isBPriority) {
				return 1;
			}

			return a.localeCompare(b);
		});
};

const formatFileContext = (relPath: string, content: string) => {
	const normalizedPath = relPath.startsWith("packages/") ? relPath : `packages/callapi/src/${relPath}`;

	return `--- FILE: ${normalizedPath} ---\n${content}\n--- END FILE ---`;
};

export const assembleContext = (title: string, intro: string, contents: string[]) => {
	return [`=== ${title} ===`, intro, ...contents].filter(Boolean).join("\n\n");
};

const getFilesRecursive = async (dir: string): Promise<string[]> => {
	const directoryContents = await fs.readdir(dir, { withFileTypes: true });

	const files = await Promise.all(
		directoryContents.map(async (content) => {
			const fullPath = path.resolve(dir, content.name);
			return content.isDirectory() ? getFilesRecursive(fullPath) : fullPath;
		})
	);

	return files.flat();
};

const assembleSourceContext = (packageJson: string, fileContents: string[]) => {
	return assembleContext(
		"CALLAPI SOURCE CODE CONTEXT",
		"The following is the authoritative source code for the CallApi library. Use this for deep implementation details and TypeScript definitions.",
		[formatFileContext("packages/callapi/package.json", packageJson), ...fileContents]
	);
};

export const getLocalSourceContext = async (): Promise<string> => {
	const rootDir = process.cwd();
	const libraryPath = path.resolve(rootDir, "../../packages/callapi");
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

export const getRemoteSourceContext = async (): Promise<string> => {
	const [contents, packageJson] = await Promise.all([
		callGithubApi("https://api.github.com/repos/zayne-labs/callapi/contents/packages/callapi"),
		callGithubApi(
			"https://raw.githubusercontent.com/zayne-labs/callapi/main/packages/callapi/package.json",
			{ responseType: "text" }
		).catch(() => "Failed to fetch package.json"),
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
			callGithubApi(
				"https://raw.githubusercontent.com/zayne-labs/callapi/main/packages/callapi/src/:filePath",
				{
					params: { filePath },
					responseType: "text",
				}
			).then((content) => formatFileContext(filePath, content))
		)
	);

	const fileContents = results
		.filter((res): res is PromiseFulfilledResult<string> => res.status === "fulfilled")
		.map((res) => res.value);

	return assembleSourceContext(packageJson, fileContents);
};
