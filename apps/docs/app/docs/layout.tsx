import { AISearchTrigger } from "@/components/ai/search";
import { BgPattern } from "@/components/icons";
import "fumadocs-twoslash/twoslash.css";
import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { docsOptions } from "../../lib/layout.shared";

function Layout(props: LayoutProps<"/docs">) {
	const { children } = props;

	return (
		<DocsLayout {...docsOptions()}>
			<span
				className="absolute inset-0 z-[-1] h-256 max-h-screen overflow-hidden
					bg-[radial-gradient(49.63%_57.02%_at_58.99%_-7.2%,--alpha(var(--color-fd-primary)/0.1)_39.4%,transparent_100%)]"
			>
				<BgPattern />
			</span>

			{children}

			<AISearchTrigger />
		</DocsLayout>
	);
}

export default Layout;
