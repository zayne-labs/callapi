"use client";

import type { InferProps } from "@zayne-labs/toolkit-react/utils";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "../../ui/button";

// lazy load the dialog
const SearchAI = dynamic(() => import("./search"), { ssr: false });

/**
 * @description The trigger component for AI search dialog.
 *
 * Use it like a normal button component.
 */
export function AISearchTrigger(props: InferProps<typeof Button>) {
	const [open, setOpen] = useState<boolean>();

	return (
		<>
			{open !== undefined ?
				<SearchAI open={open} onOpenChange={setOpen} />
			:	null}

			<Button {...props} onClick={() => setOpen(true)} />
		</>
	);
}
