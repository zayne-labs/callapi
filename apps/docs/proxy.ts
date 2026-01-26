import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { NextRequest, NextResponse } from "next/server";

const llmMethods = rewritePath("/docs/*path", "/llms.mdx/*path");

export function proxy(request: NextRequest) {
	if (isMarkdownPreferred(request)) {
		const result = llmMethods.rewrite(request.nextUrl.pathname);

		return result ? NextResponse.rewrite(new URL(result, request.nextUrl)) : NextResponse.next();
	}

	return NextResponse.next();
}
