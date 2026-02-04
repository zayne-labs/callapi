import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
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

		environment: "node",
		globals: true,
		setupFiles: ["./tests/test-setup/setup.ts"],
		// typecheck: { enabled: true },
	},
});
