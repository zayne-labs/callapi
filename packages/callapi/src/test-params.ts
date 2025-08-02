/* eslint-disable ts-eslint/no-unused-vars -- allow */
// Test file to verify the InferParamsFromRoute type works with mixed patterns
import type { InferParamsFromRoute } from "./types/conditional-types";

// Test cases
type Test1 = InferParamsFromRoute<"users/{id}/:version">;
type Test2 = InferParamsFromRoute<"users/{id}/posts/{postId}/:action">;
type Test3 = InferParamsFromRoute<"users/:userId/posts/{postId}">;
type Test4 = InferParamsFromRoute<"users/{id}">;
type Test5 = InferParamsFromRoute<"users/:id">;
type Test6 = InferParamsFromRoute<"users/static/path">;

// Debug: Let's see what Test3 actually resolves to
type Test3Debug = Test3;

// Test both object and tuple forms
const test1Object: Test1 = { id: "123", version: "v1" };
const test1Tuple: Test1 = ["123", "v1"];

const test2Object: Test2 = { action: "edit", id: "123", postId: "456" };
const test2Tuple: Test2 = ["123", "456", "edit"];

// Test3 should extract both userId and postId from "users/:userId/posts/{postId}"
const test3Object: Test3 = { postId: "456", userId: "123" };
const test3Tuple: Test3 = ["123", "456"];

const test4Object: Test4 = { id: "123" };
const test4Tuple: Test4 = ["123"];

const test5Object: Test5 = { id: "123" };
const test5Tuple: Test5 = ["123"];
