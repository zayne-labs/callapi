import { configDefault } from "fumadocs-core/highlight";
import type { ResolvedShikiConfig } from "fumadocs-core/highlight/config";

export const shikiConfig = {
	...configDefault,
	defaultThemes: {
		themes: {
			dark: "material-theme-darker",
			light: "material-theme-lighter",
		},
	},
} satisfies ResolvedShikiConfig;
