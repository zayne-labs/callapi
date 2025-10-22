import { LLMCopyButton, ViewOptions } from "@/components/ai/page-actions";
import { getMDXComponents } from "@/components/common";
import { owner, repo } from "@/lib/github";
import { createMetadata } from "@/lib/metadata";
import { source } from "@/lib/source";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 86400;

export default async function Page({ params }: PageProps<"/docs/[[...slug]]">) {
	const { slug } = await params;

	const page = source.getPage(slug);

	if (!page) {
		notFound();
	}

	const MDX = page.data.body;

	return (
		<DocsPage
			toc={page.data.toc}
			tableOfContent={{
				single: false,
				style: "clerk",
			}}
			editOnGithub={{
				owner: "zayne-labs",
				path: `apps/docs/content/docs/${page.path}`,
				repo: "callapi",
				sha: "main",
			}}
			full={page.data.full}
		>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription className="mb-0">{page.data.description}</DocsDescription>
			<DocsBody>
				<div className="flex flex-row items-center gap-2 border-b pt-2 pb-6">
					<LLMCopyButton markdownUrl={`${page.url}.mdx`} />
					<ViewOptions
						markdownUrl={`${page.url}.mdx`}
						githubUrl={`https://github.com/${owner}/${repo}/blob/main/apps/docs/content/docs/${page.path}`}
					/>
				</div>
				<MDX components={getMDXComponents()} />
			</DocsBody>
		</DocsPage>
	);
}

export async function generateMetadata({ params }: PageProps<"/docs/[[...slug]]">): Promise<Metadata> {
	const { slug = [] } = await params;

	const page = source.getPage(slug);

	if (!page) {
		notFound();
	}

	const description =
		page.data.description
		?? "A lightweight, type-safe Fetch API wrapper with dozens of convenience features.";

	const image = {
		height: 630,
		url: ["/og", ...slug, "image.png"].join("/"),
		width: 1200,
	};

	return createMetadata({
		description,
		keywords: ["fetch", "api", "wrapper", "request", "cancel", "retry", "interceptor", "callapi"],
		openGraph: {
			images: [image],
			url: `/docs/${page.slugs.join("/")}`,
		},
		title: page.data.title,
		twitter: {
			images: [image],
		},
	});
}

export function generateStaticParams() {
	return source.generateParams();
}
