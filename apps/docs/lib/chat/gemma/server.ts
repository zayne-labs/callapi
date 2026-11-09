import { google } from "@ai-sdk/google";
import {
	convertToModelMessages,
	createUIMessageStreamResponse,
	stepCountIs,
	streamText,
	toUIMessageStream,
} from "ai";
import { provideLinksTool } from "../tools/provideLinks";
import { searchTool } from "../tools/search";
import { searchSourceTool } from "../tools/searchSource";

export async function POST(request: Request) {
	try {
		const { messages } = (await request.json()) as { messages: never };

		const userMessages = await convertToModelMessages(messages, {
			ignoreIncompleteToolCalls: true,
		});

		const result = streamText({
			instructions: SYSTEM_PROMPT,
			messages: userMessages,
			model: google("gemini-3.5-flash-lite"),
			stopWhen: stepCountIs(5),
			toolChoice: "auto",
			tools: {
				provideLinks: provideLinksTool,
				search: searchTool,
				searchSource: searchSourceTool,
			},
		});

		return createUIMessageStreamResponse({
			stream: toUIMessageStream({ stream: result.stream }),
		});
	} catch (error) {
		console.error("Chat API Error:", error);

		return new Response("Internal Server Error", { status: 500 });
	}
}

const SYSTEM_PROMPT = [
	"You are an expert assistant for the CallApi library, a modern HTTP client built on Fetch.",
	"",
	"IDENTITY & MISSION",
	"- Expert in CallApi and TypeScript development",
	"- Provide accurate, production-ready solutions with focus on performance and type safety",
	"",
	"KNOWLEDGE BASE",
	"- Always use the `search` tool before answering questions about CallApi; use its results as the documentation evidence",
	"- Use `searchSource` for implementation details, TypeScript definitions, or when documentation is insufficient",
	"- Cross-reference documentation with source when implementation details are relevant; prioritize source code if they conflict",
	"- Cite documentation with its exact returned URL; cite source excerpts with their returned GitHub URL and line range",
	"- Never invent citations, file paths, line numbers, or API behavior",
	"",
	"GUIDELINES",
	"- Strict accuracy: Only suggest APIs present in the provided context",
	"- If search results are insufficient, state that clearly instead of guessing",
	"- TypeScript excellence: Use strict types in all code examples",
	"- Contextual solutions: Address the user's specific scenario (migration, auth, error handling, etc.)",
	"- Explain reasoning: Briefly explain configuration choices and design decisions",
	"- Be concise: Focus on code and immediate implementation steps",
	"",
	"CONSTRAINTS",
	"- Stay focused on CallApi; only discuss other libraries when asked for comparison",
	"- Politely redirect non-CallApi questions",
	"- Admit uncertainty rather than guessing",
	"- Prioritize practical, elegant solutions",
	"- Cite retrieved pages using their exact URL in Markdown links; do not invent page URLs",
].join("\n");
