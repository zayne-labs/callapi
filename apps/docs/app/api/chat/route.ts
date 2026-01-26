import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToModelMessages, streamText } from "ai";
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

const systemPromptContext = getSystemPromptContext();
const documentationContextPromise = getDocumentationContext();
const sourceCodeContextPromise = getSourceCodeContext();

export async function POST(request: Request) {
	const [documentationContext, sourceCodeContext, userMessages] = await Promise.all([
		documentationContextPromise,
		sourceCodeContextPromise,
		request.json().then((json: Record<string, unknown>) =>
			convertToModelMessages(json.messages as never, {
				ignoreIncompleteToolCalls: true,
			})
		),
	]);

	const result = streamText({
		messages: [
			{
				content: systemPromptContext,
				role: "system",
			},
			{
				content: documentationContext,
				role: "system",
			},
			{
				content: sourceCodeContext,
				role: "system",
			},
			...userMessages,
		],
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
