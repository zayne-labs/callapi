import { callApi } from "@zayne-labs/callapi";
import { GithubInfo } from "fumadocs-ui/components/github-info";
import type { DocsLayoutProps } from "fumadocs-ui/layouts/docs";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { TagIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import logoImage from "public/logo.png";
import { z } from "zod";
import { IconBox } from "@/components/common";
import { Button } from "@/components/ui/button";
import { source } from "@/lib/source";
import { packageName, packageScope, repoName, repoOwner } from "./github";

/**
 * Shared layout configurations
 *

 */

export const baseOptions = () => {
	return {
		githubUrl: `https://github.com/${repoOwner}/${repoName}`,
		nav: {
			title: (
				<>
					<Image
						alt="CallApi"
						src={logoImage as unknown as string}
						width={18}
						height={18}
						className="rounded-[5px]"
						aria-label="CallApi"
					/>
					<p className="font-medium in-[header]:text-[15px]">CallApi</p>
				</>
			),
			transparentMode: "top",
			url: "/docs",
		},
	} satisfies BaseLayoutProps;
};

export const docsOptions = () => {
	const npmDataPromise = callApi(`https://registry.npmjs.org/${packageScope}/${packageName}/latest`, {
		schema: {
			data: z.object({ version: z.string() }),
		},
	});

	const descriptionPromise = npmDataPromise.then((result) => `v${result.data?.version ?? "*.*.*"}`);

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
			title: (
				<>
					<Image
						alt="CallApi"
						src={logoImage as unknown as string}
						width={18}
						height={18}
						className="rounded-[5px]"
						aria-label="CallApi"
					/>
					<p className="font-medium in-[header]:text-[15px]">CallApi</p>
				</>
			),

			transparentMode: "top",
		},

		sidebar: {
			tabs: [
				{
					description: descriptionPromise,
					icon: (
						<div className="grid size-full place-items-center rounded-lg max-md:border max-md:bg-fd-primary/10 max-md:p-1.5">
							<TagIcon className="size-full text-fd-primary" />
						</div>
					),
					title: "Latest",
					url: "/docs",
				},
			],
		},

		tree: source.getPageTree(),
	} satisfies DocsLayoutProps;
};
