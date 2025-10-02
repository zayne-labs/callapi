import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { BgPattern } from "@/components/icons";
import { docsOptions } from "../layout.config";
import "fumadocs-twoslash/twoslash.css";
import { AISearchTrigger } from "@/components/ai/search";

function Layout({ children }: { children: React.ReactNode }) {
	return (
		<DocsLayout {...docsOptions}>
			<span
				className="absolute inset-0 z-[-1] h-[64rem] max-h-screen overflow-hidden
					bg-[radial-gradient(49.63%_57.02%_at_58.99%_-7.2%,_--alpha(var(--color-fd-primary)/0.1)_39.4%,_transparent_100%)]"
			>
				<BgPattern />
			</span>

			{children}

			<AISearchTrigger />
		</DocsLayout>
	);
}

export default Layout;
