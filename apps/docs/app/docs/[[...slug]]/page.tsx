import Link from "fumadocs-core/link";
import { PathUtils } from "fumadocs-core/source";
import * as Twoslash from "fumadocs-twoslash/ui";
import * as Tabs from "fumadocs-ui/components/tabs";
import * as TypeTable from "fumadocs-ui/components/type-table";
import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
	PageLastUpdate,
} from "fumadocs-ui/layouts/notebook/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LLMCopyButton, ViewOptions } from "@/components/ai/page-actions";
import { getMDXComponents } from "@/components/common";
import { EditOnGithub } from "@/components/common/EditOnGithub";
import { HoverCard } from "@/components/ui";
import { owner, repo } from "@/lib/github";
import { createMetadata, defaultDescription } from "@/lib/metadata";
import { getPageImage, source } from "@/lib/source";

export const revalidate = 86400;

async function Page({ params }: PageProps<"/docs/[[...slug]]">) {
	const { slug } = await params;

	const page = source.getPage(slug);

	if (!page) {
		return notFound();
	}

	const { body: MDX, lastModified, toc } = await page.data.load();

	const githubURL = `https://github.com/${owner}/${repo}/blob/main/apps/docs/content/docs/${page.path}`;

	return (
		<DocsPage
			toc={toc}
			tableOfContent={{
				style: "clerk",
			}}
			full={page.data.full}
		>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription className="mb-0">{page.data.description}</DocsDescription>

			<div className="flex flex-row items-center gap-2 border-b pt-2 pb-6">
				<LLMCopyButton markdownURL={`${page.url}.mdx`} />
				<ViewOptions markdownURL={`${page.url}.mdx`} githubURL={githubURL} />
			</div>

			<DocsBody>
				<MDX
					components={getMDXComponents({
						...Twoslash,
						...Tabs,
						...TypeTable,
						a: ({ children, href, ...restOfProps }) => {
							const foundPage = source.getPageByHref(href ?? "", {
								dir: PathUtils.dirname(page.path),
							});

							if (!foundPage) {
								return (
									<Link href={href} {...restOfProps}>
										{children}
									</Link>
								);
							}

							return (
								<HoverCard.Root>
									<HoverCard.Trigger
										href={
											foundPage.hash ?
												`${foundPage.page.url}#${foundPage.hash}`
											:	foundPage.page.url
										}
										{...restOfProps}
									>
										{children}
									</HoverCard.Trigger>

									<HoverCard.Content>
										<p className="font-medium">{foundPage.page.data.title}</p>
										<p className="text-fd-muted-foreground">{foundPage.page.data.description}</p>
									</HoverCard.Content>
								</HoverCard.Root>
							);
						},
					})}
				/>
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
		return notFound();
	}

	const description = page.data.description ?? defaultDescription;

	const image = {
		height: 630,
		url: getPageImage(page).url,
		width: 1200,
	} satisfies NonNullable<Metadata["openGraph"]>["images"];

	return createMetadata({
		description,
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
