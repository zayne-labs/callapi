import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type ModelMessage } from "ai";
import { ProvideLinksToolSchema } from "@/lib/chat/ai-tools-schema";
import { getDocumentationContext, getSystemPromptContext } from "@/lib/chat/context-builder";

const google = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const runtime = "edge";

const systemPromptContext = getSystemPromptContext();
const documentationContextPromise = getDocumentationContext();

export async function POST(req: Request) {
	const reqJson = (await req.json()) as Record<string, unknown>;

	const initMessages = convertToModelMessages(reqJson.messages as never, {
		ignoreIncompleteToolCalls: true,
	});

	const messagesSystemContext = [
		{
			content: systemPromptContext,
			role: "system",
		},
		{
			content: await documentationContextPromise,
			role: "system",
		},
		...initMessages,
	] as const satisfies ModelMessage[];

	const result = streamText({
		messages: messagesSystemContext,
		model: google("gemini-2.5-flash"),
		toolChoice: "auto",
		tools: {
			provideLinks: {
				inputSchema: ProvideLinksToolSchema,
			},
		},
	});

	return result.toUIMessageStreamResponse();
}
