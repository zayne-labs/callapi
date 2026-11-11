import { zayne } from "@zayne-labs/knip-config";

export default zayne({
	extend: {
		workspaces: {
			"apps/dev": {
				// == `src/server.ts` only runs through the `dev:server` script, so it's left out of production mode
				project: ["**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}!", "!src/server.ts!"],
			},

			"apps/docs": {
				// == Read by `<auto-type-table path="../../lib/callapi-options.ts" />` in the MDX docs, not imported
				entry: ["lib/callapi-options.ts"],

				// == Fumadocs asks for it alongside the `fumadocs-ui` -> `@fumadocs/base-ui` alias
				ignoreDependencies: ["@base-ui/react"],

				// == `fumadocs-mdx/macro` reads the exported `docs` collection
				ignoreIssues: { "lib/source/index.ts": ["exports"] },

				// == Knip's default project files (plus the .mdx/.css its compilers read), minus the Next.js build output.
				// == A trailing `!` limits a pattern to production mode, so the `.next` negation has none to apply in both modes
				project: ["**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx,mdx,css}!", "!.next/**"],
			},

			"packages/callapi": {
				// == Test helpers are only imported by tests, so they're left out of production mode
				project: ["**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}!", "!tests/**!"],
			},

			"packages/callapi-plugins": {
				// == Test helpers are only imported by tests, so they're left out of production mode
				project: ["**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}!", "!tests/**!"],
			},
		},
	},
});
