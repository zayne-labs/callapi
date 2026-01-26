"use client";

import { HoverCard as HoverCardPrimitive } from "radix-ui";
import { cnMerge } from "@/lib/utils/cn";

function HoverCardRoot(props: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
	return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

function HoverCardTrigger(props: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
	return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

function HoverCardContent(props: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
	const { align = "center", className, sideOffset = 4, ...restOfProps } = props;

	return (
		<HoverCardPrimitive.Portal data-slot="hover-card-portal">
			<HoverCardPrimitive.Content
				data-slot="hover-card-content"
				align={align}
				sideOffset={sideOffset}
				className={cnMerge(
					`z-50 w-72 origin-(--radix-hover-card-content-transform-origin) rounded-lg bg-fd-popover p-4
					text-sm text-fd-popover-foreground shadow-md ring-1 ring-fd-foreground/10 outline-hidden
					duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2
					data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2
					data-[state=closed]:animate-fd-popover-out data-[state=closed]:fade-out-0
					data-[state=closed]:zoom-out-95 data-[state=open]:animate-fd-popover-in
					data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95`,
					className
				)}
				{...restOfProps}
			/>
		</HoverCardPrimitive.Portal>
	);
}

export const Root = HoverCardRoot;
export const Trigger = HoverCardTrigger;
export const Content = HoverCardContent;
