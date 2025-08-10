import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText } from "ai";
import { ProvideLinksToolSchema } from "@/lib/chat/inkeep-qa-schema";

export const runtime = "edge";

const openai = createOpenAICompatible({
	apiKey: process.env.INKEEP_API_KEY,
	baseURL: "https://api.inkeep.com/v1",
	name: "inkeep",
});

export async function POST(req: Request) {
	const reqJson = (await req.json()) as Record<string, unknown>;

	const result = streamText({
		messages: convertToModelMessages(reqJson.messages as never, {
			ignoreIncompleteToolCalls: true,
		}),
		model: openai("inkeep-qa-sonnet-4"),
		toolChoice: "auto",
		tools: {
			provideLinks: {
				inputSchema: ProvideLinksToolSchema,
			},
		},
	});

	return result.toUIMessageStreamResponse();
}
