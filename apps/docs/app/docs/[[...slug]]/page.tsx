import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
	PageLastUpdate,
} from "fumadocs-ui/layouts/notebook/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LLMCopyButton, ViewOptions } from "@/components/ai/page-actions";
import { getMDXComponents } from "@/components/common";
import { EditOnGithub } from "@/components/common/EditOnGithub";
import { owner, repo } from "@/lib/github";
import { createMetadata } from "@/lib/metadata";
import { getPageImage, source } from "@/lib/source";

export const revalidate = 86400;

async function Page({ params }: PageProps<"/docs/[[...slug]]">) {
	const { slug } = await params;

	const page = source.getPage(slug);

	if (!page) {
		notFound();
	}

	const MDX = page.data.body;

	const lastModified = page.data.lastModified;

	const githubURL = `https://github.com/${owner}/${repo}/blob/main/apps/docs/content/docs/${page.path}`;

	return (
		<DocsPage
			toc={page.data.toc}
			tableOfContent={{
				single: false,
				style: "clerk",
			}}
			full={page.data.full}
		>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription className="mb-0">{page.data.description}</DocsDescription>
			<DocsBody>
				<div className="flex flex-row items-center gap-2 border-b pt-2 pb-6">
					<LLMCopyButton markdownURL={`${page.url}.mdx`} />
					<ViewOptions markdownURL={`${page.url}.mdx`} githubURL={githubURL} />
				</div>
				<MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
			</DocsBody>

			<EditOnGithub gitHubURL={githubURL} />

			{lastModified && <PageLastUpdate date={lastModified} />}
		</DocsPage>
	);
}

export default Page;

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
		url: getPageImage(page).url,
		width: 1200,
	} satisfies NonNullable<Metadata["openGraph"]>["images"];

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
