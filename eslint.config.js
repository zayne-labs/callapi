import { GLOB_MARKDOWN_CODE, zayne } from "@zayne-labs/eslint-config";

export default zayne(
	{
		type: "lib",
		ignores: ["packages/**/dist/**", "eslint.config.js", "apps/docs/.source/**"],
		react: {
			nextjs: true,
		},
		tailwindcssBetter: {
			settings: { entryPoint: "apps/docs/tailwind.css" },
		},
		typescript: {
			tsconfigPath: ["tsconfig.json", "packages/*/tsconfig.json", "apps/*/tsconfig.json"],
			// tsconfigPath: ["**/tsconfig.json"],
		},
	},
	{
		files: ["packages/callapi/src/createFetchClient.ts"],
		rules: {
			complexity: ["warn", { max: 70 }],
		},
	},
	{
		files: ["packages/callapi/src/**/*.ts"],
		rules: {
			"ts-eslint/consistent-type-definitions": "off",
		},
	},
	{
		files: ["apps/docs/**/*"],
		rules: {
			"eslint-comments/require-description": "off",
		},
	},
	{
		files: [`apps/docs/content/docs/${GLOB_MARKDOWN_CODE}`],
		rules: {
			"eslint-comments/disable-enable-pair": "off",
			"no-param-reassign": "off",
		},
	},

	{
		files: ["packages/callapi/tests/**"],
		rules: {
			"no-await-in-loop": "off",
			"perfectionist/sort-objects": "off",
			"ts-eslint/no-unsafe-assignment": "off",
			"ts-eslint/no-unsafe-member-access": "off",
			"ts-eslint/no-unsafe-return": "off",
			"unicorn/consistent-function-scoping": "off",
			"unicorn/no-useless-undefined": "off",
		},
	}
).overrides({
	"zayne/react/nextjs/recommended": (config) => ({
		...config,
		files: ["apps/docs/**/*.{ts,tsx}"],
	}),
	"zayne/react/nextjs/rules": (config) => ({
		...config,
		files: ["apps/docs/**/*.{ts,tsx}"],
	}),
	"zayne/react/refresh/rules": (config) => ({
		...config,
		files: ["apps/docs/**/*.{ts,tsx}"],
	}),
});
