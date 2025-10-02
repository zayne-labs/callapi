"use client";

import { motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cnMerge } from "@/lib/utils/cn";

type GridPatternProps = {
	className?: string;
	duration?: number;
	height?: number;
	maxOpacity?: number;
	numSquares?: number;
	repeatDelay?: number;
	strokeDasharray?: number;
	width?: number;
	x?: number;
	y?: number;
};

export function GridPattern({
	className,
	duration = 4,
	height = 40,
	maxOpacity = 0.5,
	numSquares = 50,
	repeatDelay: _unusedRepeatDelay = 0.5,
	strokeDasharray = 0,
	width = 40,
	x = -1,
	y = -1,
	...props
}: GridPatternProps) {
	const id = useId();
	const containerRef = useRef<SVGSVGElement>(null);
	const [dimensions, setDimensions] = useState({ height: 0, width: 0 });
	const [squares, setSquares] = useState(() => generateSquares(numSquares));

	function getPos() {
		return [
			Math.floor((Math.random() * dimensions.width) / width),
			Math.floor((Math.random() * dimensions.height) / height),
		];
	}

	// Adjust the generateSquares function to return objects with an id, x, and y
	function generateSquares(count: number) {
		return Array.from({ length: count }, (_, i) => ({
			id: i,
			pos: getPos(),
		}));
	}

	// Function to update a single square's position
	const updateSquarePosition = (identifier: number) => {
		setSquares((currentSquares) =>
			currentSquares.map((sq) =>
				sq.id === identifier ?
					{
						...sq,
						pos: getPos(),
					}
				:	sq
			)
		);
	};

	// Update squares to animate in
	useEffect(() => {
		// eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler
		if (dimensions.width && dimensions.height) {
			setSquares(generateSquares(numSquares));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- Not my code
	}, [dimensions, numSquares]);

	// Resize observer to update container dimensions
	useEffect(() => {
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				setDimensions({
					height: entry.contentRect.height,
					width: entry.contentRect.width,
				});
			}
		});

		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		return () => {
			resizeObserver.disconnect();
		};
	}, [containerRef]);

	return (
		<svg
			ref={containerRef}
			aria-hidden="true"
			className={cnMerge(
				"pointer-events-none absolute inset-0 size-full fill-gray-400/30 stroke-gray-400/30",
				className
			)}
			{...props}
		>
			<defs>
				<pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
					<path d={`M.5 ${height}V.5H${width}`} fill="none" strokeDasharray={strokeDasharray} />
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill={`url(#${id})`} />
			<svg x={x} y={y} className="overflow-visible">
				{/* eslint-disable-next-line ts-eslint/no-shadow -- Not my code */}
				{squares.map(({ id, pos: [x, y] }, index) => (
					<motion.rect
						initial={{ opacity: 0 }}
						animate={{ opacity: maxOpacity }}
						transition={{
							delay: index * 0.1,
							duration,
							repeat: 1,
							repeatType: "reverse",
						}}
						onAnimationComplete={() => updateSquarePosition(id)}
						// eslint-disable-next-line react-x/no-array-index-key -- Not my code
						key={`${x}-${y}-${index}`}
						width={width - 1}
						height={height - 1}
						x={Number(x) * width + 1}
						y={Number(y) * height + 1}
						fill="currentColor"
						strokeWidth="0"
					/>
				))}
			</svg>
		</svg>
	);
}
