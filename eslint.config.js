import { GLOB_MARKDOWN_CODE, zayne } from "@zayne-labs/eslint-config";

export default zayne(
	{
		ignores: ["packages/**/dist/**", "apps/docs/.source/**"],
		react: {
			nextjs: {
				overrides: { "nextjs/no-html-link-for-pages": ["error", "apps/docs"] },
			},
		},
		tailwindcssBetter: {
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
		files: ["apps/docs/**/*"],
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
);
