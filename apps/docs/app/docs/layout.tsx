import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { MessageCircleIcon } from "lucide-react";
import { AISearchPanel, AISearchRoot, AISearchTrigger } from "@/components/ai/search";
import { BgPatternIcon } from "@/components/icons/BgPatternIcon";
import { BreadcrumbStructuredData } from "@/components/seo/breadcrumb-structured-data";
import { Button } from "@/components/ui/button";
import { getDocsOptions } from "../../lib/layout.shared";

function Layout(props: LayoutProps<"/docs">) {
	const { children } = props;

	return (
		<DocsLayout {...getDocsOptions()}>
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
				<BgPatternIcon />
			</span>

			{children}

			<AISearchRoot>
				<AISearchPanel />
				<AISearchTrigger position="float" asChild={true}>
					<Button className="rounded-2xl text-fd-muted-foreground" theme="secondary">
						<MessageCircleIcon className="size-4.5" />
						Ask AI
					</Button>
				</AISearchTrigger>
			</AISearchRoot>
		</DocsLayout>
	);
}

export default Layout;
