"use client";

import { ProgressProvider } from "@bprogress/next/app";
import { RootProvider as FumaThemeProvider } from "fumadocs-ui/provider/next";
import { SonnerToaster } from "@/components/common/Toaster";

function Providers(props: { children: React.ReactNode }) {
	const { children } = props;

	return (
		<FumaThemeProvider>
			<ProgressProvider
				height="2px"
				color="var(--color-fd-primary)"
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
