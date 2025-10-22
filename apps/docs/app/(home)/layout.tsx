import type { WebSite, WithContext } from "schema-dts";

const jsonLd: WithContext<WebSite> = {
	"@context": "https://schema.org",
	"@type": "WebSite",
	image: "https://zayne-labs-callapi.netlify.app/og.png",
	name: "CallApi",
	url: "https://zayne-labs-callapi.netlify.app",
};

function HomeLayout(props: LayoutProps<"/">) {
	const { children } = props;

	return (
		<>
			{/* eslint-disable-next-line react-dom/no-dangerously-set-innerhtml -- It's fine  */}
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

			{children}
		</>
	);
}

export default HomeLayout;
