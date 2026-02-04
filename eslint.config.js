import { GLOB_MARKDOWN_CODE, zayne } from "@zayne-labs/eslint-config";

export default zayne(
	{
		ignores: ["packages/**/dist/**", "apps/docs/.source/**", "packages/callapi/tests/**"],
		react: {
			files: ["apps/docs/**/*.{ts,tsx}"],
			nextjs: {
				overrides: { "nextjs/no-html-link-for-pages": ["error", "apps/docs"] },
			},
		},
		tailwindcssBetter: {
			enforceCanonicalClasses: true,
			settings: { entryPoint: "apps/docs/tailwind.css" },
		},
		type: "lib",
		typescript: {
			tsconfigPath: ["tsconfig.json", "packages/*/tsconfig.json", "apps/*/tsconfig.json"],
			// tsconfigPath: ["**/tsconfig.json"],
		},
	},
	{
		files: ["packages/callapi/src/**/*.ts"],
		rules: {
			"ts-eslint/consistent-type-definitions": "off",
		},
	},
	{
		files: ["apps/docs/**/*.{ts,tsx}"],
		rules: {
			"eslint-comments/require-description": "off",
		},
	},
	{
		files: [`apps/docs/content/docs/${GLOB_MARKDOWN_CODE}`],
		rules: {
			"no-param-reassign": "off",
		},
	},
	{
		files: ["packages/callapi/src/createFetchClient.ts"],
		rules: {
			complexity: ["warn", { max: 70 }],
		},
	}
);
