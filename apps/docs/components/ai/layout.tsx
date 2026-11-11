"use client";

import { DocsLayout as Layout, type DocsLayoutProps } from "fumadocs-ui/layouts/spacious";
import { AIChat, AIChatPanel, useAIChat } from "./search";

export function DocsLayout(props: DocsLayoutProps) {
	return (
		<AIChat>
			<ChatLayout {...props} />
		</AIChat>
	);
}

function ChatLayout(props: DocsLayoutProps) {
	const { open, setOpen } = useAIChat();

	return (
		<Layout {...props} aiChat={{ onOpenChange: setOpen, open, panel: <AIChatPanel />, trigger: true }} />
	);
}
