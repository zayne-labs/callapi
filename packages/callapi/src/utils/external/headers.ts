import type { CallApiRequestOptions } from "../../types/options-types";
import { isPlainObject } from "../guards";

export const objectifyHeaders = (headers: CallApiRequestOptions["headers"]) => {
	if (!headers) {
		return {};
	}

	if (isPlainObject(headers)) {
		return headers as Record<string, string>;
	}

	return Object.fromEntries(headers);
};
