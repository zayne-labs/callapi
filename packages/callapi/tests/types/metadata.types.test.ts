import { expect, expectTypeOf, test, vi } from "vitest";
import { createFetchClient, createFetchClientWithContext, type GetCallApiContext } from "../../src";
import type { InferMetaFromTag, ResolveMetaFromContext } from "../../src/types/callapi-context";
import type { StandardSchemaV1 } from "../../src/types/standard-schema";
import {
	defineBaseConfig,
	definePlugin,
	definePluginWithContext,
	metaHelper,
} from "../../src/utils/external";
import { createFetchMock, mockFetchSuccess } from "../test-setup/fetch-mock";

type AuthMeta = { auth?: { skipRedirect: boolean } };
type ToastMeta = { toast?: { success: boolean } };

type AuthContext = GetCallApiContext<{
	Data: { id: number };
	ErrorData: { code: string };
	Meta: AuthMeta;
}>;

const defineAuthPlugin = definePluginWithContext<AuthContext>();

const authPlugin = () =>
	defineAuthPlugin({
		hooks: {
			onResponseError: (ctx) => {
				expectTypeOf(ctx.error.errorData).toEqualTypeOf<{ code: string }>();
				expectTypeOf(ctx.options.meta?.auth).toEqualTypeOf<AuthMeta["auth"]>();
			},
		},
		id: "auth",
		name: "Auth",
	});

const toastPlugin = definePluginWithContext<GetCallApiContext<{ Meta: ToastMeta }>>()({
	id: "toast",
	name: "Toast",
});

test("metaHelper registers only base metadata without a runtime value", () => {
	const definedMeta = metaHelper<AuthMeta>();
	expect(definedMeta).toBeUndefined();
	expectTypeOf<InferMetaFromTag<typeof definedMeta>>().toEqualTypeOf<AuthMeta>();

	const client = createFetchClient({ meta: metaHelper<AuthMeta>() });
	const valid = () => client("/users", { meta: { auth: { skipRedirect: true } } });
	const invalid = () =>
		client("/users", {
			// @ts-expect-error -- registered metadata is typed
			meta: { auth: { skipRedirect: "yes" } },
		});
	expectTypeOf(valid).toBeFunction();
	expectTypeOf(invalid).toBeFunction();
});

test("plain base metadata stays runtime-only", () => {
	const client = createFetchClient({ meta: { source: "dashboard" } });
	const request = () => client("/users", { meta: { anotherValue: true } });
	expectTypeOf(request).toBeFunction();
});

test("context metadata combines with plugins before global fallback", () => {
	expectTypeOf<ResolveMetaFromContext<{ Meta?: AuthMeta }, ToastMeta>["Meta"]>().toEqualTypeOf<
		AuthMeta & ToastMeta
	>();

	const createClient = createFetchClientWithContext<GetCallApiContext<{ Meta: AuthMeta }>>();
	const client = createClient({ plugins: [toastPlugin] });
	const request = () =>
		client("/users", {
			meta: { auth: { skipRedirect: true }, toast: { success: true } },
		});
	const invalid = () =>
		client("/users", {
			// @ts-expect-error -- global metadata does not widen an explicit context
			meta: { unrelated: true },
		});
	expectTypeOf(request).toBeFunction();
	expectTypeOf(invalid).toBeFunction();
});

test("extracted, callback, and spread configurations retain metadata", () => {
	const base = defineBaseConfig({
		meta: metaHelper<AuthMeta>(),
		plugins: [toastPlugin],
	});
	const client = createFetchClient({ ...base });
	const callback = createFetchClient(defineBaseConfig(() => ({ ...base })));
	const request = () =>
		client("/users", {
			meta: { auth: { skipRedirect: true }, toast: { success: false } },
		});
	const callbackRequest = () =>
		callback("/users", {
			meta: { auth: { skipRedirect: true }, toast: { success: true } },
		});
	expectTypeOf(request).toBeFunction();
	expectTypeOf(callbackRequest).toBeFunction();
});

