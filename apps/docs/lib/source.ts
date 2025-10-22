import { docs } from "@/.source";
import { type InferMetaType, type InferPageType, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";

export const source = loader({
	baseUrl: "/docs",
	// icon: (iconName) => {
	// 	if (!iconName) return;

	// 	if (!(iconName in lucideIcons)) return;

	// 	return createElement(lucideIcons[iconName as keyof typeof lucideIcons]);
	// },
	plugins: [lucideIconsPlugin()],
	source: docs.toFumadocsSource(),
});

export type Page = InferPageType<typeof source>;
export type Meta = InferMetaType<typeof source>;
