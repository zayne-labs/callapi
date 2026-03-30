"use client";

import { motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cnMerge } from "@/lib/utils/cn";

type GridProps = {
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

export function Grid(props: GridProps) {
	const {
		className,
		duration = 4,
		height = 40,
		maxOpacity = 0.5,
		numSquares = 50,
		strokeDasharray = 0,
		width = 40,
		x = -1,
		y = -1,
		...restOfProps
	} = props;

	const uniqueId = useId();
	const containerRef = useRef<SVGSVGElement>(null);
	const [dimensions, setDimensions] = useState({ height: 0, width: 0 });
	function getPos() {
		return [
			Math.floor((Math.random() * dimensions.width) / width),
			Math.floor((Math.random() * dimensions.height) / height),
		];
	}

	// Adjust the generateSquares function to return objects with an id, x, and y
	const generateSquares = (count: number) => {
		return Array.from({ length: count }, (_, i) => ({
			id: i,
			pos: getPos(),
		}));
	};

	const [squares, setSquares] = useState(() => generateSquares(numSquares));

	// Function to update a single square's position
	const updateSquarePosition = (id: number) => {
		setSquares((currentSquares) =>
			currentSquares.map((sq) =>
				sq.id === id ?
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
			// eslint-disable-next-line react-you-might-not-need-an-effect/no-derived-state, react-x/set-state-in-effect
			setSquares(generateSquares(numSquares));
		}
		// eslint-disable-next-line react-x/exhaustive-deps
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

		containerRef.current && resizeObserver.observe(containerRef.current);

		return () => {
			resizeObserver.disconnect();
		};
	}, [containerRef]);

	return (
		<svg
			ref={containerRef}
			aria-hidden="true"
			className={cnMerge(
				`pointer-events-none absolute inset-0 size-full fill-gray-400/20 stroke-gray-400/20
				dark:fill-gray-600/20 dark:stroke-gray-600/20`,
				className
			)}
			{...restOfProps}
		>
			<defs>
				<pattern id={uniqueId} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
					<path d={`M.5 ${height}V.5H${width}`} fill="none" strokeDasharray={strokeDasharray} />
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill={`url(#${uniqueId})`} />
			<svg x={x} y={y} className="overflow-visible">
				{squares.map(({ id, pos: [posX, posY] }, index) => (
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
						// eslint-disable-next-line react-x/no-array-index-key
						key={`${posX}-${posY}-${index}`}
						width={width - 1}
						height={height - 1}
						x={(posX as number) * width + 1}
						y={(posY as number) * height + 1}
						fill="currentColor"
						strokeWidth="0"
					/>
				))}
			</svg>
		</svg>
	);
}
