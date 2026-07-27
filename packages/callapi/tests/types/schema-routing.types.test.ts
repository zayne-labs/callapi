import { expectTypeOf, test } from "vitest";
import { z } from "zod";
import { createFetchClient, type CallApiResult, type InferParamsFromRoute } from "../../src";
import type { StandardSchemaV1 } from "../../src/types/standard-schema";
import { defineSchema } from "../../src/utils/external";

type CreateUserInput = {
	age: string;
	name: string;
};

type CreateUserBody = {
	age: number;
	name: string;
};

type User = CreateUserBody & {
	id: string;
};

type ApiError = {
	code: string;
};

const standardSchema = <TInput, TOutput>(
	validate: (input: TInput) => TOutput
): StandardSchemaV1<TInput, TOutput> => ({
	"~standard": {
		validate: (input) => ({ value: validate(input as TInput) }),
		vendor: "callapi-type-tests",
		version: 1,
	},
});

const createUserBodySchema = standardSchema<CreateUserInput, CreateUserBody>((input) => ({
	age: Number(input.age),
	name: input.name,
}));

const userSchema = standardSchema<unknown, User>((input) => input as User);
const errorSchema = standardSchema<unknown, ApiError>((input) => input as ApiError);
const paramsSchema = standardSchema<{ id: string }, { id: string }>((input) => input);
const querySchema = standardSchema<{ notify?: boolean }, { notify?: boolean }>((input) => input);
const preprocessedBodySchema = z.preprocess(
	(input: { count: string }) => ({ count: Number(input.count) }),
	z.object({ count: z.number() })
);

const schema = defineSchema(
	{
		"@post/users/:id": {
			body: createUserBodySchema,
			data: userSchema,
			errorData: errorSchema,
			params: paramsSchema,
			query: querySchema,
		},
		"/health": {
			data: standardSchema<unknown, { status: "ok" }>(() => ({ status: "ok" })),
		},
		"@post/preprocessed": {
			body: preprocessedBodySchema,
		},
	},
	{ strict: true }
);

const client = createFetchClient({
	baseURL: "https://api.example.com",
	schema,
});

test("Schema types - infer route body, params, query, and result", () => {
	const createUserRequest = () =>
		client("@post/users/:id", {
			body: { age: 42, name: "Ryan" },
			bodyTransformer: ({ body }) => {
				expectTypeOf(body).toEqualTypeOf<CreateUserBody>();
				return JSON.stringify(body);
			},
			params: { id: "user-1" },
			query: { notify: true },
		});

	expectTypeOf(createUserRequest).returns.toEqualTypeOf<Promise<CallApiResult<User, ApiError, null>>>();

	const validRequest = () =>
		client("@post/users/:id", {
			body: { age: 42, name: "Ryan" },
			params: { id: "user-1" },
			query: {},
		});

	expectTypeOf(validRequest).returns.toEqualTypeOf<Promise<CallApiResult<User, ApiError, null>>>();
});

test("Schema types - require schema-defined request options", () => {
	const missingConfig = () =>
		// @ts-expect-error -- a route with a required body cannot omit its config
		client("@post/users/:id");

	const missingBody = () =>
		// @ts-expect-error -- body is required by the route schema
		client("@post/users/:id", { params: { id: "user-1" }, query: {} });

	const invalidBody = () =>
		client("@post/users/:id", {
			// @ts-expect-error -- request options use the schema output shape
			body: { age: "42", name: "Ryan" },
			params: { id: "user-1" },
			query: {},
		});

	const invalidParams = () =>
		client("@post/users/:id", {
			body: { age: 42, name: "Ryan" },
			// @ts-expect-error -- id is required by the params schema
			params: {},
			query: {},
		});

	expectTypeOf(missingConfig).toBeFunction();
	expectTypeOf(missingBody).toBeFunction();
	expectTypeOf(invalidBody).toBeFunction();
	expectTypeOf(invalidParams).toBeFunction();
});

test("Schema types - enforce strict routes", () => {
	const missingRoute = () =>
		// @ts-expect-error -- strict schemas reject routes that are not declared
		client("/missing");
	const healthRequest = () => client("/health");

	expectTypeOf(missingRoute).toBeFunction();
	expectTypeOf(healthRequest).returns.toEqualTypeOf<
		Promise<CallApiResult<{ status: "ok" }, unknown, null>>
	>();
});

test("Schema types - expose transformed output to bodyTransformer", () => {
	const validRequest = () =>
		client("@post/preprocessed", {
			body: { count: 2 },
			bodyTransformer: ({ body }) => {
				expectTypeOf(body).toEqualTypeOf<{ count: number }>();
				return JSON.stringify(body);
			},
		});

	const invalidRequest = () =>
		client("@post/preprocessed", {
			// @ts-expect-error -- preprocess keeps the same output-shaped request contract
			body: { count: "2" },
		});

	expectTypeOf(validRequest).toBeFunction();
	expectTypeOf(invalidRequest).toBeFunction();
});

test("Schema types - infer path params from colon and brace syntax", () => {
	expectTypeOf<InferParamsFromRoute<"/users/:userId/posts/{postId}">>().toEqualTypeOf<
		| [boolean | number | string, boolean | number | string]
		| { postId: boolean | number | string; userId: boolean | number | string }
	>();

	expectTypeOf<InferParamsFromRoute<"/users/static">>().toEqualTypeOf<
		Array<boolean | number | string> | Record<string, boolean | number | string>
	>();
});
