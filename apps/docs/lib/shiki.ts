import { defineEnumDeep } from "@zayne-labs/toolkit-type-helpers";
import type { BundledTheme, CodeOptionsThemes, CodeToHastOptionsCommon } from "shiki";

type ShikiOptions = CodeOptionsThemes<BundledTheme> & Omit<CodeToHastOptionsCommon, "lang">;

export const shikiOptions = defineEnumDeep({
	themes: {
		dark: "material-theme-darker",
		light: "material-theme-lighter",
	},
}) satisfies ShikiOptions;
