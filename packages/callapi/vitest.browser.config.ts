import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		browser: {
			enabled: true,
			// https://vitest.dev/guide/browser/playwright
			instances: [{ browser: "chromium" }],
			provider: "playwright",
		},

		coverage: {
			exclude: ["node_modules/", "dist/", "tests/", "**/*.d.ts", "**/*.config.*"],
			provider: "v8",
			reporter: ["json", "html"],
			thresholds: {
				global: {
					branches: 85,
					functions: 95,
					lines: 90,
					statements: 90,
				},
			},
		},
	},
});
