import type { CallApiPlugin } from "../plugins";
import type { CallApiContext, GlobalMeta } from "./common";
import type { Prettify } from "./type-helpers";

export type DefaultDataType = unknown;

export type DefaultPluginArray = CallApiPlugin[];

export type DefaultThrowOnError = boolean;

export type DefaultMetaObject = Record<string, unknown>;

export type DefaultCallApiContext = Prettify<
	Required<Omit<CallApiContext, "Meta">> & {
		Meta: GlobalMeta;
	}
>;
