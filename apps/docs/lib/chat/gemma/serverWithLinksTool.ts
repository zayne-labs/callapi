import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText } from "ai";
import { getDocumentationContext, getSourceCodeContext } from "../context/context-builder";
import { provideLinksTool } from "../tools/provideLinks";

export async function POST(request: Request) {
	try {
		const { messages } = (await request.json()) as { messages: never };

		const [userMessages, documentationContext, sourceCodeContext] = await Promise.all([
			convertToModelMessages(messages, { ignoreIncompleteToolCalls: true }),
			getDocumentationContext(),
			getSourceCodeContext(),
		]);

		const result = streamText({
			messages: [
				{ content: SYSTEM_PROMPT, role: "system" },
				{ content: documentationContext, role: "system" },
				{ content: sourceCodeContext, role: "system" },
				...userMessages,
			],
			model: google("gemini-2.5-flash"),
			toolChoice: "auto",
			tools: {
				provideLinks: provideLinksTool,
			},
		});

		return result.toUIMessageStreamResponse();
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
	"- Documentation context: High-level features, installation, and usage patterns",
	"- Source code context: Authoritative implementation details and TypeScript definitions",
	"- Always cross-reference both sources; prioritize source code when conflicts arise",
	"",
	"GUIDELINES",
	"- Strict accuracy: Only suggest APIs present in the provided context",
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
].join("\n");
