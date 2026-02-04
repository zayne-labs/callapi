import { memo } from "react";

type RippleProps = {
	mainCircleOpacity?: number;
	mainCircleSize?: number;
	numCircles?: number;
};

function Ripple(props: RippleProps) {
	const { mainCircleOpacity = 0.2, mainCircleSize = 310, numCircles = 20 } = props;

	return (
		<div
			className="absolute inset-0 overflow-hidden bg-white/5
				mask-[linear-gradient(to_bottom,white,transparent)]"
		>
			{Array.from({ length: numCircles }, (_, index) => {
				const size = mainCircleSize + index * 70;
				const opacity = mainCircleOpacity - index * 0.03;
				const animationDelay = `${index * 0.06}s`;
				const borderStyle = index === numCircles - 1 ? "dashed" : "solid";
				const borderOpacity = 5 + index * 5;

				return (
					<div
						key={index}
						className="absolute top-1/2 left-1/2 -translate-1/2 animate-ripple border
							bg-fd-foreground/25 shadow-xl"
						style={
							{
								"--i": index,
								animationDelay,
								borderColor: `rgba(var(--foreground-rgb), ${borderOpacity / 100})`,
								borderRadius: "50%",
								borderStyle,
								borderWidth: "1px",
								height: `${size}px`,
								opacity,
								width: `${size}px`,
							} as React.CSSProperties
						}
					/>
				);
			})}
		</div>
	);
}

export default memo(Ripple);
