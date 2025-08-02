"use client";

import { ProgressProvider } from "@bprogress/next/app";
import { isBrowser } from "@zayne-labs/toolkit-core";
import { useConstant, useEffectOnce } from "@zayne-labs/toolkit-react";
import { RootProvider as FumaThemeProvider } from "fumadocs-ui/provider";
import { useState } from "react";

function Providers(props: { children: React.ReactNode }) {
	const { children } = props;

	const [isDarkMode, setIsDarkMode] = useState(false);

	const mutationObserver = useConstant(() => {
		if (!isBrowser()) return;

		return new MutationObserver((mutations) => {
			const classAttributeMutation = mutations.find(
				(mutation) => mutation.type === "attributes" && mutation.attributeName === "class"
			);

			if (!classAttributeMutation) return;

			const newState = document.documentElement.classList.contains("dark");

			setIsDarkMode(newState);
		});
	});

	useEffectOnce(() => {
		mutationObserver?.observe(document.documentElement, { attributes: true });

		return () => mutationObserver?.disconnect();
	});

	return (
		<FumaThemeProvider>
			<ProgressProvider
				height="2px"
				color={isDarkMode ? "hsl(250, 100%, 80%)" : "hsl(24.6, 95%, 53.1%)"}
				options={{ showSpinner: false }}
				shallowRouting={true}
			>
				{children}
			</ProgressProvider>
		</FumaThemeProvider>
	);
}

export { Providers };
