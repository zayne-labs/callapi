"use client";

import { ProgressProvider } from "@bprogress/next/app";
import { RootProvider as FumaThemeProvider } from "fumadocs-ui/provider/next";
import { SonnerToaster } from "@/components/common/Toaster";
import { useIsDarkMode } from "@/lib/hooks/useIsDarkMode";

function Providers(props: { children: React.ReactNode }) {
	const { children } = props;

	const isDarkMode = useIsDarkMode();

	return (
		<FumaThemeProvider>
			<ProgressProvider
				height="2px"
				color={isDarkMode ? "hsl(250, 100%, 80%)" : "hsl(24.6, 95%, 53.1%)"}
				options={{ showSpinner: false }}
				shallowRouting={true}
			>
				{children}
				<SonnerToaster />
			</ProgressProvider>
		</FumaThemeProvider>
	);
}

export { Providers };
