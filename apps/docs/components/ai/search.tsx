"use client";

import type { ProvideLinksToolSchema } from "@/lib/chat/ai-tools-schema";
import { cnMerge } from "@/lib/utils/cn";
import { type UIMessage, type UseChatHelpers, useChat } from "@ai-sdk/react";
import { css, on } from "@zayne-labs/toolkit-core";
import { createCustomContext, useCallbackRef } from "@zayne-labs/toolkit-react";
import type { InferProps } from "@zayne-labs/toolkit-react/utils";
import { Presence } from "@zayne-labs/ui-react/common/presence";
import { DefaultChatTransport } from "ai";
import Link from "fumadocs-core/link";
import { Loader2, MessageCircleIcon, RefreshCw, Send, X } from "lucide-react";
import { useEffect, useInsertionEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../ui/button";
import { Markdown } from "./markdown";

type GeneralContextType = {
	chat: UseChatHelpers<UIMessage>;
	open: boolean;
	setOpen: (open: boolean) => void;
};

const [GeneralContextProvider, useGeneralContext] = createCustomContext<GeneralContextType>({
	hookName: "useGeneralContext",
	name: "GeneralContext",
	providerName: "GeneralContextProvider",
});

function useChatContext() {
	const context = useGeneralContext();

	return context.chat;
}

function Header() {
	const { setOpen } = useGeneralContext();

	return (
		<div className="sticky top-0 flex items-start gap-2">
			<div className="flex-1 rounded-xl border bg-fd-card p-3 text-fd-card-foreground">
				<p className="mb-2 text-sm font-medium">Ask AI</p>
				<p className="text-xs text-fd-muted-foreground">
					Powered by{" "}
					<a href="https://gemini.google.com" target="_blank" rel="noreferrer noopener">
						Gemma
					</a>
				</p>
			</div>

			<Button
				size="icon-sm"
				theme="secondary"
				className="rounded-full"
				aria-label="Close"
				tabIndex={-1}
				onClick={() => setOpen(false)}
			>
				<X />
			</Button>
		</div>
	);
}

function SearchAIActions() {
	const { error, messages, regenerate, setMessages, status } = useChatContext();
	const isLoading = status === "streaming";

	const errorMessage = error?.message;

	useEffect(() => {
		if (errorMessage) {
			toast.error(errorMessage);
		}
	}, [errorMessage]);

	if (messages.length === 0) {
		return null;
	}

	const shouldShowRetry = (!isLoading && messages.at(-1)?.role === "assistant") || errorMessage;

	return (
		<>
			<Button size="sm" theme="secondary" className="rounded-full" onClick={() => setMessages([])}>
				Clear Chat
			</Button>

			{shouldShowRetry && (
				<Button
					size="sm"
					theme="secondary"
					className="gap-1.5 rounded-full"
					onClick={() => void regenerate()}
				>
					<RefreshCw className="size-4" />
					<p>Retry</p>
				</Button>
			)}
		</>
	);
}

const StorageKeyInput = "__ai_search_input";

function SearchAIInput(props: InferProps<"form">) {
	const { className, ...restOfProps } = props;
	const { sendMessage, status, stop } = useChatContext();

	const [input, setInput] = useState(() => localStorage.getItem(StorageKeyInput) ?? "");

	const isLoading = status === "streaming" || status === "submitted";

	const onStart = (event: React.SyntheticEvent) => {
		event.preventDefault();
		void sendMessage({ text: input });
		setInput("");
	};

	useInsertionEffect(() => {
		localStorage.setItem(StorageKeyInput, input);
	}, [input]);

	useEffect(() => {
		if (isLoading) {
			document.querySelector<HTMLElement>("#nd-ai-input")?.focus();
		}
	}, [isLoading]);

	return (
		<form {...restOfProps} className={cnMerge("flex items-start pe-2", className)} onSubmit={onStart}>
			<Input
				value={input}
				placeholder={isLoading ? "AI is answering..." : "Ask a question"}
				autoFocus={true}
				className="p-3"
				disabled={isLoading}
				onChange={(e) => {
					setInput(e.target.value);
				}}
				onKeyDown={(event) => {
					if (!event.shiftKey && event.key === "Enter") {
						onStart(event);
					}
				}}
			/>

			{isLoading ?
				<Button
					key="bn"
					theme="secondary"
					className="mt-2 gap-2 rounded-full transition-all"
					onClick={() => void stop()}
				>
					<Loader2 className="size-4 animate-spin text-fd-muted-foreground" />
					<p>Abort Answer</p>
				</Button>
			:	<Button
					key="bn"
					type="submit"
					theme="secondary"
					className="mt-2 rounded-full transition-all"
					disabled={input.length === 0}
				>
					<Send className="size-4" />
				</Button>
			}
		</form>
	);
}

function Input(props: InferProps<"textarea">) {
	const { className, value, ...restOfProps } = props;

	const ref = useRef<HTMLDivElement>(null);

	const shared = cnMerge("col-start-1 row-start-1", className);

	return (
		<div className="grid flex-1">
			<textarea
				value={value}
				id="nd-ai-input"
				{...restOfProps}
				className={cnMerge(
					"resize-none bg-transparent placeholder:text-fd-muted-foreground focus-visible:outline-none",
					shared
				)}
			/>

			<div ref={ref} className={cnMerge(shared, "invisible break-all")}>
				{`${value?.toString() ?? ""}\n`}
			</div>
		</div>
	);
}

function Message(props: InferProps<"div"> & { message: UIMessage }) {
	const { message, ...restOfProps } = props;

	let markdown = "";

	let links: z.infer<typeof ProvideLinksToolSchema>["links"] = [];

	// eslint-disable-next-line ts-eslint/no-unnecessary-condition
	for (const part of message.parts ?? []) {
		if (part.type === "text") {
			markdown += part.text;
			continue;
		}

		if (part.type === "tool-provideLinks" && part.input) {
			links = (part.input as z.infer<typeof ProvideLinksToolSchema>).links;
		}
	}

	return (
		<div {...restOfProps}>
			<p
				className={cnMerge(
					"mb-1 text-sm font-medium text-fd-muted-foreground",
					message.role === "assistant" && "text-fd-primary"
				)}
			>
				{roleName[message.role] ?? "unknown"}
			</p>

			<div className="prose text-sm">
				<Markdown text={markdown} />
			</div>

			{links && links.length > 0 && (
				<div className="mt-2 flex flex-wrap items-center gap-1">
					{links.map((item) => (
						<Link
							key={item.label}
							href={item.url}
							className="block rounded-lg border p-3 text-xs hover:bg-fd-accent
								hover:text-fd-accent-foreground"
						>
							<p className="font-medium">{item.title}</p>
							<p className="text-fd-muted-foreground">Reference {item.label}</p>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}

function MessageList(props: Omit<InferProps<"div">, "dir">) {
	const { children, className, ...restOfProps } = props;

	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		const callback = () => {
			const container = containerRef.current;

			container?.scrollTo({
				behavior: "instant",
				top: container.scrollHeight,
			});
		};

		const observer = new ResizeObserver(callback);

		callback();

		const element = containerRef.current.firstElementChild;

		if (element) {
			observer.observe(element);
		}

		return () => {
			observer.disconnect();
		};
	}, []);

	return (
		<div
			ref={containerRef}
			{...restOfProps}
			className={cnMerge("fd-scroll-container flex min-w-0 flex-col overflow-y-auto", className)}
		>
			{children}
		</div>
	);
}

const roleName = {
	assistant: "assistant",
	user: "you",
} satisfies Record<Exclude<UIMessage["role"], "system">, string> as Record<string, string>;

export function AISearchRoot(props: { children: React.ReactNode }) {
	const { children } = props;

	const [open, setOpen] = useState(false);

	const chat = useChat({
		id: "search",
		transport: new DefaultChatTransport({
			api: "/api/chat",
		}),
	});

	const contextValue = useMemo<GeneralContextType>(
		() => ({ chat, open, setOpen }) satisfies GeneralContextType,
		[chat, open]
	);

	return <GeneralContextProvider value={contextValue}>{children}</GeneralContextProvider>;
}

export function AISearchTrigger() {
	const { open, setOpen } = useGeneralContext();

	return (
		<Button
			theme="secondary"
			className={cnMerge(
				`fixed end-[calc(--spacing(4)+var(--removed-body-scroll-bar-size,0px))] bottom-4 z-20 w-24
				gap-3 rounded-2xl text-fd-muted-foreground shadow-lg transition-[translate,opacity]`,
				open && "translate-y-10 opacity-0"
			)}
			onClick={() => setOpen(true)}
		>
			<MessageCircleIcon className="size-4.5" />
			Ask AI
		</Button>
	);
}

export function AISearchPanel() {
	const { chat, open, setOpen } = useGeneralContext();

	const onKeyPress = useCallbackRef((event: KeyboardEvent) => {
		if (event.key === "Escape" && open) {
			setOpen(false);
			event.preventDefault();
		}

		if (event.key === "/" && (event.metaKey || event.ctrlKey) && !open) {
			setOpen(true);
			event.preventDefault();
		}
	});

	useEffect(() => {
		const cleanup = on("keydown", globalThis, onKeyPress);

		return () => cleanup();
	}, [onKeyPress]);

	return (
		<>
			<style>
				{css`
					@keyframes ask-ai-open {
						from {
							width: 0px;
						}
						to {
							width: var(--ai-chat-width);
						}
					}
					@keyframes ask-ai-close {
						from {
							width: var(--ai-chat-width);
						}
						to {
							width: 0px;
						}
					}
				`}
			</style>

			<Presence present={open}>
				<div
					data-state={open ? "open" : "closed"}
					className="fixed inset-0 z-30 bg-fd-overlay backdrop-blur-xs
						data-[state=closed]:animate-fd-fade-out data-[state=open]:animate-fd-fade-in lg:hidden"
					onClick={() => setOpen(false)}
				/>
			</Presence>

			<Presence present={open}>
				<div
					className={cnMerge(
						`z-30 overflow-hidden bg-fd-popover text-fd-popover-foreground [--ai-chat-width:400px]
						xl:[--ai-chat-width:460px]`,
						`max-lg:fixed max-lg:inset-x-2 max-lg:top-4 max-lg:rounded-2xl max-lg:border
						max-lg:shadow-xl`,
						`lg:sticky lg:top-0 lg:ms-auto lg:h-dvh lg:border-s
						lg:in-[#nd-docs-layout]:[grid-area:toc] lg:in-[#nd-notebook-layout]:col-start-5
						lg:in-[#nd-notebook-layout]:row-span-full`,
						open ?
							"animate-fd-dialog-in lg:animate-[ask-ai-open_200ms]"
						:	"animate-fd-dialog-out lg:animate-[ask-ai-close_200ms]"
					)}
				>
					<div
						className="flex size-full flex-col p-2 max-lg:max-h-[80dvh] lg:w-(--ai-chat-width)
							xl:p-4"
					>
						<Header />

						<MessageList
							className="flex-1 overscroll-contain px-3 py-4"
							style={{
								maskImage:
									"linear-gradient(to bottom, transparent, white 1rem, white calc(100% - 1rem), transparent 100%)",
							}}
						>
							<div className="flex flex-col gap-4">
								{chat.messages
									.filter((msg) => msg.role !== "system")
									.map((item) => (
										<Message key={item.id} message={item} />
									))}
							</div>
						</MessageList>

						<div
							className="rounded-xl border bg-fd-card text-fd-card-foreground
								has-focus-visible:ring-2 has-focus-visible:ring-fd-ring"
						>
							<SearchAIInput />
							<div className="flex items-center gap-1.5 p-1 empty:hidden">
								<SearchAIActions />
							</div>
						</div>
					</div>
				</div>
			</Presence>
		</>
	);
}
