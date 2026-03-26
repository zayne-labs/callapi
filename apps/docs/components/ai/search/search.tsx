"use client";

import { useChat, type UIMessage, type UseChatHelpers } from "@ai-sdk/react";
import { css, on } from "@zayne-labs/toolkit-core";
import { createCustomContext } from "@zayne-labs/toolkit-react";
import type { InferProps } from "@zayne-labs/toolkit-react/utils";
import { Presence } from "@zayne-labs/ui-react/common/presence";
import { DefaultChatTransport, type Tool, type UIToolInvocation } from "ai";
import Link from "fumadocs-core/link";
import { Loader2, MessageCircleIcon, RefreshCw, SearchIcon, Send, X } from "lucide-react";
import {
	useEffect,
	useEffectEvent,
	useInsertionEffect,
	useMemo,
	useRef,
	useState,
	type ComponentProps,
} from "react";
import { toast } from "sonner";
import { cn } from "tailwind-variants";
import { z } from "zod";
import { Slot } from "@/components/common";
import type { ProvideLinksToolSchema } from "@/lib/chat/tools/provideLinks";
import type { SearchToolType } from "@/lib/chat/tools/search";
import { cnMerge } from "@/lib/utils/cn";
import { buttonVariants } from "../../ui/button";
import { Markdown } from "./markdown";

type AISearchContextType = {
	chat: UseChatHelpers<UIMessage>;
	open: boolean;
	setOpen: (open: boolean) => void;
};

const [AISearchContextProvider, useAISearchContext] = createCustomContext<AISearchContextType>({
	hookName: "useAISearchContext",
	name: "AISearchContext",
	providerName: "AISearchContextProvider",
});

const useChatContext = () => {
	const context = useAISearchContext();

	return context.chat;
};

export function AISearchPanelHeader(props: ComponentProps<"div">) {
	const { className, ...restOfProps } = props;

	const { setOpen } = useAISearchContext();

	return (
		<div
			className={cnMerge(
				`sticky top-0 flex items-start gap-2 rounded-xl border bg-fd-secondary
				text-fd-secondary-foreground shadow-sm`,
				className
			)}
			{...restOfProps}
		>
			<div className="flex-1 px-3 py-2">
				<p className="mb-2 text-sm font-medium">AI Chat</p>
				<p className="text-xs text-fd-muted-foreground">
					Powered by{" "}
					<a href="https://gemini.google.com" target="_blank" rel="noreferrer noopener">
						Gemma
					</a>
				</p>
			</div>

			<button
				type="button"
				aria-label="Close"
				tabIndex={-1}
				className={buttonVariants({
					className: "rounded-full text-fd-muted-foreground",
					size: "icon-sm",
					theme: "ghost",
				})}
				onClick={() => setOpen(false)}
			>
				<X />
			</button>
		</div>
	);
}

export function AISearchInputActions() {
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
			{shouldShowRetry && (
				<button
					type="button"
					className={buttonVariants({
						className: "gap-1.5 rounded-full",
						size: "sm",
						theme: "secondary",
					})}
					onClick={() => void regenerate()}
				>
					<RefreshCw className="size-4" />
					<p>Retry</p>
				</button>
			)}

			<button
				type="button"
				className={buttonVariants({
					className: "rounded-full",
					size: "sm",
					theme: "secondary",
				})}
				onClick={() => setMessages([])}
			>
				Clear Chat
			</button>
		</>
	);
}

function AISearchInputPrimitive(props: InferProps<"textarea">) {
	const { className, value, ...restOfProps } = props;

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

			<div className={cnMerge(shared, "invisible break-all")}>{`${value?.toString() ?? ""}\n`}</div>
		</div>
	);
}

const StorageKeyInput = "__ai_search_input";

export function AISearchInput(props: InferProps<"form">) {
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
			<AISearchInputPrimitive
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
				<button
					key="bn"
					type="button"
					className={buttonVariants({
						className: "mt-2 gap-2 rounded-full transition-all",
						theme: "secondary",
					})}
					onClick={() => void stop()}
				>
					<Loader2 className="size-4 animate-spin text-fd-muted-foreground" />
					<p>Abort Answer</p>
				</button>
			:	<button
					key="bn"
					type="submit"
					className={buttonVariants({
						className: "mt-2 rounded-full transition-all",
						theme: "primary",
					})}
					disabled={input.length === 0}
				>
					<Send className="size-4" />
				</button>
			}
		</form>
	);
}

