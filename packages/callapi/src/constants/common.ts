import type { ModifiedRequestInit } from "../types/common";
import { defineEnum } from "../types/type-helpers";

export const fetchSpecificKeys = defineEnum([
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
] satisfies Array<keyof ModifiedRequestInit> as Array<keyof ModifiedRequestInit>);
