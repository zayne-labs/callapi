import type { Organization, WebSite, WithContext } from "schema-dts";
import { baseURL } from "@/lib/metadata";

type StructuredDataProps = {
	description?: string;
	title?: string;
	url?: string;
	variant: "organization" | "website";
};

const getStructuredData = (options: StructuredDataProps): WithContext<Organization | WebSite> => {
	const { description, title, url, variant } = options;

	const baseData = {
		"@context": "https://schema.org",
	} as const;

	switch (variant) {
		case "organization": {
			return {
				...baseData,
				"@type": "Organization",
				description: "A lightweight, type-safe Fetch API wrapper with dozens of convenience features.",
				logo: `${baseURL}logo.png`,
				name: "CallApi",
				sameAs: [
					"https://github.com/zayne-labs/callapi",
					"https://www.npmjs.com/package/@zayne-labs/callapi",
				],
				url: baseURL.toJSON(),
			};
		}

		case "website": {
			return {
				...baseData,
				"@type": "WebSite",
				author: {
					"@type": "Organization",
					name: "Zayne Labs",
					url: "https://github.com/zayne-labs",
				},
				description:
					description ?? "Documentation for CallApi - A lightweight, type-safe Fetch API wrapper",
				headline: title ?? "CallApi Documentation",
				mainEntityOfPage: {
					"@id": url ?? baseURL.toString(),
					"@type": "WebPage",
				},
				publisher: {
					"@type": "Organization",
					name: "Zayne Labs",
					url: "https://github.com/zayne-labs",
				},
				url: url ?? baseURL.toString(),
			};
		}

		default: {
			variant satisfies never;
			// eslint-disable-next-line ts-eslint/restrict-template-expressions
			throw new Error(`Invalid variant: ${variant}`);
		}
	}
};

export function StructuredData(props: StructuredDataProps) {
	return (
		<script
			type="application/ld+json"
			// eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(getStructuredData(props)),
			}}
		/>
	);
}
