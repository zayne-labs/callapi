import fs from "node:fs/promises";
import type { ImageResponseOptions } from "next/server";
import type { ReactNode } from "react";
import { baseURL } from "@/lib/metadata";

export type GenerateProps = {
	description?: ReactNode;
	title: ReactNode;
};

// eslint-disable-next-line unicorn/prefer-top-level-await
const font = fs.readFile("./lib/og/JetBrainsMono-Regular.ttf").then(
	(data) =>
		({
			data,
			name: "Mono",
			weight: 400,
		}) as const
);

// eslint-disable-next-line unicorn/prefer-top-level-await
const fontBold = fs.readFile("./lib/og/JetBrainsMono-Bold.ttf").then(
	(data) =>
		({
			data,
			name: "Mono",
			weight: 600,
		}) as const
);

export const getImageResponseOptions = async (): Promise<ImageResponseOptions> => {
	return {
		fonts: await Promise.all([font, fontBold]),
		// format: "webp",
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
			src={new URL("/logo.png", baseURL).toString()}
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
					<span
						style={{
							fontSize: "46px",
							fontWeight: 600,
						}}
					>
						{siteName}
					</span>
				</div>
			</div>
		</div>
	);
};
