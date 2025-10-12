import { extraOptionDefaults } from "./constants/default-options";
import {
	composeAllHooks,
	getHookRegistriesAndKeys,
	type Hooks,
	type HooksOrHooksArray,
	type PluginExtraOptions,
	type RequestContext,
} from "./hooks";
import { composeAllMiddlewares, getMiddlewareRegistriesAndKeys, type Middlewares } from "./middlewares";
import type { CallApiRequestOptions, CallApiRequestOptionsForHooks } from "./types/common";
import type { Awaitable } from "./types/type-helpers";
import type { InitURLOrURLObject } from "./url";
import { isArray, isFunction, isPlainObject, isString } from "./utils/guards";
import { type BaseCallApiSchemaAndConfig, getCurrentRouteSchemaKeyAndMainInitURL } from "./validation";

export type PluginSetupContext<TPluginExtraOptions = unknown> = RequestContext // eslint-disable-next-line perfectionist/sort-intersection-types -- Allow
	& PluginExtraOptions<TPluginExtraOptions> & { initURL: string };

export type PluginInitResult = Partial<
	Omit<PluginSetupContext, "initURL" | "request"> & {
		initURL: InitURLOrURLObject;
		request: CallApiRequestOptions;
	}
>;

export type PluginHooksWithMoreOptions<TMoreOptions = unknown> = HooksOrHooksArray<
	never,
	never,
	TMoreOptions
>;

export type PluginHooks<TData = never, TErrorData = never, TMoreOptions = unknown> = HooksOrHooksArray<
	TData,
	TErrorData,
	TMoreOptions
>;

export type PluginMiddlewares = Middlewares;

export interface CallApiPlugin {
	/**
	 * Defines additional options that can be passed to callApi
	 */
	defineExtraOptions?: (...params: never[]) => unknown;

	/**
	 * A description for the plugin
	 */
	description?: string;

	/**
	 * Hooks for the plugin
	 */
	hooks?: PluginHooks | ((context: PluginSetupContext) => Awaitable<PluginHooks>);

	/**
	 *  A unique id for the plugin
	 */
	id: string;

	/**
	 * Middlewares that for the plugin
	 */
	middlewares?: Middlewares | ((context: PluginSetupContext) => Awaitable<Middlewares>);

	/**
	 * A name for the plugin
	 */
	name: string;

	/**
	 * Base schema for the client.
	 */
	schema?: BaseCallApiSchemaAndConfig;

	/**
	 * A function that will be called when the plugin is initialized. This will be called before the any of the other internal functions.
	 */
	setup?: (context: PluginSetupContext) => Awaitable<PluginInitResult> | Awaitable<void>;

	/**
	 *  A version for the plugin
	 */
	version?: string;
}

export const getResolvedPlugins = (context: Pick<RequestContext, "baseConfig" | "options">) => {
	const { baseConfig, options } = context;

	const resolvedPlugins =
		isFunction(options.plugins) ?
			options.plugins({ basePlugins: baseConfig.plugins ?? [] })
		:	(options.plugins ?? []);

	return resolvedPlugins;
};

export const initializePlugins = async (context: PluginSetupContext) => {
	const { baseConfig, config, initURL, options, request } = context;

	const {
		addMainHooks,
		addMainMiddlewares,
		addPluginHooks,
		addPluginMiddlewares,
		getResolvedHooks,
		getResolvedMiddlewares,
	} = setupHooksAndMiddlewares({ baseConfig, config, options });

	const { currentRouteSchemaKey, mainInitURL } = getCurrentRouteSchemaKeyAndMainInitURL({
		baseExtraOptions: baseConfig,
		extraOptions: config,
		initURL,
	});

	let resolvedCurrentRouteSchemaKey = currentRouteSchemaKey;
	let resolvedInitURL = mainInitURL;
	let resolvedOptions = options;
	let resolvedRequestOptions = request;

	const executePluginSetupFn = async (pluginSetup: CallApiPlugin["setup"]) => {
		if (!pluginSetup) return;

		const initResult = await pluginSetup(context);

		if (!isPlainObject(initResult)) return;

		const urlString = initResult.initURL?.toString();

		if (isString(urlString)) {
			const newResult = getCurrentRouteSchemaKeyAndMainInitURL({
				baseExtraOptions: baseConfig,
				extraOptions: config,
				initURL: urlString,
			});

			resolvedCurrentRouteSchemaKey = newResult.currentRouteSchemaKey;
			resolvedInitURL = newResult.mainInitURL;
		}

		if (isPlainObject(initResult.request)) {
			resolvedRequestOptions = {
				...resolvedRequestOptions,
				...(initResult.request as CallApiRequestOptionsForHooks),
			};
		}

		if (isPlainObject(initResult.options)) {
			resolvedOptions = {
				...resolvedOptions,
				...initResult.options,
			};
		}
	};

	const resolvedPlugins = getResolvedPlugins({ baseConfig, options });

	for (const plugin of resolvedPlugins) {
		// eslint-disable-next-line no-await-in-loop -- Await is necessary in this case.
		const [, pluginHooks, pluginMiddlewares] = await Promise.all([
			executePluginSetupFn(plugin.setup),
			isFunction(plugin.hooks) ? plugin.hooks(context) : plugin.hooks,
			isFunction(plugin.middlewares) ? plugin.middlewares(context) : plugin.middlewares,
		]);

		pluginHooks && addPluginHooks(pluginHooks);
		pluginMiddlewares && addPluginMiddlewares(pluginMiddlewares);
	}

	addMainHooks();

	addMainMiddlewares();

	const resolvedHooks = getResolvedHooks();

	const resolvedMiddlewares = getResolvedMiddlewares();

	return {
		resolvedCurrentRouteSchemaKey,
		resolvedHooks,
		resolvedInitURL,
		resolvedMiddlewares,
		resolvedOptions,
		resolvedRequestOptions,
	};
};

