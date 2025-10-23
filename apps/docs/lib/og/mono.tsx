import type { ImageResponseOptions } from "next/server";
import fs from "node:fs/promises";
import type { ReactNode } from "react";

export type GenerateProps = {
	description?: ReactNode;
	logo?: ReactNode;
	site?: ReactNode;
	title: ReactNode;
};

const font = fs.readFile("./lib/og/JetBrainsMono-Regular.ttf");
const fontBold = fs.readFile("./lib/og/JetBrainsMono-Bold.ttf");

export async function getImageResponseOptions(): Promise<ImageResponseOptions> {
	const [fontResult, fontBoldResult] = await Promise.all([font, fontBold]);

	return {
		fonts: [
			{
				data: fontResult,
				name: "Mono",
				weight: 400,
			},
			{
				data: fontBoldResult,
				name: "Mono",
				weight: 600,
			},
		],
		height: 630,
		width: 1200,
	};
}

export function generate({ description, logo, site = "My App", title }: GenerateProps) {
	const primaryTextColor = "rgb(240,240,240)";

	return (
		<div
			style={{
				backgroundColor: "rgb(10,10,10)",
				color: "white",
				display: "flex",
				flexDirection: "column",
				height: "100%",
				width: "100%",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					height: "100%",
					padding: "4rem",
					width: "100%",
				}}
			>
				<p
					style={{
						fontSize: "76px",
						fontWeight: 600,
					}}
				>
					{title}
				</p>
				<p
					style={{
						color: "rgba(240,240,240,0.7)",
						fontSize: "48px",
					}}
				>
					{description}
				</p>
				<div
					style={{
						alignItems: "center",
						color: primaryTextColor,
						display: "flex",
						flexDirection: "row",
						gap: "24px",
						marginTop: "auto",
					}}
				>
					{logo}
					<p
						style={{
							fontSize: "46px",
							fontWeight: 600,
						}}
					>
						{site}
					</p>
				</div>
			</div>
		</div>
	);
}
