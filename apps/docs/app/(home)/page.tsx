"use client";

import Link from "fumadocs-core/link";
import { Ripple } from "@/components/common/Ripple";
import { DocsIcon, GitHubIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

export default function HomePage() {
	return (
		<main
			className="relative isolate flex h-svh w-full items-center justify-center overflow-hidden
				rounded-lg border bg-fd-background px-20 md:shadow-xl"
		>
			<Ripple />
			<div className="flex flex-col items-center justify-center gap-4">
				<h1 className="text-center text-[48px] font-bold">CallApi</h1>

				<p className="max-w-[670px] text-center text-fd-muted-foreground">
					A lightweight, type-safe Fetch API wrapper with dozens of convenience features. Built for
					developers who want a better interface than bare Fetch for making HTTP requests.
				</p>

				<div className="flex items-center gap-4">
					<Button className="flex gap-2" size="home-default" asChild={true}>
						<Link href="/docs">
							<DocsIcon />
							Docs
						</Link>
					</Button>

					<Button className="flex gap-2" theme="secondary" size="home-default" asChild={true}>
						<Link href="https://github.com/zayne-labs/callapi">
							<GitHubIcon />
							Github
						</Link>
					</Button>
				</div>
			</div>
		</main>
	);
}
