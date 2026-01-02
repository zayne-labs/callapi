import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type ModelMessage } from "ai";
import { ProvideLinksToolSchema } from "@/lib/chat/ai-tools-schema";
import {
	getDocumentationContext,
	getSourceCodeContext,
	getSystemPromptContext,
} from "@/lib/chat/context-builder";

const google = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const maxDuration = 30;

const documentationContext = getDocumentationContext();
const sourceCodeContext = getSourceCodeContext();

export async function POST(req: Request) {
	const systemPromptContext = getSystemPromptContext();

	const reqJson = (await req.json()) as unknown as Record<string, unknown>;

	const initMessages = await convertToModelMessages(reqJson.messages as never, {
		ignoreIncompleteToolCalls: true,
	});

	const messages = [
		{
			content: systemPromptContext,
			role: "system",
		},
		{
			content: await documentationContext,
			role: "system",
		},
		{
			content: await sourceCodeContext,
			role: "system",
		},
		...initMessages,
	] as const satisfies ModelMessage[];

	const result = streamText({
		messages,
		model: google("gemini-3-flash-preview"),
		toolChoice: "auto",
		tools: {
			provideLinks: {
				inputSchema: ProvideLinksToolSchema,
			},
		},
	});

	return result.toUIMessageStreamResponse();
}
