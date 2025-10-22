import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		browser: {
			enabled: true,
			instances: [{ browser: "chromium" }],
			provider: playwright(),
		},

		coverage: {
			include: ["src/**/*.ts"],
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