const setupHooksAndMiddlewares = (
	context: Pick<PluginSetupContext, "baseConfig" | "config" | "options">
) => {
	const { baseConfig, config, options } = context;

	const { hookRegistries, hookRegistryKeys } = getHookRegistriesAndKeys();

	const { middlewareRegistries, middlewareRegistryKeys } = getMiddlewareRegistriesAndKeys();

	const addMainHooks = () => {
		for (const hookName of hookRegistryKeys) {
			const overriddenHook = options[hookName];
			const baseHook = baseConfig[hookName];
			const instanceHook = config[hookName];

			const shouldMergeBaseAndInstanceHooks = isArray(baseHook) && instanceHook;

			const mainHook =
				shouldMergeBaseAndInstanceHooks ? [baseHook, instanceHook].flat() : overriddenHook;

			mainHook && hookRegistries[hookName].add(mainHook as never);
		}
	};

	const addPluginHooks = (pluginHooks: PluginHooks) => {
		for (const hookName of hookRegistryKeys) {
			const pluginHook = pluginHooks[hookName];

			pluginHook && hookRegistries[hookName].add(pluginHook as never);
		}
	};

	const addMainMiddlewares = () => {
		for (const middlewareName of middlewareRegistryKeys) {
			const baseMiddleware = baseConfig[middlewareName];
			const instanceMiddleware = config[middlewareName];

			baseMiddleware && middlewareRegistries[middlewareName].add(baseMiddleware);

			instanceMiddleware && middlewareRegistries[middlewareName].add(instanceMiddleware);
		}
	};

	const addPluginMiddlewares = (pluginMiddlewares: PluginMiddlewares) => {
		for (const middlewareName of middlewareRegistryKeys) {
			const pluginMiddleware = pluginMiddlewares[middlewareName];

			if (!pluginMiddleware) continue;

			middlewareRegistries[middlewareName].add(pluginMiddleware);
		}
	};

	const getResolvedHooks = () => {
		const resolvedHooks: Hooks = {};

		for (const [hookName, hookRegistry] of Object.entries(hookRegistries)) {
			if (hookRegistry.size === 0) continue;

			// == Flatten the hook registry to remove any nested arrays, incase an array of hooks is passed to any of the hooks
			const flattenedHookArray = [...hookRegistry].flat();

			if (flattenedHookArray.length === 0) continue;

			const hooksExecutionMode = options.hooksExecutionMode ?? extraOptionDefaults().hooksExecutionMode;

			const composedHook = composeAllHooks(flattenedHookArray, hooksExecutionMode);

			resolvedHooks[hookName as keyof Hooks] = composedHook;
		}

		return resolvedHooks;
	};

	const getResolvedMiddlewares = () => {
		const resolvedMiddlewares: Middlewares = {};

		for (const [middlewareName, middlewareRegistry] of Object.entries(middlewareRegistries)) {
			if (middlewareRegistry.size === 0) continue;

			const middlewareArray = [...middlewareRegistry];

			if (middlewareArray.length === 0) continue;

			const composedMiddleware = composeAllMiddlewares(middlewareArray);

			resolvedMiddlewares[middlewareName as keyof Middlewares] = composedMiddleware;
		}

		return resolvedMiddlewares;
	};

	return {
		addMainHooks,
		addMainMiddlewares,
		addPluginHooks,
		addPluginMiddlewares,
		getResolvedHooks,
		getResolvedMiddlewares,
	};
};
