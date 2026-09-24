import type { CallApiPlugin } from "../plugins";
import type { CallApiContext } from "./callapi-context";

export type DefaultDataType = unknown;

export type DefaultPluginArray = CallApiPlugin[];

export type DefaultThrowOnError = boolean;

export type DefaultMetaObject = Record<string, unknown>;

export type DefaultInferredExtraOptions = unknown;

export type DefaultCallApiContext = Omit<CallApiContext, "Meta">;
