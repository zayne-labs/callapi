import type { ExtraOptionsWithContextTag, MetaWithContextTag } from "../../types/callapi-context";
import type { DefaultMetaObject } from "../../types/default-types";

export const extraOptionsHelper = <TExtraOptions>(): ExtraOptionsWithContextTag<TExtraOptions> => {
	return undefined as never;
};

export const metaHelper = <TMeta extends DefaultMetaObject>(): MetaWithContextTag<TMeta> => {
	return undefined as never;
};
