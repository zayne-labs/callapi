import type { ModifiedRequestInit } from "../types/options-types";

export const fetchSpecificKeys = [
	"body",
	"integrity",
	"duplex",
	"method",
	"headers",
	"signal",
	"cache",
	"redirect",
	"window",
	"credentials",
	"keepalive",
	"referrer",
	"priority",
	"mode",
	"referrerPolicy",
	"extraFetchOptions",
] as const satisfies Array<keyof ModifiedRequestInit>;
