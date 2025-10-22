import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { NextRequest, NextResponse } from "next/server";

const llmMethods = rewritePath("/docs/*path", "/llms.mdx/*path");

export function proxy(request: NextRequest) {
	if (!isMarkdownPreferred(request)) {
		return NextResponse.next();
	}

	const result = llmMethods.rewrite(request.nextUrl.pathname);

	if (!result) return;

	return NextResponse.rewrite(new URL(result, request.nextUrl));
}
