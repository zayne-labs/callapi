import Link from "next/link";
import { DocsIcon, GitHubIcon } from "@/components/icons";
import Ripple from "@/components/landing/ripple";
import { Button } from "@/components/ui/button";

export default function HomePage() {
	return (
		<main
			className="relative flex min-h-screen w-full items-center justify-center overflow-hidden
				rounded-lg border bg-fd-background p-20 md:shadow-xl"
		>
			<Ripple />
			<div className="z-10 flex flex-col items-center justify-center">
				<h1 className="mb-4 text-center text-5xl font-bold">CallApi</h1>

				<p className="mx-auto max-w-2xl text-center text-fd-muted-foreground">
					A lightweight, type-safe Fetch API wrapper with dozens of convenience features. Built for
					developers who want a better interface than bare Fetch for making HTTP requests.
				</p>

				<div className="flex w-full items-center justify-center gap-4 py-4">
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
