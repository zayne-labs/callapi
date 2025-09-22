import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, type ModelMessage, streamText } from "ai";
import { ProvideLinksToolSchema } from "@/lib/chat/ai-tools-schema";
import { getDocumentationContext, getSystemPromptContext } from "@/lib/chat/context-builder";

const google = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const runtime = "edge";

export async function POST(req: Request) {
	const systemPromptContext = getSystemPromptContext();

	const [reqJson, documentationContext] = await Promise.all([
		req.json() as unknown as Record<string, unknown>,
		getDocumentationContext(),
	]);

	const { messages: userMessages } = reqJson;

	const initMessages = convertToModelMessages(userMessages as never, {
		ignoreIncompleteToolCalls: true,
	});

	const messages = [
		{
			content: systemPromptContext,
			role: "system",
		},
		{
			content: documentationContext,
			role: "system",
		},
		...initMessages,
	] as const satisfies ModelMessage[];

	const result = streamText({
		messages,

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
