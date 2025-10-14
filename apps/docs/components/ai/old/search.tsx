"use client";

import { type UIMessage, type UseChatHelpers, useChat } from "@ai-sdk/react";
import type { InferProps } from "@zayne-labs/toolkit-react/utils";
import { DefaultChatTransport } from "ai";
import Link from "fumadocs-core/link";
import { Loader2, RefreshCw, Send, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { createContext, use, useEffect, useRef, useState } from "react";
import type { z } from "zod";
import type { ProvideLinksToolSchema } from "@/lib/chat/ai-tools-schema";
import { cn } from "@/lib/cn";
import { Button } from "../../ui/button";
import { Markdown } from "../markdown";

const ChatContext = createContext<UseChatHelpers<UIMessage> | null>(null);

function useChatContext() {
	const context = use(ChatContext);

	if (!context) {
		throw new Error("useChatContext must be used within a ChatContext");
	}

	return context;
}

function SearchAIActions(props: InferProps<"div">) {
	const { messages, regenerate, setMessages, status } = useChatContext();
	const isLoading = status === "streaming";

	if (messages.length === 0) {
		return null;
	}

	return (
		<div {...props}>
			{!isLoading && messages.at(-1)?.role === "assistant" && (
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
			<Button
				type="button"
				size="sm"
				theme="secondary"
				className="rounded-full"
				onClick={() => setMessages([])}
			>
				Clear Chat
			</Button>
		</div>
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
		<form {...restOfProps} className={cn("flex items-start pe-2", className)} onSubmit={onStart}>
			<Input
				value={input}
				placeholder={isLoading ? "AI is answering..." : "Ask AI something"}
				className="max-h-60 min-h-10 p-3"
				disabled={status === "streaming" || status === "submitted"}
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
				<Button theme="secondary" className="mt-2 gap-2 rounded-full" onClick={() => void stop()}>
					<Loader2 className="size-4 animate-spin text-fd-muted-foreground" />
					<p>Abort Answer</p>
				</Button>
			:	<Button
					type="submit"
					theme="ghost"
					size="icon"
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

	const shared = cn("col-start-1 row-start-1", className);

	return (
		<div className="grid flex-1">
			<textarea
				value={value}
				id="nd-ai-input"
				{...restOfProps}
				className={cn(
					"resize-none bg-transparent placeholder:text-fd-muted-foreground focus-visible:outline-none",
					shared
				)}
			/>
			<div ref={ref} className={cn(shared, "invisible break-all")}>
				{`${value?.toString() ?? ""}\n`}
			</div>
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
			if (!container) return;

			container.scrollTo({
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
			className={cn(
				"fd-scroll-container flex max-h-[calc(100dvh-240px)] min-w-0 flex-col overflow-y-auto",
				className
			)}
		>
			{children}
		</div>
	);
}

const roleName = {
	assistant: "assistant",
	user: "you",
} satisfies Record<Exclude<UIMessage["role"], "system">, string> as Record<string, string>;

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

	const isLinksPresent = links && links.length > 0;

	return (
		<div {...restOfProps}>
			<p
				className={cn(
					"mb-1 text-sm font-medium text-fd-muted-foreground",
					message.role === "assistant" && "text-fd-primary"
				)}
			>
				{roleName[message.role] ?? "unknown"}
			</p>

			<div className="prose text-sm">
				<Markdown text={markdown} />
			</div>

			{isLinksPresent && (
				<div className="mt-2 flex flex-wrap items-center gap-1">
					{links?.map((item) => (
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

export default function AISearch(props: InferProps<typeof Dialog.Root>) {
	const { children, ...restOfProps } = props;

	const chat = useChat({
		id: "search",
		transport: new DefaultChatTransport({ api: "/api/chat" }),
	});

	const messages = chat.messages.filter((msg) => msg.role !== "system");

	return (
		<Dialog.Root {...restOfProps}>
			{children}

			<Dialog.Portal>
				<Dialog.Overlay
					className="fixed inset-0 z-50 backdrop-blur-xs data-[state=closed]:animate-fd-fade-out
						data-[state=open]:animate-fd-fade-in"
				/>

				<Dialog.Content
					onOpenAutoFocus={(event) => {
						document.querySelector<HTMLElement>("#nd-ai-input")?.focus();
						event.preventDefault();
					}}
					aria-describedby={undefined}
					className="fixed left-1/2 z-50 flex w-[calc(100%-1rem)] max-w-screen-sm -translate-x-1/2
						flex-col rounded-2xl border bg-fd-popover/80 p-1 shadow-2xl backdrop-blur-xl
						focus-visible:outline-none data-[state=closed]:animate-fd-dialog-out
						data-[state=open]:animate-fd-dialog-in max-md:top-12 md:bottom-12"
				>
					<ChatContext value={chat}>
						<div className="flex flex-col gap-1 px-3 py-2">
							<Dialog.Title className="text-sm font-medium">CallApi Assistant</Dialog.Title>
							<Dialog.Description className="text-xs text-fd-muted-foreground">
								AI can be inaccurate, please verify the information.
							</Dialog.Description>
						</div>

						<Dialog.Close aria-label="Close" tabIndex={-1} asChild={true}>
							<Button
								className="absolute end-1 top-1 text-fd-muted-foreground"
								size="icon"
								theme="ghost"
							>
								<X />
							</Button>
						</Dialog.Close>

						{messages.length > 0 && (
							<MessageList
								style={{
									maskImage:
										"linear-gradient(to bottom, transparent, black 20px, black calc(100% - 20px), transparent)",
								}}
							>
								<div className="flex flex-col gap-4 p-3">
									{messages.map((item) => (
										<Message key={item.id} message={item} />
									))}
								</div>
							</MessageList>
						)}

						<div
							className="overflow-hidden rounded-xl border border-fd-foreground/20
								text-fd-popover-foreground"
						>
							<SearchAIInput />
							<SearchAIActions className="flex flex-row items-center gap-1.5 p-1 empty:hidden" />
						</div>
					</ChatContext>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
