"use client";

import { useChat } from "@ai-sdk/react";
import { AIChatProvider, AIChatSearch, type AIChatClientData } from "@fumadocs/ai-chat";
import { DefaultChatTransport, type InferUITool, type UIMessage } from "ai";
import type { ReactNode } from "react";
import type { SearchToolType } from "@/lib/chat/tools/search";
import type { SearchSourceToolType } from "@/lib/chat/tools/searchSource";

// eslint-disable-next-line react-refresh/only-export-components -- Re-exports the @fumadocs/ai-chat pieces the layout uses
export { AIChatPanel, useAIChat } from "@fumadocs/ai-chat";

export type ChatUIMessage = UIMessage<
	never,
	{ client: AIChatClientData },
	{
		search: InferUITool<SearchToolType>;
		searchSource: InferUITool<SearchSourceToolType>;
	}
>;

const suggestions = ["Summarize this page", "How do I install CallApi?", "How do I add plugins?"];

export function AIChat(props: { children: ReactNode }) {
	const { children } = props;

	const chat = useChat<ChatUIMessage>({
		id: "search",
		throttle: 40,
		transport: new DefaultChatTransport({ api: "/api/chat" }),
	});

	return (
		<AIChatProvider
			chat={chat}
			renderPart={renderPart}
			description="Answers come from the CallApi docs and source code. AI can make mistakes."
			suggestions={suggestions}
		>
			{children}
		</AIChatProvider>
	);
}

// == Kept outside the component so its identity is stable, letting settled messages skip re-rendering
function renderPart(part: ChatUIMessage["parts"][number], live: boolean) {
	switch (part.type) {
		case "tool-search": {
			return <AIChatSearch part={part} live={live} />;
		}

		// == Source results link to GitHub, labelled by file path and line range
		case "tool-searchSource": {
			const output = part.output?.results.map((result) => ({
				doc: { title: `${result.path}:${result.startLine}-${result.endLine}`, url: result.url },
			}));

			return <AIChatSearch part={{ ...part, output }} live={live} />;
		}

		default: {
			return null;
		}
	}
}
