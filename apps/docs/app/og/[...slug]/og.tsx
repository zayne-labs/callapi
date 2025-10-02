import type { ImageResponseOptions } from "next/dist/compiled/@vercel/og/types";
import { ImageResponse } from "next/og";
import type { ReactElement, ReactNode } from "react";
import { baseURL } from "@/lib/metadata";

type GenerateProps = {
	description?: ReactNode;
	primaryTextColor?: string;
	title: ReactNode;
};

export function generateOGImage(options: GenerateProps & ImageResponseOptions): ImageResponse {
	const { description, primaryTextColor, title, ...rest } = options;

	return new ImageResponse(
		generate({
			description,
			primaryTextColor,
			title,
		}),
		{
			height: 630,
			width: 1200,
			...rest,
		}
	);
}

export function generate(props: GenerateProps): ReactElement {
	const { primaryTextColor = "rgb(255,150,255)", ...restOfProps } = props;

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
					{restOfProps.title}
				</p>
				<p
					style={{
						color: "rgba(240,240,240,0.7)",
						fontSize: "48px",
					}}
				>
					{restOfProps.description}
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
					{/* eslint-disable-next-line nextjs/no-img-element -- Image component doesn't work here */}
					<img
						alt="CallApi"
						src={`${baseURL}/logo.png`}
						width={60}
						height={60}
						style={{
							borderRadius: "5px",
						}}
					/>
					<p
						style={{
							fontSize: "46px",
							fontWeight: 600,
						}}
					>
						CallApi
					</p>
				</div>
			</div>
		</div>
	);
}
