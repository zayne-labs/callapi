"use client";

import type { InferProps } from "@zayne-labs/toolkit-react/utils";
import type { Prettify } from "@zayne-labs/toolkit-type-helpers";
import { tv, type VariantProps } from "tailwind-variants";
import { Slot } from "@/components/common";
import { cnMerge } from "@/lib/utils/cn";

// eslint-disable-next-line react-refresh/only-export-components -- It's fine
export const buttonVariants = tv({
	base: `inline-flex items-center justify-center rounded-md text-sm font-medium whitespace-nowrap
	transition-colors focus-visible:ring-1 focus-visible:ring-fd-ring focus-visible:outline-none
	disabled:pointer-events-none disabled:opacity-50`,

	variants: {
		size: {
			default: "h-9 px-4 py-2",
			icon: "size-9",
			lg: "h-10 rounded-md px-8",
			sm: "h-8 rounded-md px-3 text-xs",
		},

		theme: {
			destructive:
				"bg-fd-destructive text-fd-destructive-foreground shadow-sm hover:bg-fd-destructive/90",
			ghost: "hover:bg-fd-accent hover:text-fd-accent-foreground",
			link: "text-fd-primary underline-offset-4 hover:underline",
			outline: `border border-fd-input bg-fd-background shadow-sm hover:bg-fd-accent
			hover:text-fd-accent-foreground`,
			primary: "bg-fd-primary text-fd-primary-foreground shadow hover:bg-fd-primary/90",
			secondary: "bg-fd-secondary/75 text-fd-secondary-foreground shadow-sm",
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
	const {
		asChild = false,
		className,
		size,
		theme,
		type = "button",
		unstyled,
		...extraButtonProps
	} = props;

	const BTN_CLASSES = unstyled ? className : buttonVariants({ className, size, theme });

	const Component = asChild ? Slot.Root : "button";

	return <Component type={type} className={cnMerge(BTN_CLASSES)} {...extraButtonProps} />;
}

export { Button };
