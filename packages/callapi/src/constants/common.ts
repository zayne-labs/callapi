import type { ModifiedRequestInit } from "../types/options-types";
import type { UnionToTuple } from "../validation";

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
	"dispatcher",
	"extraFetchOptions",
] as const satisfies UnionToTuple<"dispatcher" | keyof ModifiedRequestInit>;
