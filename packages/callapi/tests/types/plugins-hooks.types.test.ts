import { expectTypeOf, test } from "vitest";
import {
	createFetchClient,
	createFetchClientWithContext,
	type CallApiPlugin,
	type GetCallApiContext,
} from "../../src";
import type { StandardSchemaV1 } from "../../src/types/standard-schema";
import { definePlugin } from "../../src/utils/external";

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
	defineExtraOptions: (): { traceId: string } => ({
		traceId: "",
	}),
	id: "tracing",
	name: "Tracing",
});

const cachePlugin = definePlugin({
	defineExtraOptions: (): { cacheNamespace: string } => ({
		cacheNamespace: "",
	}),
	id: "cache",
	name: "Cache",
});

const client = createFetchClient({
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

test("Plugin types - merge plugin options into requests and hooks", () => {
	const validRequest = () =>
		client("/users/1", {
			cacheNamespace: "users",
			onSuccess: ({ data, options }) => {
				expectTypeOf(data).toEqualTypeOf<User>();
				expectTypeOf(options.traceId).toEqualTypeOf<string | undefined>();
				expectTypeOf(options.cacheNamespace).toEqualTypeOf<string | undefined>();
			},
			traceId: "request-1",
		});

	const invalidRequest = () =>
		client("/users/1", {
			// @ts-expect-error -- plugin options remain typed
			traceId: 123,
		});

	expectTypeOf(validRequest).toBeFunction();
	expectTypeOf(invalidRequest).toBeFunction();
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
