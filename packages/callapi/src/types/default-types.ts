import type { CallApiPlugin } from "../plugins";
import type { CallApiContext, GlobalMeta } from "./common";

export type DefaultDataType = unknown;

export type DefaultPluginArray = CallApiPlugin[];

export type DefaultThrowOnError = boolean;

export type DefaultMetaObject = Record<string, unknown>;

export type DefaultCallApiContext = Omit<Required<CallApiContext>, "Meta"> & {
	Meta: GlobalMeta;
};
