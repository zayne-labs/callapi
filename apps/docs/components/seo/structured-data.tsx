import { baseURL } from "@/lib/metadata";

type StructuredDataProps = {
	description?: string;
	title?: string;
	type?: "documentation" | "organization" | "software";
	url?: string;
};

const getStructuredData = (options: StructuredDataProps) => {
	const { description, title, type, url } = options;

	const baseData = {
		"@context": "https://schema.org",
	};

	switch (type) {
		case "documentation": {
			return {
				...baseData,
				"@type": "TechArticle",
				author: {
					"@type": "Organization",
					name: "Zayne Labs",
					url: "https://github.com/zayne-labs",
				},
				description:
					description ?? "Documentation for CallApi - A lightweight, type-safe Fetch API wrapper",
				headline: title ?? "CallApi Documentation",
				mainEntityOfPage: {
					"@id": url ?? baseURL,
					"@type": "WebPage",
				},
				publisher: {
					"@type": "Organization",
					name: "Zayne Labs",
					url: "https://github.com/zayne-labs",
				},
				url: url ?? baseURL,
			};
		}

		case "organization": {
			return {
				...baseData,
				"@type": "Organization",
				description: "A lightweight, type-safe Fetch API wrapper with dozens of convenience features.",
				logo: `${baseURL}/logo.png`,
				name: "CallApi",
				sameAs: [
					"https://github.com/zayne-labs/callapi",
					"https://www.npmjs.com/package/@zayne-labs/callapi",
				],
				url: baseURL,
			};
		}

		case "software": {
			return {
				...baseData,
				"@type": "SoftwareApplication",
				applicationCategory: "DeveloperApplication",
				author: {
					"@type": "Organization",
					name: "Zayne Labs",
					url: "https://github.com/zayne-labs",
				},
				description: "A lightweight, type-safe Fetch API wrapper with dozens of convenience features.",
				downloadUrl: "https://www.npmjs.com/package/@zayne-labs/callapi",
				name: "CallApi",
				operatingSystem: "Any",
				programmingLanguage: "TypeScript",
				url: baseURL,
			};
		}

		default: {
			return baseData;
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
