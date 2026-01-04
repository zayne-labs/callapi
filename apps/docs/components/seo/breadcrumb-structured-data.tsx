import { baseURL } from "@/lib/metadata";

type BreadcrumbItem = {
	name: string;
	url: string;
};

type BreadcrumbStructuredDataProps = {
	items: BreadcrumbItem[];
};

export function BreadcrumbStructuredData(props: BreadcrumbStructuredDataProps) {
	const { items } = props;

	const structuredData = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			item: item.url.startsWith("http") ? item.url : `${baseURL}${item.url}`,
			name: item.name,
			position: index + 1,
		})),
	};

	return (
		<script
			type="application/ld+json"
			// eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(structuredData),
			}}
		/>
	);
}
