import { readFileSync } from "node:fs";
import { notFound } from "next/navigation";
import { generateOGImage } from "@/app/og/[...slug]/og";
import { source } from "@/lib/source";

const font = readFileSync("./app/og/[...slug]/JetBrainsMono-Regular.ttf");
const fontBold = readFileSync("./app/og/[...slug]/JetBrainsMono-Bold.ttf");

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
	const { slug } = await params;
	const page = source.getPage(slug.slice(0, -1));

	if (!page) notFound();

	return generateOGImage({
		description: page.data.description,
		fonts: [
			{
				data: font,
				name: "Mono",
				weight: 400,
			},
			{
				data: fontBold,
				name: "Mono",
				weight: 600,
			},
		],
		primaryTextColor: "rgb(240,240,240)",
		title: page.data.title,
	});
}

export function generateStaticParams(): Array<{
	slug: string[];
}> {
	return source.generateParams().map((page) => ({
		...page,
		slug: [...page.slug, "image.png"],
	}));
}
