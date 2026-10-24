"use client";

import { useChat, type UIMessage, type UseChatHelpers } from "@ai-sdk/react";
import { css, on } from "@zayne-labs/toolkit-core";
import { createCustomContext } from "@zayne-labs/toolkit-react";
import type { InferProps } from "@zayne-labs/toolkit-react/utils";
import { Presence } from "@zayne-labs/ui-react/common/presence";
import { DefaultChatTransport, type InferUITool, type UIToolInvocation } from "ai";
import { Link } from "fumadocs-core/link";
import {
	ChevronDown,
	ExternalLink,
	Loader2,
	MessageCircleIcon,
	RefreshCw,
	SearchIcon,
	Send,
	X,
} from "lucide-react";
import {
	useEffect,
	useEffectEvent,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
	type ComponentProps,
} from "react";
import { toast } from "sonner";
import { cn } from "tailwind-variants";
import { z } from "zod";
import { Slot } from "@/components/common";
import type { ProvideLinksToolSchema, ProvideLinksToolType } from "@/lib/chat/tools/provideLinks";
import type { SearchToolType } from "@/lib/chat/tools/search";
import type { SearchSourceToolType } from "@/lib/chat/tools/searchSource";
import { cnMerge } from "@/lib/utils/cn";
import { buttonVariants } from "../../ui/button";
import { Markdown } from "./markdown";

type AISearchContextType = {
	chat: UseChatHelpers<AISearchUIMessage>;
	open: boolean;
	setOpen: (open: boolean) => void;
};

type AISearchUIMessage = UIMessage<
	never,
	never,
	{
		provideLinks: InferUITool<ProvideLinksToolType>;
		search: InferUITool<SearchToolType>;
		searchSource: InferUITool<SearchSourceToolType>;
	}
>;

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

	const shouldShowRetry = (!isLoading && messages.at(-1)?.role === "assistant") || Boolean(errorMessage);

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

	const shared = cnMerge("col-start-1 row-start-1 max-h-36 min-h-11", className);

	return (
		<div className="grid flex-1">
			<textarea
				value={value}
				id="nd-ai-input"
				{...restOfProps}
				className={cnMerge(
					`resize-none overflow-y-auto bg-transparent placeholder:text-fd-muted-foreground
					focus-visible:outline-none`,
					shared
				)}
			/>

			<div className={cnMerge(shared, "invisible break-all")}>{`${value?.toString() ?? ""}\n`}</div>
		</div>
	);
}

const StorageKeyInput = "__ai_search_input";
const InputChangeEvent = "ai-search-input-change";

const subscribeToInput = (callback: () => void) => {
	globalThis.addEventListener("storage", callback);
	globalThis.addEventListener(InputChangeEvent, callback);

	return () => {
		globalThis.removeEventListener("storage", callback);
		globalThis.removeEventListener(InputChangeEvent, callback);
	};
};

const getInputSnapshot = () => localStorage.getItem(StorageKeyInput) ?? "";
const getServerInputSnapshot = () => "";

export function AISearchInput(props: InferProps<"form">) {
	const { className, ...restOfProps } = props;
	const { sendMessage, status, stop } = useChatContext();

	const input = useSyncExternalStore(subscribeToInput, getInputSnapshot, getServerInputSnapshot);

	const isLoading = status === "streaming" || status === "submitted";

	const onStart = (event?: React.SyntheticEvent) => {
		event?.preventDefault();
		const message = input.trim();
		if (message.length === 0) return;

		void sendMessage({
			parts: [{ text: message, type: "text" }],
			role: "user",
		});
		localStorage.removeItem(StorageKeyInput);
		globalThis.dispatchEvent(new Event(InputChangeEvent));
	};

	useEffect(() => {
		if (isLoading) {
			document.querySelector<HTMLElement>("#nd-ai-input")?.focus();
		}
	}, [isLoading]);

	return (
		<form
			{...restOfProps}
			className={cnMerge("flex items-end gap-1 pe-2 pb-2", className)}
			onSubmit={onStart}
		>
			<AISearchInputPrimitive
				value={input}
				placeholder={isLoading ? "AI is answering..." : "Ask a question"}
				autoFocus={true}
				className="min-w-0 p-3"
				disabled={isLoading}
				onChange={(e) => {
					const value = e.target.value;
					localStorage.setItem(StorageKeyInput, value);
					globalThis.dispatchEvent(new Event(InputChangeEvent));
				}}
				onKeyDown={(event) => {
					if (!event.shiftKey && event.key === "Enter") {
						onStart(event);
					}
				}}
			/>

			{isLoading ?
				<button
					type="button"
					className={buttonVariants({
						className: "mb-1 shrink-0 gap-2 rounded-full transition-all",
						theme: "secondary",
					})}
					onClick={() => void stop()}
				>
					<Loader2 className="size-4 animate-spin text-fd-muted-foreground" />
					<p>Abort Answer</p>
				</button>
			:	<button
					type="submit"
					className={buttonVariants({
						className: "mb-1 size-9 shrink-0 rounded-full p-2.5 transition-all",
						theme: "primary",
					})}
					disabled={input.length === 0}
					aria-label="Send message"
				>
					<Send className="size-4" />
				</button>
			}
		</form>
	);
}

