import { LucideEdit } from "lucide-react";

function EditOnGithub(props: { gitHubURL: string }) {
	const { gitHubURL } = props;

	return (
		<a
			href={gitHubURL}
			rel="noreferrer noopener"
			target="_blank"
			className="inline-flex w-fit items-center gap-1.5 rounded-xl border bg-fd-secondary p-2 text-sm
				font-medium text-fd-secondary-foreground transition-colors hover:bg-fd-accent
				hover:text-fd-accent-foreground"
		>
			<LucideEdit className="size-3" />
			Edit on GitHub
		</a>
	);
}

export { EditOnGithub };
