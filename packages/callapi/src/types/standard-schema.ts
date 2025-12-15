/* eslint-disable ts-eslint/no-namespace -- Allow */

/**
 * The Standard Schema interface.
 * @see https://github.com/standard-schema/standard-schema
 */

// #########################
// ###   Standard Typed  ###
// #########################

/** The Standard Typed interface. This is a base type extended by other specs. */
export interface StandardTypedV1<Input = unknown, Output = Input> {
	/** The Standard properties. */
	readonly "~standard": StandardTypedV1.Props<Input, Output>;
}

export declare namespace StandardTypedV1 {
	/** The Standard Typed properties interface. */
	export interface Props<Input = unknown, Output = Input> {
		/** Inferred types associated with the schema. */
		readonly types?: Types<Input, Output> | undefined;
		/** The vendor name of the schema library. */
		readonly vendor: string;
		/** The version number of the standard. */
		readonly version: 1;
	}

	/** The Standard Typed types interface. */
	export interface Types<Input = unknown, Output = Input> {
		/** The input type of the schema. */
		readonly input: Input;
		/** The output type of the schema. */
		readonly output: Output;
	}

	/** Infers the input type of a Standard Typed. */
	export type InferInput<Schema extends StandardTypedV1> = NonNullable<
		Schema["~standard"]["types"]
	>["input"];

	/** Infers the output type of a Standard Typed. */
	export type InferOutput<Schema extends StandardTypedV1> = NonNullable<
		Schema["~standard"]["types"]
	>["output"];
}

// ##########################
// ###   Standard Schema  ###
// ##########################

/** The Standard Schema interface. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
	/** The Standard Schema properties. */
	readonly "~standard": StandardSchemaV1.Props<Input, Output>;
}

export declare namespace StandardSchemaV1 {
	/** The Standard Schema properties interface. */
	export interface Props<Input = unknown, Output = Input> extends StandardTypedV1.Props<Input, Output> {
		/** Validates unknown input values. */
		readonly validate: (
			value: unknown,
			options?: StandardSchemaV1.Options
		) => Promise<Result<Output>> | Result<Output>;
	}

	/** The result interface of the validate function. */
	export type Result<Output> = FailureResult | SuccessResult<Output>;

	/** The result interface if validation succeeds. */
	export interface SuccessResult<Output> {
		/** A falsy value for `issues` indicates success. */
		readonly issues?: undefined;
		/** The typed output value. */
		readonly value: Output;
	}

	export interface Options {
		/** Explicit support for additional vendor-specific parameters, if needed. */
		readonly libraryOptions?: Record<string, unknown> | undefined;
	}

	/** The result interface if validation fails. */
	export interface FailureResult {
		/** The issues of failed validation. */
		readonly issues: readonly Issue[];
	}

	/** The issue interface of the failure output. */
	export interface Issue {
		/** The error message of the issue. */
		readonly message: string;
		/** The path of the issue, if any. */
		readonly path?: ReadonlyArray<PathSegment | PropertyKey> | undefined;
	}

	/** The path segment interface of the issue. */
	export interface PathSegment {
		/** The key representing a path segment. */
		readonly key: PropertyKey;
	}

	/** The Standard types interface. */
	export type Types<Input = unknown, Output = Input> = StandardTypedV1.Types<Input, Output>;

	/** Infers the input type of a Standard. */
	export type InferInput<Schema extends StandardTypedV1> = StandardTypedV1.InferInput<Schema>;

	/** Infers the output type of a Standard. */
	export type InferOutput<Schema extends StandardTypedV1> = StandardTypedV1.InferOutput<Schema>;
}

// ###############################
// ###   Standard JSON Schema  ###
// ###############################

/** The Standard JSON Schema interface. */
export interface StandardJSONSchemaV1<Input = unknown, Output = Input> {
	/** The Standard JSON Schema properties. */
	readonly "~standard": StandardJSONSchemaV1.Props<Input, Output>;
}

export declare namespace StandardJSONSchemaV1 {
	/** The Standard JSON Schema properties interface. */
	export interface Props<Input = unknown, Output = Input> extends StandardTypedV1.Props<Input, Output> {
		/** Methods for generating the input/output JSON Schema. */
		readonly jsonSchema: StandardJSONSchemaV1.Converter;
	}

	/** The Standard JSON Schema converter interface. */
	export interface Converter {
		/** Converts the input type to JSON Schema. May throw if conversion is not supported. */
		readonly input: (options: StandardJSONSchemaV1.Options) => Record<string, unknown>;
		/** Converts the output type to JSON Schema. May throw if conversion is not supported. */
		readonly output: (options: StandardJSONSchemaV1.Options) => Record<string, unknown>;
	}

	/**
	 * The target version of the generated JSON Schema.
	 *
	 * It is *strongly recommended* that implementers support `"draft-2020-12"` and `"draft-07"`, as they are both in wide use. All other targets can be implemented on a best-effort basis. Libraries should throw if they don't support a specified target.
	 *
	 * The `"openapi-3.0"` target is intended as a standardized specifier for OpenAPI 3.0 which is a superset of JSON Schema `"draft-04"`.
	 */
	export type Target =
		| "draft-07"
		| "draft-2020-12"
		| "openapi-3.0"
		// Accepts any string for future targets while preserving autocomplete
		| (string & {});

	/** The options for the input/output methods. */
	export interface Options {
		/** Explicit support for additional vendor-specific parameters, if needed. */
		readonly libraryOptions?: Record<string, unknown> | undefined;

		/** Specifies the target version of the generated JSON Schema. Support for all versions is on a best-effort basis. If a given version is not supported, the library should throw. */
		readonly target: Target;
	}

	/** The Standard types interface. */
	export type Types<Input = unknown, Output = Input> = StandardTypedV1.Types<Input, Output>;

	/** Infers the input type of a Standard. */
	export type InferInput<Schema extends StandardTypedV1> = StandardTypedV1.InferInput<Schema>;

	/** Infers the output type of a Standard. */
	export type InferOutput<Schema extends StandardTypedV1> = StandardTypedV1.InferOutput<Schema>;
}