test("plugin context is local but its metadata composes per scope", () => {
	const plugin = authPlugin();
	expectTypeOf<InferMetaFromTag<typeof plugin>>().toEqualTypeOf<AuthMeta>();

	const client = createFetchClient({ plugins: [toastPlugin] });
	const withAuth = () =>
		client("/users", {
			plugins: [plugin],
			meta: { auth: { skipRedirect: true }, toast: { success: false } },
			onRequest: ({ options }) => {
				expectTypeOf(options.meta?.auth).toEqualTypeOf<AuthMeta["auth"]>();
				expectTypeOf(options.meta?.toast).toEqualTypeOf<ToastMeta["toast"]>();
			},
		});
	const withoutAuth = () =>
		client("/users", {
			// @ts-expect-error -- instance plugin metadata is not client-wide
			meta: { auth: { skipRedirect: true } },
		});
	const wrongData = () =>
		client("/users", {
			onSuccess: ({ data }) => {
				// @ts-expect-error -- plugin data does not become client data
				const id: number = data.id;
				return id;
			},
		});
	expectTypeOf(withAuth).toBeFunction();
	expectTypeOf(withoutAuth).toBeFunction();
	expectTypeOf(wrongData).toBeFunction();
});

test("plain plugins do not erase tagged plugin metadata", () => {
	const plainPlugin = definePlugin({ id: "plain", name: "Plain" });
	const client = createFetchClient({ plugins: [authPlugin(), plainPlugin] });
	const valid = () => client("/users", { meta: { auth: { skipRedirect: true } } });
	const invalid = () =>
		client("/users", {
			// @ts-expect-error -- plain plugins do not erase tagged metadata
			meta: { auth: { skipRedirect: "yes" } },
		});
	expectTypeOf(valid).toBeFunction();
	expectTypeOf(invalid).toBeFunction();
});

test("metaDef contributes metadata from base and instance plugins", () => {
	const metricsPlugin = definePlugin({
		id: "metrics",
		metaDef: metaHelper<{ metrics?: { operation: string } }>(),
		name: "Metrics",
	});
	const client = createFetchClient({ plugins: [metricsPlugin] });
	const baseRequest = () => client("/users", { meta: { metrics: { operation: "list" } } });
	const invalidBase = () =>
		client("/users", {
			// @ts-expect-error -- metaDef types base requests
			meta: { metrics: { operation: 123 } },
		});
	const instanceClient = createFetchClient({});
	const instanceRequest = () =>
		instanceClient("/users", {
			meta: { metrics: { operation: "list" } },
			plugins: [metricsPlugin],
		});
	const invalidInstance = () =>
		instanceClient("/users", {
			// @ts-expect-error -- metaDef types only the call with the plugin
			meta: { metrics: { operation: 123 } },
			plugins: [metricsPlugin],
		});
	expectTypeOf(baseRequest).toBeFunction();
	expectTypeOf(invalidBase).toBeFunction();
	expectTypeOf(instanceRequest).toBeFunction();
	expectTypeOf(invalidInstance).toBeFunction();
});

test("plugin context metadata and metaDef both contribute", () => {
	const plugin = definePluginWithContext<GetCallApiContext<{ Meta: AuthMeta }>>()({
		id: "auth-metrics",
		metaDef: metaHelper<{ metrics?: { operation: string } }>(),
		name: "Auth Metrics",
	});
	const client = createFetchClient({ plugins: [plugin] });
	const request = () =>
		client("/users", {
			meta: { auth: { skipRedirect: true }, metrics: { operation: "list" } },
		});
	expectTypeOf(request).toBeFunction();
});

test("an empty plugin tuple falls back to global metadata", () => {
	const client = createFetchClient({ plugins: [] });
	const request = () => client("/users", { meta: { arbitrary: true } });
	expectTypeOf(request).toBeFunction();
});

