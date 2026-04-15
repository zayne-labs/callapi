import { callApi } from "@zayne-labs/callapi";
import { Image, Link } from "fumadocs-core/framework";
import { GithubInfo } from "fumadocs-ui/components/github-info";
import type { DocsLayoutProps } from "fumadocs-ui/layouts/docs";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { TagIcon } from "lucide-react";
import { z } from "zod";
import { IconBox } from "@/components/common";
import { Button } from "@/components/ui/button";
import { source } from "@/lib/source";
import logo from "@/public/logo.png";
import { packageName, packageScope, repoName, repoOwner } from "./github";

/**
 * Shared layout configurations
 */

export const getBaseOptions = () => {
	return {
		githubUrl: `https://github.com/${repoOwner}/${repoName}`,

		nav: {
			title: (
				<div className="flex items-center gap-3">
					<Image
						alt="CallApi"
						src={logo}
						width={18}
						height={18}
						className="size-4.5 rounded-[5px]"
						aria-label="CallApi"
					/>
					<p className="text-[20px] font-medium tracking-tight text-fd-foreground in-[header]:text-[15px]">
						CallApi
					</p>
				</div>
			),

			url: "/docs",
		},
	} satisfies BaseLayoutProps;
};

export const getDocsOptions = () => {
	const npmDataPromise = callApi(`https://registry.npmjs.org/${packageScope}/${packageName}/latest`, {
		extraFetchOptions: { next: { revalidate: 60 } },
		schema: { data: z.object({ version: z.string() }) },
	});

	const descriptionPromise = npmDataPromise.then((result) => `v${result.data?.version ?? "x.x.x"}`);

	const baseOptions = getBaseOptions();

	return {
		links: [
			{
				children: (
					<Button theme="link" asChild={true}>
						<Link href="/llms-full.txt" className="text-xs">
							<span className="size-4.5">
								<IconBox icon="material-symbols:robot-2-outline-rounded" className="size-full" />
							</span>
							LLMs.txt
						</Link>
					</Button>
				),
				type: "custom",
			},

			{
				children: <GithubInfo owner={repoOwner} repo={repoName} />,
				type: "custom",
			},
		],

		nav: {
			...baseOptions.nav,
			url: "/",
		},

		sidebar: {
			tabs: [
				{
					description: descriptionPromise,
					icon: (
						<span className="flex size-full items-center justify-center rounded-lg max-md:border max-md:bg-fd-primary/10 max-md:p-1.5">
							<TagIcon className="size-full text-fd-primary" />
						</span>
					),
					title: "Latest",
					url: "/docs",
				},
			],
		},

		tree: source.getPageTree(),
	} satisfies DocsLayoutProps;
};
