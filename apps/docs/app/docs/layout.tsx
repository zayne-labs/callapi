import { DocsLayout } from "@/components/ai/layout";
import { BgPatternIcon } from "@/components/icons/BgPatternIcon";
import { BreadcrumbStructuredData } from "@/components/seo/breadcrumb-structured-data";
import { getDocsOptions } from "@/lib/layout.shared";

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
					bg-[radial-gradient(52%_58%_at_58%_-8%,--alpha(var(--color-fd-primary)/0.075)_34%,transparent_100%)]"
			>
				<BgPatternIcon />
			</span>

			{children}
		</DocsLayout>
	);
}

export default Layout;
