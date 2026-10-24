import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { NextRequest, NextResponse } from "next/server";

const llmMethods = rewritePath("/docs/*path", "/llms.mdx/*path");
const mdxMethods = rewritePath("/docs{/*path}.mdx", "/llms.mdx{/*path}");

export function proxy(request: NextRequest) {
	const mdxResult = mdxMethods.rewrite(request.nextUrl.pathname);

	if (mdxResult) {
		return NextResponse.rewrite(new URL(mdxResult, request.nextUrl));
	}

	if (isMarkdownPreferred(request)) {
		const llmResult = llmMethods.rewrite(request.nextUrl.pathname);

		if (llmResult) {
			return NextResponse.rewrite(new URL(llmResult, request.nextUrl), {
				headers: { Vary: "Accept" },
			});
		}
	}

	return NextResponse.next();
}
