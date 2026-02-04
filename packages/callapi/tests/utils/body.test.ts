/**
 * Body conversion utility tests - flat structure
 */

import { expect, test } from "vitest";
import { toFormData, toQueryString } from "../../src/utils/external/body";

// toQueryString
test("toQueryString converts objects to query strings and handles expansions", () => {
	expect(toQueryString({ a: 1, b: "2" })).toBe("a=1&b=2");
	expect(toQueryString({ tags: ["js", "ts"] })).toBe("tags=js&tags=ts");
	expect(toQueryString({ meta: { x: 1 } })).toBe("meta=%7B%22x%22%3A1%7D");
});

test("toQueryString handles special characters and empty values", () => {
	expect(toQueryString({ search: "hello world" })).toBe("search=hello+world");
	expect(toQueryString({})).toBe("");
});

// toFormData
test("toFormData converts plain objects with primitives to FormData", () => {
	const data = { name: "John", age: 30, active: true };
	const formData = toFormData(data);

	expect(formData).toBeInstanceOf(FormData);
	expect(formData.get("name")).toBe("John");
	expect(formData.get("age")).toBe("30");
	expect(formData.get("active")).toBe("true");
});

test("toFormData handles arrays and appends items with same key", () => {
	const data = { tags: ["js", "ts"] };
	const formData = toFormData(data);

	expect(formData.getAll("tags")).toEqual(["js", "ts"]);
});

test("toFormData handles Blob and File values", () => {
	const blob = new Blob(["test"], { type: "text/plain" });
	const formData = toFormData({ file: blob });

	const result = formData.get("file");
	expect(result).toBeInstanceOf(Blob);
	expect((result as Blob).size).toBe(4);
});

test("toFormData JSON stringifies nested objects", () => {
	const data = { user: { name: "John" } };
	const formData = toFormData(data);

	expect(formData.get("user")).toBe('{"name":"John"}');
});

test("toFormData handles complex mixed data types", () => {
	const blob = new Blob(["avatar"]);
	const data = {
		name: "John",
		tags: ["dev"],
		avatar: blob,
		meta: { level: 1 },
	};

	const formData = toFormData(data);
	expect(formData.get("name")).toBe("John");
	expect(formData.getAll("tags")).toEqual(["dev"]);
	expect(formData.get("avatar")).toBeInstanceOf(Blob);
	expect(formData.get("meta")).toBe('{"level":1}');
});

test("toFormData handles objects with null prototype", () => {
	const data = Object.create(null);
	data.name = "John";
	expect(toFormData(data).get("name")).toBe("John");
});
