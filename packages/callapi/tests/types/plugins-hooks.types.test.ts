import { expect, expectTypeOf, test } from "vitest";
import {
	createFetchClient,
	createFetchClientWithContext,
	type CallApiPlugin,
	type GetCallApiContext,
	type PluginHooks,
	type PluginSetupContext,
} from "../../src";
import type { StandardSchemaV1 } from "../../src/types/standard-schema";
import { definePlugin, definePluginWithContext, extraOptionsHelper } from "../../src/utils/external";

type User = {
	id: string;
};

const userSchema: StandardSchemaV1<unknown, User> = {
	"~standard": {
		validate: (input) => ({ value: input as User }),
		vendor: "callapi-type-tests",
		version: 1,
	},
};

const tracingPlugin = definePlugin({
	extraOptionsDef: extraOptionsHelper<{ traceId: string }>(),
	id: "tracing",
	name: "Tracing",
});

const cachePlugin = definePlugin({
	extraOptionsDef: extraOptionsHelper<{ cacheNamespace: string }>(),
	id: "cache",
	name: "Cache",
});

const plainPlugin = definePlugin({ id: "plain", name: "Plain" });

const callApiClient = createFetchClient({
	plugins: [tracingPlugin, cachePlugin],
	schema: {
		routes: {
			"/users/1": { data: userSchema },
		},
	},
});

type RegisteredContext = GetCallApiContext<{
	Data: User;
	ErrorData: { code: string };
	Meta: { requestId: string };
}>;

const createRegisteredClient = createFetchClientWithContext<RegisteredContext>();
const registeredClient = createRegisteredClient({});

const pluginWithoutSchema = {
	id: "plain",
	name: "Plain",
} satisfies CallApiPlugin;

test("extraOptionsHelper registers a type without runtime options", () => {
	expect(extraOptionsHelper<{ traceId: string }>()).toBeUndefined();
	expect(tracingPlugin.extraOptionsDef).toBeUndefined();
});

test("base callbacks infer options contributed by tagged plugins", () => {
	type UploadOptions = {
		onUpload: (progress: { loaded: number; total: number }) => void;
	};
	type UploadSuccessOptions = {
		onUploadSuccess: (progress: { loaded: number; total: number }) => void;
	};

	const uploadPlugin = definePlugin({
		extraOptionsDef: extraOptionsHelper<UploadOptions>(),
		id: "upload",
		name: "Upload",
		setup: ({ options }: PluginSetupContext<{ InferredExtraOptions: UploadOptions }>) => {
			options.onUpload?.({ loaded: 0, total: 0 });
		},
	} satisfies CallApiPlugin<{ InferredExtraOptions: UploadOptions }>);

	const uploadSuccessPlugin = definePlugin({
		extraOptionsDef: extraOptionsHelper<UploadSuccessOptions>(),
		hooks: {
			onRequest: () => undefined,
		} satisfies PluginHooks<{ InferredExtraOptions: UploadSuccessOptions }>,
		id: "upload-success",
		name: "Upload Success",
		setup: ({ options }: PluginSetupContext<{ InferredExtraOptions: UploadSuccessOptions }>) => {
			options.onUploadSuccess?.({ loaded: 0, total: 0 });
		},
	});

	const client = createFetchClient({
		onUpload: (progress) => {
			expectTypeOf(progress).toEqualTypeOf<Parameters<UploadOptions["onUpload"]>[0]>();
		},
		onUploadSuccess: (progress) => {
			expectTypeOf(progress).toEqualTypeOf<Parameters<UploadSuccessOptions["onUploadSuccess"]>[0]>();
		},
		plugins: [uploadPlugin, uploadSuccessPlugin, plainPlugin],
		schema: {
			routes: {
				"/users/1": { data: userSchema },
			},
		},
	});

	expectTypeOf(client).toBeFunction();
});

test("Plugin types - merge plugin options into requests and hooks", () => {
	const validRequest = () =>
		callApiClient("/users/1", {
			cacheNamespace: "users",
			onSuccess: ({ data, options }) => {
				expectTypeOf(data).toEqualTypeOf<User>();
				expectTypeOf(options.traceId).toEqualTypeOf<string | undefined>();
				expectTypeOf(options.cacheNamespace).toEqualTypeOf<string | undefined>();
			},
			traceId: "request-1",
		});

	const invalidRequest = () =>
		callApiClient("/users/1", {
			// @ts-expect-error -- plugin options remain typed
			traceId: 123,
		});

	expectTypeOf(validRequest).toBeFunction();
	expectTypeOf(invalidRequest).toBeFunction();
});