function AISearchMessagePrimitiveWithLinksTool(props: InferProps<"div"> & { message: AISearchUIMessage }) {
	const { message, ...restOfProps } = props;

	let markdown = "";

	let links: z.infer<typeof ProvideLinksToolSchema>["links"] = [];
	const searchCalls: Array<UIToolInvocation<SearchToolType>> = [];
	const sourceSearchCalls: Array<UIToolInvocation<SearchSourceToolType>> = [];

	// eslint-disable-next-line ts-eslint/no-unnecessary-condition, unicorn/no-unreadable-for-of-expression
	for (const part of message.parts ?? []) {
		if (part.type === "text") {
			markdown += part.text;
			continue;
		}

		if (part.type === "tool-provideLinks" && part.input) {
			links = (part.input as z.infer<typeof ProvideLinksToolSchema>).links;
		}

		if (part.type === "tool-search") {
			searchCalls.push(part);
		}

		if (part.type === "tool-searchSource") {
			sourceSearchCalls.push(part);
		}
	}

	const sourceResults = sourceSearchCalls.flatMap((call) =>
		call.state === "output-available" ?
			call.output.results.map((result) => ({ query: call.input.query, result }))
		:	[]
	);
	const documentationResults = searchCalls.flatMap((call) =>
		call.state === "output-available" ?
			call.output.results.map((result) => ({ query: call.input.query, result }))
		:	[]
	);
	const uniqueSourceResults: typeof sourceResults = [];
	const seenSourcePaths = new Set<string>();

	for (const item of sourceResults) {
		if (seenSourcePaths.has(item.result.path)) continue;
		seenSourcePaths.add(item.result.path);
		uniqueSourceResults.push(item);
		if (uniqueSourceResults.length === 4) break;
	}

	const uniqueDocumentationResults: typeof documentationResults = [];
	const seenDocumentationUrls = new Set<string>();

	for (const item of documentationResults) {
		if (seenDocumentationUrls.has(item.result.url)) continue;
		seenDocumentationUrls.add(item.result.url);
		uniqueDocumentationResults.push(item);
		if (uniqueDocumentationResults.length === 5) break;
	}

	const hasDocumentationSearchInProgress = searchCalls.some(
		(call) =>
			call.state !== "output-available"
			&& call.state !== "output-error"
			&& call.state !== "output-denied"
	);
	const failedDocumentationSearch = searchCalls.find(
		(call) => call.state === "output-error" || call.state === "output-denied"
	);
	const shouldShowDocumentationSearch =
		uniqueDocumentationResults.length > 0
		|| hasDocumentationSearchInProgress
		|| Boolean(failedDocumentationSearch);

	return (
		<div
			onClick={(event) => event.stopPropagation()}
			{...restOfProps}
			className={cnMerge(
				"min-w-0 space-y-2",
				message.role === "user"
					&& "ml-auto max-w-[92%] rounded-2xl rounded-br-sm bg-fd-secondary px-3 py-2.5",
				restOfProps.className
			)}
		>
			<p
				className={cnMerge(
					"text-[11px] font-semibold tracking-wide text-fd-muted-foreground uppercase",
					message.role === "assistant" && "text-fd-primary",
					message.role === "user" && "text-right"
				)}
			>
				{roleName[message.role] ?? "unknown"}
			</p>

			<div className="prose min-w-0 text-sm/relaxed wrap-break-word">
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

			{shouldShowDocumentationSearch && (
				<section
					className="mt-3 min-w-0 rounded-xl border border-fd-border/70 bg-fd-secondary/60 p-2.5
						text-xs text-fd-muted-foreground"
				>
					<p className="mb-2 flex items-center gap-2 font-medium">
						<SearchIcon className="size-3.5 text-fd-primary" />
						{getDocumentationSearchStatus(
							searchCalls,
							uniqueDocumentationResults.length,
							hasDocumentationSearchInProgress,
							failedDocumentationSearch
						)}
					</p>
					{uniqueDocumentationResults.length > 0 && (
						<div className="grid min-w-0 gap-2">
							{uniqueDocumentationResults.map(({ query, result }) => (
								<Link
									key={result.url}
									href={result.url}
									className="min-w-0 rounded-lg border bg-fd-background p-2.5 transition-colors
										hover:bg-fd-accent hover:text-fd-accent-foreground"
								>
									<p className="font-medium text-fd-foreground">{result.title}</p>
									<p className="mt-1 line-clamp-3 leading-relaxed">
										<HighlightedText text={result.snippet} query={query} />
									</p>
								</Link>
							))}
						</div>
					)}
				</section>
			)}

			{sourceSearchCalls.length > 0 && (
				<section
					className="mt-3 min-w-0 rounded-xl border border-fd-border/70 bg-fd-secondary/60 p-2.5
						text-xs text-fd-muted-foreground"
				>
					<p className="mb-2 flex items-center gap-2 font-medium">
						<SearchIcon className="size-3.5 text-fd-primary" />
						{getSourceSearchStatus(sourceSearchCalls, uniqueSourceResults.length)}
					</p>
					{uniqueSourceResults.length > 0 && (
						<div className="grid min-w-0 gap-2">
							{uniqueSourceResults.map(({ query, result }) => {
								const lines = result.snippet.split("\n").map((line, index) => ({
									line,
									lineNumber: result.startLine + index,
								}));

								return (
									<article
										key={result.path}
										className="min-w-0 overflow-hidden rounded-lg border bg-fd-background"
									>
										<Link
											href={result.url}
											target="_blank"
											rel="noreferrer noopener"
											className="flex min-w-0 items-center gap-2 px-2.5 py-2 text-fd-foreground
												transition-colors hover:bg-fd-accent"
										>
											<span className="min-w-0 flex-1 truncate font-medium">{result.path}</span>
											<span
												className="shrink-0 rounded-sm bg-fd-secondary px-1.5 py-0.5 font-mono
													text-[10px] text-fd-muted-foreground"
											>
												{result.startLine}-{result.endLine}
											</span>
											<ExternalLink
												aria-hidden="true"
												className="size-3.5 shrink-0 text-fd-muted-foreground"
											/>
										</Link>
										<details className="group border-t">
											<summary
												className="cursor-pointer list-none px-2.5 py-2
													[&::-webkit-details-marker]:hidden"
											>
												<span
													className="block max-h-12 overflow-hidden font-mono text-[11px]
														leading-[1.55] wrap-anywhere text-fd-muted-foreground"
												>
													{lines.slice(0, 3).map(({ line, lineNumber }) => (
														<span className="block whitespace-pre-wrap" key={lineNumber}>
															<HighlightedText text={line} query={query} />
														</span>
													))}
												</span>
												<span
													className="mt-1 flex items-center gap-1 text-[10px] font-medium
														text-fd-primary"
												>
													<span className="group-open:hidden">Show excerpt</span>
													<span className="hidden group-open:inline">Hide excerpt</span>
													<ChevronDown
														className="size-3 transition-transform group-open:rotate-180"
													/>
												</span>
											</summary>
											<div
												className="max-h-36 overflow-y-auto overscroll-contain border-t
													bg-fd-background/70 p-2"
											>
												<pre
													className="m-0 min-w-0 font-mono text-[11px] leading-[1.55]
														wrap-anywhere whitespace-pre-wrap text-fd-muted-foreground"
												>
													{lines.map(({ line, lineNumber }) => (
														<span className="block" key={lineNumber}>
															<HighlightedText text={line} query={query} />
														</span>
													))}
												</pre>
											</div>
										</details>
									</article>
								);
							})}
						</div>
					)}
				</section>
			)}
		</div>
	);
}

