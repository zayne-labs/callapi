import { loader, type InferMetaType, type InferPageType, type LoaderPlugin } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { docs } from "@/.source/server";

const pageTreeCodeTitles = () => {
	return {
		transformPageTree: {
			file: (node) => {
				if (
					typeof node.name === "string"
					&& (node.name.endsWith("()") || /^<\w+ \/>$/.test(node.name))
				) {
					return {
						...node,
						name: <code className="text-[0.8125rem]">{node.name}</code>,
					};
				}

				return node;
			},
		},
	} satisfies LoaderPlugin;
};

export const source = loader({
	baseUrl: "/docs",
	plugins: [pageTreeCodeTitles(), lucideIconsPlugin()],
	source: docs.toFumadocsSource(),
	// icon: (iconName) => {
	// 	if (!iconName) return;

	// 	if (!(iconName in lucideIcons)) return;

	// 	return createElement(lucideIcons[iconName as keyof typeof lucideIcons]);
	// },
});

export type Page = InferPageType<typeof source>;
export type Meta = InferMetaType<typeof source>;
