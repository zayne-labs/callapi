import type { CallApiPlugin, InferPluginArrayExtraOptions, InferPluginArrayMetaFromTag } from "../plugins";
import type { ResultModeType } from "../result";
import type { CallApiSchema, InferSchemaOutput } from "../validation";
import type { DefaultDataType, DefaultInferredExtraOptions, DefaultMetaObject } from "./default-types";
import type { IsEmptyObject, Prettify } from "./type-helpers";

export interface CallApiContext {
	Data?: DefaultDataType;
	ErrorData?: DefaultDataType;
	InferredExtraOptions?: DefaultInferredExtraOptions;
	Meta?: DefaultMetaObject;
	ResultMode?: ResultModeType;
}

export type GetCallApiContext<TCallApiContext extends CallApiContext> = TCallApiContext;

export type GetCallApiContextRequired<TCallApiContext extends Required<CallApiContext>> = TCallApiContext;

export type OverrideCallApiContext<
	TFullCallApiContext extends CallApiContext,
	TOverrideCallApiContext extends CallApiContext,
> = Prettify<Omit<TFullCallApiContext, keyof TOverrideCallApiContext> & TOverrideCallApiContext>;

const callApiContextSymbol = Symbol("callApiContextSymbol");
export type callApiContextSymbol = typeof callApiContextSymbol;

export type ContextTag<TType, TCallApiContext extends CallApiContext> = TType & {
	readonly [callApiContextSymbol]: TCallApiContext;
};

export type MetaWithContextTag<TMeta extends DefaultMetaObject | undefined> = ContextTag<
	TMeta,
	{ Meta: TMeta }
>;

export type ExtraOptionsWithContextTag<TExtraOptions extends DefaultInferredExtraOptions> = ContextTag<
	TExtraOptions,
	{ InferredExtraOptions: TExtraOptions }
>;

export type InferMetaFromTag<TTaggedType, TFallback = never> =
	TTaggedType extends ContextTag<unknown, infer TCallApiContext extends CallApiContext> ?
		IsEmptyObject<TCallApiContext["Meta"]> extends true ?
			TFallback
		:	TCallApiContext["Meta"]
	:	TFallback;

export type InferExtraOptionsFromTag<TTaggedType> =
	TTaggedType extends ContextTag<unknown, infer TCallApiContext extends CallApiContext> ?
		unknown extends TCallApiContext["InferredExtraOptions"] ?
			never
		:	TCallApiContext["InferredExtraOptions"]
	:	never;

export type ResolveMetaFromContext<
	TCallApiContext extends CallApiContext,
	TAdditionalMeta,
> = OverrideCallApiContext<
	TCallApiContext,
	{
		Meta: TAdditionalMeta & TCallApiContext["Meta"];
	}
>;

export type ResolveBaseCallApiContext<
	TCallApiContext extends CallApiContext,
	TData,
	TErrorData,
	TResultMode extends ResultModeType,
	TMeta extends DefaultMetaObject,
	TPluginArray extends readonly CallApiPlugin[],
> = OverrideCallApiContext<
	TCallApiContext,
	{
		Data: TData;
		ErrorData: TErrorData;
		InferredExtraOptions: InferPluginArrayExtraOptions<TPluginArray>
			& TCallApiContext["InferredExtraOptions"];
		Meta: InferMetaFromTag<TMeta, unknown>
			& InferPluginArrayMetaFromTag<TPluginArray>
			& TCallApiContext["Meta"];
		ResultMode: TResultMode;
	}
>;

export type ResolveCallApiContext<
	TCallApiContext extends CallApiContext,
	TData,
	TErrorData,
	TResultMode extends ResultModeType,
	TSchema extends CallApiSchema,
	TPluginArray extends readonly CallApiPlugin[],
> = OverrideCallApiContext<
	TCallApiContext,
	{
		Data: TData;
		ErrorData: TErrorData;
		InferredExtraOptions: InferPluginArrayExtraOptions<TPluginArray>
			& TCallApiContext["InferredExtraOptions"];
		Meta: InferSchemaOutput<
			TSchema["meta"],
			InferPluginArrayMetaFromTag<TPluginArray> & TCallApiContext["Meta"]
		>;
		ResultMode: TResultMode;
	}
>;
