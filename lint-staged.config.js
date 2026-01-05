export default {
	"*.{js,ts,jsx,tsx}": () => ["pnpm test", "pnpm lint:eslint:root"],
	"*.{ts,tsx}": () => "pnpm lint:type-check",
	/**
	 * @description Remember to Add attw back when this issue is resolved
	 */
	"package.json": () => ["pnpm lint:publint"],

	"packages/**/*.{js,ts,jsx,tsx}": () => "pnpm lint:size",
};
