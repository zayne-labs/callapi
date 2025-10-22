import type { ImageResponseOptions } from "@takumi-rs/image-response";
import type { ReactNode } from "react";
import fs from "node:fs/promises";
import { baseURL } from "@/lib/metadata";

export type GenerateProps = {
	description?: ReactNode;
	title: ReactNode;
};

const font = fs.readFile("./lib/og/JetBrainsMono-Regular.ttf");
const fontBold = fs.readFile("./lib/og/JetBrainsMono-Bold.ttf");

export const getImageResponseOptions = async (): Promise<ImageResponseOptions> => {
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
		format: "webp",
		height: 630,
		width: 1200,
	};
};

export const generate = (props: GenerateProps) => {
	const { description, title } = props;

	const siteName = "CallApi";
	const primaryTextColor = "rgb(240,240,240)";

	const logo = (
		// eslint-disable-next-line nextjs/no-img-element
		<img
			alt="CallApi"
			src={`${baseURL}/logo.png`}
			width={60}
			height={60}
			style={{
				borderRadius: "5px",
			}}
		/>
	);

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
				<span
					style={{
						fontSize: "76px",
						fontWeight: 600,
					}}
				>
					{title}
				</span>
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
						{siteName}
					</p>
				</div>
			</div>
		</div>
	);
};
