export default {
	"*.{js,ts,jsx,tsx}": () => "pnpm lint:eslint:dev",
	"*.{js,ts}": () => "pnpm test",
	"*.{ts,tsx}": () => "pnpm lint:type-check",
	/**
	 * @description Remember to Add attw back when this issue is resolved
	 */
	"package.json": () => ["pnpm lint:publint"],

	"packages/**/*.{js,ts,jsx,tsx}": () => "pnpm lint:size",
};