// eslint-disable-next-line ts-eslint/no-unused-vars
function AISearchMessagePrimitiveWithLinksTool(props: InferProps<"div"> & { message: UIMessage }) {
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
		<div onClick={(event) => event.stopPropagation()} {...restOfProps}>
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

function AISearchMessagePrimitiveWithSearchTool(props: InferProps<"div"> & { message: UIMessage }) {
	const { message, ...restOfProps } = props;

	let markdown = "";

	const searchCalls: Array<UIToolInvocation<SearchToolType>> = [];

	// eslint-disable-next-line ts-eslint/no-unnecessary-condition
	for (const part of message.parts ?? []) {
		if (part.type === "text") {
			markdown += part.text;
			continue;
		}

		if (part.type.startsWith("tool-")) {
			const toolName = part.type.slice("tool-".length);
			const castedPart = part as UIToolInvocation<Tool>;

			(toolName !== "search" || !castedPart.toolCallId) && searchCalls.push(castedPart);
		}
	}

	return (
		<div onClick={(e) => e.stopPropagation()} {...restOfProps}>
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

			{searchCalls.map((call) => {
				return (
					<div
						key={call.toolCallId}
						className="mt-3 flex flex-row items-center gap-2 rounded-lg border bg-fd-secondary p-2
							text-xs text-fd-muted-foreground"
					>
						<SearchIcon className="size-4" />
						{call.state === "output-error" || call.state === "output-denied" ?
							<p className="text-fd-error">{call.errorText ?? "Failed to search"}</p>
						:	<p>{!call.output ? "Searching…" : `${call.output.length} search results`}</p>}
					</div>
				);
			})}
		</div>
	);
}

function AISearchMessageList(props: Omit<InferProps<"div">, "dir">) {
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

	const contextValue = useMemo<AISearchContextType>(
		() => ({ chat, open, setOpen }) satisfies AISearchContextType,
		[chat, open]
	);

	return <AISearchContextProvider value={contextValue}>{children}</AISearchContextProvider>;
}

export function AISearchTrigger(
	props: React.ComponentProps<"button"> & { asChild?: boolean; position?: "default" | "float" }
) {
	const { asChild = false, children, className, position = "default", ...restOfProps } = props;
	const { open, setOpen } = useAISearchContext();

	const Component = asChild ? Slot.Root : "button";

	return (
		<Component
			type="button"
			data-state={open ? "open" : "closed"}
			className={cnMerge(
				position === "float" && [
					`fixed inset-e-[calc(--spacing(4)+var(--removed-body-scroll-bar-size,0px))] bottom-4 z-20
					w-24 gap-3 shadow-lg transition-[translate,opacity]`,
					open && "translate-y-10 opacity-0",
				],
				className
			)}
			onClick={() => setOpen(!open)}
			{...restOfProps}
		>
			{children}
		</Component>
	);
}

export function AISearchPanelList({ className, style, ...props }: ComponentProps<"div">) {
	const chat = useChatContext();

	const messages = chat.messages.filter((msg) => msg.role !== "system");

	return (
		<AISearchMessageList
			className={cn("overscroll-contain py-4", className)}
			style={{
				maskImage:
					"linear-gradient(to bottom, transparent, white 1rem, white calc(100% - 1rem), transparent 100%)",
				...style,
			}}
			{...props}
		>
			{messages.length === 0 ?
				<div
					className="flex size-full flex-col items-center justify-center gap-2 text-center text-sm
						text-fd-muted-foreground/80"
				>
					<MessageCircleIcon fill="currentColor" stroke="none" />
					<p onClick={(event) => event.stopPropagation()}>Start a new chat below.</p>
				</div>
			:	<div className="flex flex-col gap-4 px-3">
					{messages.map((item) => (
						<AISearchMessagePrimitiveWithSearchTool key={item.id} message={item} />
					))}
				</div>
			}
		</AISearchMessageList>
	);
}

const useHotKey = () => {
	const { open, setOpen } = useAISearchContext();

	const onKeyPress = useEffectEvent((event: KeyboardEvent) => {
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
		const cleanup = on(globalThis, "keydown", onKeyPress);

		return () => cleanup();
	}, []);
};

export function AISearchPanel() {
	const { open, setOpen } = useAISearchContext();

	useHotKey();

	return (
		<>
			<style>
				{css`
					@keyframes ask-ai-open {
						from {
							translate: 100% 0;
						}
						to {
							translate: 0 0;
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
					className="fixed inset-0 z-30 bg-fd-overlay backdrop-blur-xs
						data-[animation-phase=enter]:animate-fd-fade-in
						data-[animation-phase=exit]:animate-fd-fade-out lg:hidden"
					onClick={() => setOpen(false)}
				/>
			</Presence>

			<Presence present={open}>
				<div
					className={cnMerge(
						`z-30 overflow-hidden bg-fd-card text-fd-card-foreground [--ai-chat-width:400px]
						2xl:[--ai-chat-width:460px]`,
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
							lg:p-3"
					>
						<AISearchPanelHeader />
						<AISearchPanelList className="flex-1" />
						<div
							className="rounded-xl border bg-fd-secondary text-fd-secondary-foreground shadow-sm
								has-focus-visible:shadow-md"
						>
							<AISearchInput />
							<div className="flex items-center gap-1.5 p-1 empty:hidden">
								<AISearchInputActions />
							</div>
						</div>
					</div>
				</div>
			</Presence>
		</>
	);
}
