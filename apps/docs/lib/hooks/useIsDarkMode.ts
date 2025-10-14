import { isBrowser } from "@zayne-labs/toolkit-core";
import { useEffectOnce } from "@zayne-labs/toolkit-react";
import { useMemo, useState } from "react";

const useIsDarkMode = () => {
	const [isDarkMode, setIsDarkMode] = useState(false);

	const mutationObserver = useMemo(() => {
		if (!isBrowser()) return;

		return new MutationObserver((mutations) => {
			const classAttributeMutation = mutations.find(
				(mutation) => mutation.type === "attributes" && mutation.attributeName === "class"
			);

			if (!classAttributeMutation) return;

			const newState = document.documentElement.classList.contains("dark");

			setIsDarkMode(newState);
		});
	}, []);

	useEffectOnce(() => {
		mutationObserver?.observe(document.documentElement, { attributes: true });

		return () => mutationObserver?.disconnect();
	});

	return isDarkMode;
};

export { useIsDarkMode };
