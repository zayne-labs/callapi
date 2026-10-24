import { Link } from "fumadocs-core/link";
import { source } from "@/lib/source";

function getSuggestions(slug: string[]) {
	const query = slug
		.join(" ")
		.toLowerCase()
		.replaceAll(/[-_/]+/g, " ")
		.trim();

	if (!query) {
		return [];
	}

	const terms = query.split(/\s+/);

	return source
		.getPages()
		.map((page) => {
			const title = page.data.title.toLowerCase();
			const path = page.slugs
				.join(" ")
				.toLowerCase()
				.replaceAll(/[-_/]+/g, " ");
			const searchable = `${title} ${path}`;
			const matchedTerms = terms.filter((term) => searchable.includes(term)).length;

			return {
				page,
				score: (path.includes(query) ? terms.length : matchedTerms) / terms.length,
			};
		})
		.filter(({ score }) => score > 0)
		.toSorted((a, b) => b.score - a.score || a.page.data.title.localeCompare(b.page.data.title))
		.slice(0, 4)
		.map(({ page }) => page);
}

export function DocsNotFound({ slug }: { slug: string[] }) {
	const suggestions = getSuggestions(slug);

	return (
		<section className="flex flex-col items-center gap-4 py-16 text-center">
			<h1 className="text-3xl font-semibold">Page not found</h1>
			<p className="max-w-lg text-fd-muted-foreground">We couldn't find that documentation page.</p>

			{suggestions.length > 0 ?
				<div className="flex flex-col gap-2">
					<p className="text-sm text-fd-muted-foreground">Maybe you were looking for:</p>
					{suggestions.map((page) => (
						<Link
							key={page.url}
							href={page.url}
							className="text-fd-primary underline underline-offset-4"
						>
							{page.data.title}
						</Link>
					))}
				</div>
			:	null}
			<Link href="/docs" className="text-sm text-fd-primary underline underline-offset-4">
				Return to documentation
			</Link>
		</section>
	);
}
