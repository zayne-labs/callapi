import { getLLMText } from "@/lib/get-llm-text";
import { source } from "@/lib/source";

export const revalidate = false;

export async function GET() {
	const scan = source.getPages().map((element) => getLLMText(element));

	const scanned = await Promise.all(scan);

	return new Response(scanned.join("\n\n"));
}
