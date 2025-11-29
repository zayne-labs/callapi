import { getStatusTextMap } from "./constants";

export const getStatusText = (status: number) => {
	const statusTextMap = getStatusTextMap();

	const statusText = statusTextMap.get(status) ?? "Unknown";

	return statusText;
};
