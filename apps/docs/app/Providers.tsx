"use client";

import { ProgressProvider } from "@bprogress/next/app";
import { RootProvider as FumaThemeProvider } from "fumadocs-ui/provider";
import { useIsDarkMode } from "@/lib/hooks/useIsDarkMode";
import { SonnerToaster } from "@/components/common/Toaster";

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
