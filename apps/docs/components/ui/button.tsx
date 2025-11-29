"use client";

import { Slot } from "@/components/common";
import { cnMerge } from "@/lib/utils/cn";
import type { InferProps } from "@zayne-labs/toolkit-react/utils";
import type { Prettify } from "@zayne-labs/toolkit-type-helpers";
import { tv, type VariantProps } from "tailwind-variants";

// eslint-disable-next-line react-refresh/only-export-components -- It's fine
export const buttonVariants = tv({
	base: `inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors
	duration-100 focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:outline-none
	disabled:pointer-events-none disabled:opacity-50`,

	variants: {
		size: {
			default: "p-2",
			"home-default": "px-4 py-2",
			icon: "p-1.5 [&_svg]:size-5",
			"icon-sm": "p-1.5 [&_svg]:size-4.5",
			"icon-xs": "p-1 [&_svg]:size-4",
			lg: "h-11 px-6",
			sm: "gap-1 px-2 py-1.5 text-xs",
			xs: "px-2 py-1.5 text-xs",
		},

		theme: {
			destructive:
				"bg-fd-destructive text-fd-destructive-foreground shadow-sm hover:bg-fd-destructive/90",
			ghost: "hover:bg-fd-accent hover:text-fd-accent-foreground",
			glow: `border bg-linear-to-t from-fd-primary/10 shadow-inner shadow-fd-primary/10
			hover:bg-fd-accent/50 hover:text-fd-accent-foreground`,
			link: "text-fd-primary underline-offset-4 hover:underline",
			outline: "border hover:bg-fd-accent hover:text-fd-accent-foreground",
			primary: "bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/80",
			secondary: `border bg-fd-secondary text-fd-secondary-foreground hover:bg-fd-accent
			hover:text-fd-accent-foreground`,
		},
	},

	/* eslint-disable perfectionist/sort-objects -- I want this to be last */
	defaultVariants: {
		size: "default",
		theme: "primary",
	},
	/* eslint-enable perfectionist/sort-objects -- I want this to be last */
});

export type ButtonProps = Prettify<InferProps<"button"> & VariantProps<typeof buttonVariants>> & {
	asChild?: boolean;
	unstyled?: boolean;
};

function Button(props: ButtonProps) {
	const { asChild = false, className, size, theme, type = "button", unstyled, ...restOfProps } = props;

	const BTN_CLASSES = unstyled ? className : buttonVariants({ className, size, theme });

	const Component = asChild ? Slot.Root : "button";

	return <Component type={type} className={cnMerge(BTN_CLASSES)} {...restOfProps} />;
}

export { Button };
