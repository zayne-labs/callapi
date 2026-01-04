import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { AISearchPanel, AISearchRoot, AISearchTrigger } from "@/components/ai/search";
import { BgPattern } from "@/components/icons";
import { BreadcrumbStructuredData } from "@/components/seo/breadcrumb-structured-data";
import { docsOptions } from "../../lib/layout.shared";
import "fumadocs-twoslash/twoslash.css";

function Layout(props: LayoutProps<"/docs">) {
	const { children } = props;

	return (
		<DocsLayout {...docsOptions()}>
			<BreadcrumbStructuredData
				items={[
					{ name: "Home", url: "/" },
					{ name: "Documentation", url: "/docs" },
				]}
			/>
			<span
				className="absolute inset-0 z-[-1] h-256 max-h-screen overflow-hidden
					bg-[radial-gradient(49.63%_57.02%_at_58.99%_-7.2%,--alpha(var(--color-fd-primary)/0.1)_39.4%,transparent_100%)]"
			>
				<BgPattern />
			</span>

			{children}

			<AISearchRoot>
				<AISearchPanel />
				<AISearchTrigger />
			</AISearchRoot>
		</DocsLayout>
	);
}

export default Layout;