function HighlightedText(props: { query: string; text: string }) {
	const { query, text } = props;
	const matches = query.match(/[\w$.-]{2,}/g);

	if (!matches) {
		return text;
	}

	const terms = [...new Set(matches)].slice(0, 8);
	const matcher = new RegExp(terms.map((term) => escapeRegExp(term)).join("|"), "gi");
	const highlightedText: React.ReactNode[] = [];
	let cursor = 0;

	for (const match of text.matchAll(matcher)) {
		const start = match.index;
		const value = match[0];

		if (start > cursor) {
			highlightedText.push(text.slice(cursor, start));
		}

		highlightedText.push(
			<mark
				key={`${start}:${value}`}
				className="rounded-sm bg-amber-300/50 px-0.5 text-amber-950 dark:bg-amber-300/25 dark:text-amber-100"
			>
				{value}
			</mark>
		);
		cursor = start + value.length;
	}

	if (cursor === 0) {
		return text;
	}

	if (cursor < text.length) {
		highlightedText.push(text.slice(cursor));
	}

	return highlightedText;
}

const escapeRegExp = (value: string) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

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
			className={cnMerge(
				"fd-scroll-container flex min-h-0 min-w-0 flex-col overflow-x-hidden overflow-y-auto",
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

function getSearchCallStatus(call: UIToolInvocation<SearchToolType>) {
	if (call.state === "output-error" || call.state === "output-denied") {
		return call.errorText ?? "Documentation search failed";
	}

	if (call.state === "output-available") {
		return `${call.output.results.length} documentation sources`;
	}

	return "Searching documentation…";
}

function getDocumentationSearchStatus(
	calls: Array<UIToolInvocation<SearchToolType>>,
	resultCount: number,
	isSearching: boolean,
	failedCall: UIToolInvocation<SearchToolType> | undefined
) {
	if (isSearching) {
		return "Searching documentation…";
	}

	if (resultCount > 0) {
		return `${resultCount} documentation sources`;
	}

	if (failedCall) {
		return getSearchCallStatus(failedCall);
	}

	return calls.length > 0 ? "No documentation matches" : "Searching documentation…";
}

function getSourceSearchCallStatus(call: UIToolInvocation<SearchSourceToolType>) {
	if (call.state === "output-error" || call.state === "output-denied") {
		return call.errorText ?? "Source search failed";
	}

	if (call.state === "output-available") {
		return `${call.output.results.length} source excerpts`;
	}

	return "Searching CallApi source…";
}

function getSourceSearchStatus(calls: Array<UIToolInvocation<SearchSourceToolType>>, resultCount: number) {
	const pendingCall = calls.find(
		(call) =>
			call.state !== "output-available"
			&& call.state !== "output-error"
			&& call.state !== "output-denied"
	);

	if (pendingCall) {
		return getSourceSearchCallStatus(pendingCall);
	}

	if (resultCount > 0) {
		return `${resultCount} relevant code excerpts`;
	}

	const failedCall = calls.find(
		(call) => call.state === "output-error" || call.state === "output-denied"
	);

	return failedCall ? getSourceSearchCallStatus(failedCall) : "No relevant source matches";
}

export function AISearchRoot(props: { children: React.ReactNode }) {
	const { children } = props;

	const [open, setOpen] = useState(false);

	const chat = useChat<AISearchUIMessage>({
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
					`fixed inset-e-[calc(--spacing(4)+var(--removed-body-scroll-bar-size,0*1px))] bottom-4 z-20
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
						<AISearchMessagePrimitiveWithLinksTool key={item.id} message={item} />
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
					className="z-30 overflow-hidden bg-fd-card text-fd-card-foreground [--ai-chat-width:400px]
						data-[animation-phase=enter]:animate-fd-dialog-in
						data-[animation-phase=exit]:animate-fd-dialog-out max-lg:fixed max-lg:inset-x-2
						max-lg:inset-y-3 max-lg:rounded-2xl max-lg:border max-lg:shadow-xl lg:sticky lg:top-0
						lg:ms-auto lg:h-dvh lg:border-s lg:in-[#nd-docs-layout]:[grid-area:toc]
						lg:in-[#nd-notebook-layout]:col-start-5 lg:in-[#nd-notebook-layout]:row-span-full
						lg:data-[animation-phase=enter]:animate-[ask-ai-open_200ms]
						lg:data-[animation-phase=exit]:animate-[ask-ai-close_200ms] 2xl:[--ai-chat-width:460px]"
				>
					<div className="flex size-full min-h-0 flex-col p-2 lg:w-(--ai-chat-width) lg:p-3">
						<AISearchPanelHeader />
						<AISearchPanelList className="min-h-0 grow" />
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