test("Plugin types - retain extra options beside a plain plugin", () => {
	const mixedClient = createFetchClient({ plugins: [tracingPlugin, plainPlugin] });
	const valid = () => mixedClient("/users", { traceId: "request-1" });
	const invalid = () =>
		mixedClient("/users", {
			// @ts-expect-error -- plain plugins do not erase tagged extra options
			traceId: 123,
		});
	expectTypeOf(valid).toBeFunction();
	expectTypeOf(invalid).toBeFunction();
});

test("Plugin types - context and extraOptionsDef contribute to base and instance calls", () => {
	const defineContextPlugin =
		definePluginWithContext<GetCallApiContext<{ InferredExtraOptions: { contextOption: string } }>>();
	const plugin = defineContextPlugin({
		extraOptionsDef: extraOptionsHelper<{ taggedOption: number }>(),
		id: "context-extra",
		name: "Context Extra",
	});
	const metadataPlugin = definePluginWithContext<GetCallApiContext<{ Meta: { source?: string } }>>()({
		id: "metadata",
		name: "Metadata",
	});
	const baseClient = createFetchClient({
		contextOption: "context",
		onRequest: ({ options }) => {
			expectTypeOf(options.contextOption).toEqualTypeOf<string | undefined>();
			expectTypeOf(options.taggedOption).toEqualTypeOf<number | undefined>();
			expectTypeOf(options.meta?.source).toEqualTypeOf<string | undefined>();
		},
		plugins: [metadataPlugin, plugin],
		taggedOption: 1,
	});
	const baseRequest = () => baseClient("/users", { contextOption: "context", taggedOption: 1 });
	const invalidBaseOption = () =>
		createFetchClient({
			// @ts-expect-error -- metadata-only plugins must not erase base extra-option types
			contextOption: 123,
			plugins: [metadataPlugin, plugin],
		});
	const instanceClient = createFetchClient({});
	const instanceRequest = () =>
		instanceClient("/users", {
			contextOption: "context",
			onRequest: ({ options }) => {
				expectTypeOf(options.meta?.source).toEqualTypeOf<string | undefined>();
			},
			plugins: [metadataPlugin, plugin],
			taggedOption: 1,
		});
	const invalidInstance = () =>
		instanceClient("/users", {
			// @ts-expect-error -- instance plugin options retain their types
			contextOption: 123,
			plugins: [metadataPlugin, plugin],
			taggedOption: 1,
		});
	const invalidTaggedOption = () =>
		instanceClient("/users", {
			contextOption: "context",
			plugins: [metadataPlugin, plugin],
			// @ts-expect-error -- extraOptionsDef retains its type alongside context options
			taggedOption: "wrong",
		});
	const withoutPlugin = () =>
		instanceClient("/users", {
			// @ts-expect-error -- instance options do not apply to later calls
			contextOption: "context",
		});
	expectTypeOf(baseRequest).toBeFunction();
	expectTypeOf(invalidBaseOption).toBeFunction();
	expectTypeOf(instanceRequest).toBeFunction();
	expectTypeOf(invalidInstance).toBeFunction();
	expectTypeOf(invalidTaggedOption).toBeFunction();
	expectTypeOf(withoutPlugin).toBeFunction();
});

test("Context types - enforce registered data and meta", () => {
	const validRequest = () =>
		registeredClient("/users", {
			meta: { requestId: "request-1" },
			onSuccess: ({ data, options }) => {
				expectTypeOf(data).toEqualTypeOf<User>();
				expectTypeOf(options.meta).toEqualTypeOf<{ requestId: string } | undefined>();
			},
		});

	const invalidRequest = () =>
		registeredClient("/users", {
			// @ts-expect-error -- registered meta is enforced
			meta: { requestId: 123 },
		});

	expectTypeOf(validRequest).toBeFunction();
	expectTypeOf(invalidRequest).toBeFunction();
});

test("Plugin types - support plugins without schema extensions", () => {
	const request = () =>
		createFetchClient({
			plugins: [pluginWithoutSchema],
			schema: {
				config: { strict: true },
				routes: {
					"/known": { data: userSchema },
				},
			},
		})("/known");

	expectTypeOf(request).toBeFunction();
});
