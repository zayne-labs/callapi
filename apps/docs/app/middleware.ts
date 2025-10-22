import { NextRequest, NextResponse } from "next/server";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";

const llmMethods = rewritePath("/docs/*path", "/llms.mdx/*path");

export function middleware(request: NextRequest) {
	if (!isMarkdownPreferred(request)) {
		return NextResponse.next();
	}

	const result = llmMethods.rewrite(request.nextUrl.pathname);

	if (!result) return;

	return NextResponse.rewrite(new URL(result, request.nextUrl));
}
