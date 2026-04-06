/** @type {import('lint-staged').Configuration} */
export default {
	"*.{js,ts,jsx,tsx}": () => "pnpm lint:eslint:root",
	"*.{ts,tsx,_parallel-1_}": () => "pnpm test",
	"*.{ts,tsx,_parallel-2_}": () => "pnpm lint:type-check",
	"package.json": () => ["pnpm lint:publint"],
	"packages/**/*.{js,ts,jsx,tsx}": () => "pnpm lint:size",
};