test("base plugins combine metadata and callback plugin tuples retain it", () => {
	const client = createFetchClient({
		meta: metaHelper<{ requestId?: string }>(),
		onRequest: ({ options }) => {
			expectTypeOf(options.meta?.requestId).toEqualTypeOf<string | undefined>();
			expectTypeOf(options.meta?.auth).toEqualTypeOf<AuthMeta["auth"]>();
			expectTypeOf(options.meta?.toast).toEqualTypeOf<ToastMeta["toast"]>();
		},
		plugins: [authPlugin(), toastPlugin],
	});
	const request = () =>
		client("/users", {
			meta: { auth: { skipRedirect: true }, toast: { success: false } },
		});
	const callbackRequest = () =>
		client("/users", {
			plugins: ({ basePlugins }) => [...basePlugins, authPlugin()],
			meta: { auth: { skipRedirect: true }, toast: { success: false } },
		});
	expectTypeOf(request).toBeFunction();
	expectTypeOf(callbackRequest).toBeFunction();
});

test("conflicting plugin metadata properties cannot be provided", () => {
	const first = definePluginWithContext<GetCallApiContext<{ Meta: { conflict: string } }>>()({
		id: "first",
		name: "First",
	});
	const second = definePluginWithContext<GetCallApiContext<{ Meta: { conflict: number } }>>()({
		id: "second",
		name: "Second",
	});
	const client = createFetchClient({ plugins: [first, second] });
	const request = () =>
		client("/users", {
			// @ts-expect-error -- the two plugin constraints intersect to never
			meta: { conflict: "impossible" },
		});
	expectTypeOf(request).toBeFunction();
});

test("route schema metadata takes precedence and is required", () => {
	const metaSchema: StandardSchemaV1<{ requestId: string }, { validatedId: number }> = {
		"~standard": {
			validate: (value) => ({
				value: { validatedId: Number((value as { requestId: string }).requestId) },
			}),
			vendor: "callapi-type-tests",
			version: 1,
		},
	};

	const client = createFetchClient({
		schema: { routes: { "/users": { meta: metaSchema } } },
	});
	const taggedClient = createFetchClient({
		meta: metaHelper<AuthMeta>(),
		schema: { routes: { "/users": { meta: metaSchema } } },
	});

	const request = () =>
		client("/users", {
			meta: { validatedId: 1 },
			onRequest: ({ options }) => {
				expectTypeOf(options.meta).toEqualTypeOf<{ validatedId: number } | undefined>();
			},
		});
	const missing = () => {
		// @ts-expect-error -- route schema requires metadata
		return client("/users");
	};
	const taggedRequest = () =>
		taggedClient("/users", {
			meta: { validatedId: 1 },
			onRequest: ({ options }) => {
				expectTypeOf(options.meta).toEqualTypeOf<{ validatedId: number } | undefined>();
			},
		});
	expectTypeOf(request).toBeFunction();
	expectTypeOf(missing).toBeFunction();
	expectTypeOf(taggedRequest).toBeFunction();
});

test("plugin metadata and schema output reach runtime hooks", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess({ ok: true });
	const onRequest = vi.fn();
	const metaSchema: StandardSchemaV1<
		{ validatedId: number },
		{ validated: boolean; validatedId: number }
	> = {
		"~standard": {
			validate: (value) => ({
				value: { ...(value as { validatedId: number }), validated: true },
			}),
			vendor: "callapi-type-tests",
			version: 1,
		},
	};
	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [
			defineAuthPlugin({
				hooks: { onRequest },
				id: "runtime-auth",
				name: "Runtime Auth",
			}),
		],
		schema: {
			routes: {
				"/users": {
					meta: metaSchema,
				},
			},
		},
	});

	await client("/users", { meta: { validated: false, validatedId: 1 } });

	expect(onRequest).toHaveBeenCalledWith(
		expect.objectContaining({
			options: expect.objectContaining({ meta: { validated: true, validatedId: 1 } }),
		})
	);
	expect(mockFetch).toHaveBeenCalledOnce();
});
