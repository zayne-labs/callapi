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
import { useEffect, useMemo, useRef, useState } from "react";
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
				<p className="text-xs text-fd-muted-foreground">Powered by Gemma</p>
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

function SearchAIInput(props: InferProps<"form">) {
	const { className, ...restOfProps } = props;
	const { sendMessage, status, stop } = useChatContext();

	const [input, setInput] = useState("");

	const isLoading = status === "streaming" || status === "submitted";

	const onStart = (event: React.SyntheticEvent) => {
		event.preventDefault();
		void sendMessage({ text: input });
		setInput("");
	};

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

export function AISearchTrigger() {
	const [open, setOpen] = useState(false);

	const chat = useChat({
		id: "search",
		transport: new DefaultChatTransport({
			api: "/api/chat",
		}),
	});

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

	const contextValue = useMemo<GeneralContextType>(
		() => ({ chat, open, setOpen }) satisfies GeneralContextType,
		[chat, open]
	);

	return (
		<GeneralContextProvider value={contextValue}>
			<style>
				{css`
					@keyframes ask-ai-open {
						from {
							translate: 100% 0;
						}
					}

					@keyframes ask-ai-close {
						to {
							translate: 100% 0;
							opacity: 0;
						}
					}
				`}
			</style>

			<Presence present={open}>
				<div
					className={cnMerge(
						`fixed inset-y-2 z-30 flex flex-col rounded-2xl border bg-fd-popover p-2
						text-fd-popover-foreground shadow-lg max-sm:inset-x-2 sm:end-2 sm:w-[460px]`,
						open ? "animate-[ask-ai-open_300ms]" : "animate-[ask-ai-close_300ms]"
					)}
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
						className="rounded-xl border bg-fd-card text-fd-card-foreground has-focus-visible:ring-2
							has-focus-visible:ring-fd-ring"
					>
						<SearchAIInput />
						<div className="flex items-center gap-1.5 p-1 empty:hidden">
							<SearchAIActions />
						</div>
					</div>
				</div>
			</Presence>

			<Button
				unstyled={true}
				className={cnMerge(
					`fixed bottom-4 z-20 flex h-10 w-24 items-center gap-3 rounded-2xl border bg-fd-secondary
					px-2 text-sm font-medium text-fd-muted-foreground shadow-lg transition-[translate,opacity]`,
					"end-[calc(var(--removed-body-scroll-bar-size,0px)+var(--fd-layout-offset)+1rem)]",
					open && "translate-y-10 opacity-0"
				)}
				onClick={() => setOpen(true)}
			>
				<MessageCircleIcon className="size-4.5" />
				Ask AI
			</Button>
		</GeneralContextProvider>
	);
}
