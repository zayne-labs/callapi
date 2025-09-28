/**
 * URL Processing and Parameter Tests
 *
 * Tests for URL processing functionality including:
 * - Object-style parameter substitution (:param and {param} patterns)
 * - Array-style positional parameter substitution
 * - Query parameter serialization and URL encoding
 * - Method modifier extraction from URLs (@get/, @post/, etc.)
 * - BaseURL merging for relative and absolute URLs
 */

import { beforeEach, describe, expect, it } from "vitest";
import { callApi, createFetchClient } from "../src";
import { extractMethodFromURL, getFullAndNormalizedURL } from "../src/url";
import { type GetMethodContext, getMethod, toQueryString } from "../src/utils/common";
import { mockUser } from "./fixtures";
import { createMockResponse, expectSuccessResult } from "./helpers";
import { mockFetch } from "./setup";

describe("URL Processing and Parameter Tests", () => {
	beforeEach(() => {
		mockFetch.mockResolvedValue(createMockResponse(mockUser));
	});

	describe("Object-style parameter substitution", () => {
		it("should substitute :param patterns with object values", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:id/posts/:postId",
				params: { id: "123", postId: "456" },
				query: undefined,
			});

			expect(result.fullURL).toBe("/users/123/posts/456");
			expect(result.normalizedInitURL).toBe("/users/:id/posts/:postId");
		});

		it("should substitute {param} patterns with object values", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/{id}/posts/{postId}",
				params: { id: "123", postId: "456" },
				query: undefined,
			});

			expect(result.fullURL).toBe("/users/123/posts/456");
			expect(result.normalizedInitURL).toBe("/users/{id}/posts/{postId}");
		});

		it("should substitute mixed :param and {param} patterns", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:userId/posts/{postId}/comments/:commentId",
				params: { commentId: "comment789", postId: "post456", userId: "user123" },
				query: undefined,
			});

			expect(result.fullURL).toBe("/users/user123/posts/post456/comments/comment789");
		});

		it("should handle single parameter substitution", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:id",
				params: { id: "single-user" },
				query: undefined,
			});

			expect(result.fullURL).toBe("/users/single-user");
		});

		it("should handle numeric parameter values", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:id/age/{age}",
				params: { age: 25, id: 123 },
				query: undefined,
			});

			expect(result.fullURL).toBe("/users/123/age/25");
		});

		it("should handle boolean parameter values", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:id/active/{active}",
				params: { active: true, id: "user1" },
				query: undefined,
			});

			expect(result.fullURL).toBe("/users/user1/active/true");
		});

		it("should leave unmatched parameters in URL unchanged", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:id/posts/:postId",
				params: { id: "123" }, // missing postId
				query: undefined,
			});

			expect(result.fullURL).toBe("/users/123/posts/:postId");
		});

		it("should ignore extra parameters not in URL", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:id",
				params: { extraParam: "ignored", id: "123" },
				query: undefined,
			});

			expect(result.fullURL).toBe("/users/123");
		});
	});

	describe("Array-style positional parameter substitution", () => {
		it("should substitute parameters in order for :param patterns", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:id/posts/:postId",
				params: ["123", "456"],
				query: undefined,
			});

			expect(result.fullURL).toBe("/users/123/posts/456");
		});

		it("should substitute parameters in order for {param} patterns", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/{id}/posts/{postId}",
				params: ["123", "456"],
				query: undefined,
			});

			expect(result.fullURL).toBe("/users/123/posts/456");
		});

		it("should substitute parameters in order for mixed patterns", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:userId/posts/{postId}/comments/:commentId",
				params: ["user123", "post456", "comment789"],
				query: undefined,
			});

			expect(result.fullURL).toBe("/users/user123/posts/post456/comments/comment789");
		});

		it("should handle single array parameter", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:id",
				params: ["single-user"],
				query: undefined,
			});

			expect(result.fullURL).toBe("/users/single-user");
		});

		it("should handle numeric array values", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:id/posts/:postId",
				params: [123, 456],
				query: undefined,
			});

			expect(result.fullURL).toBe("/users/123/posts/456");
		});

		it("should handle insufficient array parameters", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:id/posts/:postId",
				params: ["123"], // missing second parameter
				query: undefined,
			});

			// The actual behavior is that undefined gets converted to string "undefined"
			expect(result.fullURL).toBe("/users/123/posts/undefined");
		});

		it("should ignore extra array parameters", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:id",
				params: ["123", "extra", "ignored"],
				query: undefined,
			});

			expect(result.fullURL).toBe("/users/123");
		});

		it("should handle empty array parameters", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:id/posts/:postId",
				params: [],
				query: undefined,
			});

			// The actual behavior is that undefined gets converted to string "undefined"
			expect(result.fullURL).toBe("/users/undefined/posts/undefined");
		});
	});

	describe("Query parameter serialization and URL encoding", () => {
		it("should serialize simple query parameters", () => {
			const queryString = toQueryString({ limit: 10, page: 1 });
			expect(queryString).toBe("limit=10&page=1");
		});

		it("should serialize string query parameters", () => {
			const queryString = toQueryString({
				category: "users",
				search: "john doe",
			});
			expect(queryString).toBe("category=users&search=john+doe");
		});

		it("should serialize boolean query parameters", () => {
			const queryString = toQueryString({
				active: true,
				verified: false,
			});
			expect(queryString).toBe("active=true&verified=false");
		});

		it("should handle special characters in query values", () => {
			const queryString = toQueryString({
				search: "hello world!",
				"special-key": "special value & more",
			});
			expect(queryString).toBe("search=hello+world%21&special-key=special+value+%26+more");
		});

		it("should append query parameters to URL without existing query", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users",
				params: undefined,
				query: { limit: 10, page: 1 },
			});

			expect(result.fullURL).toBe("/users?limit=10&page=1");
		});

		it("should append query parameters to URL with existing query", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users?sort=name",
				params: undefined,
				query: { limit: 10, page: 1 },
			});

			expect(result.fullURL).toBe("/users?sort=name&limit=10&page=1");
		});

		it("should append query parameters to URL ending with ?", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users?",
				params: undefined,
				query: { limit: 10, page: 1 },
			});

			expect(result.fullURL).toBe("/users?limit=10&page=1");
		});

		it("should handle complex query parameters", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users",
				params: undefined,
				query: {
					active: true,
					limit: 10,
					page: 1,
					search: "john doe",
					tags: "tag1,tag2",
				},
			});

			expect(result.fullURL).toBe(
				"/users?active=true&limit=10&page=1&search=john+doe&tags=tag1%2Ctag2"
			);
		});

		it("should combine parameters and query", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:id/posts",
				params: { id: "123" },
				query: { limit: 5, page: 1 },
			});

			expect(result.fullURL).toBe("/users/123/posts?limit=5&page=1");
		});

		it("should handle empty query object", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users",
				params: undefined,
				query: {},
			});

			expect(result.fullURL).toBe("/users");
		});
	});

	describe("Method modifier extraction from URLs", () => {
		it("should extract GET method from @get/ prefix", () => {
			const method = extractMethodFromURL("@get/users");
			expect(method).toBe("get");
		});

		it("should extract POST method from @post/ prefix", () => {
			const method = extractMethodFromURL("@post/users");
			expect(method).toBe("post");
		});

		it("should extract PUT method from @put/ prefix", () => {
			const method = extractMethodFromURL("@put/users/:id");
			expect(method).toBe("put");
		});

		it("should extract DELETE method from @delete/ prefix", () => {
			const method = extractMethodFromURL("@delete/users/:id");
			expect(method).toBe("delete");
		});

		it("should extract PATCH method from @patch/ prefix", () => {
			const method = extractMethodFromURL("@patch/users/:id");
			expect(method).toBe("patch");
		});

		it("should return undefined for URLs without method prefix", () => {
			const method = extractMethodFromURL("/users");
			expect(method).toBeUndefined();
		});

		it("should return undefined for URLs with invalid method prefix", () => {
			const method = extractMethodFromURL("@invalid/users");
			expect(method).toBeUndefined();
		});

		it("should return undefined for malformed method prefix", () => {
			const method = extractMethodFromURL("@/users");
			expect(method).toBeUndefined();
		});

		it("should return undefined for undefined URL", () => {
			const method = extractMethodFromURL(undefined);
			expect(method).toBeUndefined();
		});

		it("should return undefined for empty URL", () => {
			const method = extractMethodFromURL("");
			expect(method).toBeUndefined();
		});

		it("should handle method prefix with complex URLs", () => {
			const method = extractMethodFromURL("@get/api/v1/users/:id/posts/{postId}");
			expect(method).toBe("get");
		});
	});

	describe("getMethod function", () => {
		it("should prioritize explicit method over URL method", () => {
			const context: GetMethodContext = {
				initURL: "@get/users",
				method: "POST",
			};

			const method = getMethod(context);
			expect(method).toBe("POST");
		});

		it("should use URL method when no explicit method provided", () => {
			const context: GetMethodContext = {
				initURL: "@post/users",
				method: undefined,
			};

			const method = getMethod(context);
			expect(method).toBe("POST");
		});

		it("should use default method when no method specified", () => {
			const context: GetMethodContext = {
				initURL: "/users",
				method: undefined,
			};

			const method = getMethod(context);
			expect(method).toBe("GET"); // Default method
		});

		it("should handle lowercase explicit method", () => {
			const context: GetMethodContext = {
				initURL: "@get/users",
				method: "post",
			};

			const method = getMethod(context);
			expect(method).toBe("POST");
		});

		it("should handle mixed case explicit method", () => {
			const context: GetMethodContext = {
				initURL: "@get/users",
				method: "PaTcH",
			};

			const method = getMethod(context);
			expect(method).toBe("PATCH");
		});
	});

	describe("BaseURL merging for relative and absolute URLs", () => {
		it("should prepend baseURL to relative URLs", () => {
			const result = getFullAndNormalizedURL({
				baseURL: "https://api.example.com",
				initURL: "/users",
				params: undefined,
				query: undefined,
			});

			expect(result.fullURL).toBe("https://api.example.com/users");
		});

		it("should not prepend baseURL to absolute HTTP URLs", () => {
			const result = getFullAndNormalizedURL({
				baseURL: "https://api.example.com",
				initURL: "https://other-api.com/users",
				params: undefined,
				query: undefined,
			});

			expect(result.fullURL).toBe("https://other-api.com/users");
		});

		it("should not prepend baseURL to absolute HTTPS URLs", () => {
			const result = getFullAndNormalizedURL({
				baseURL: "https://api.example.com",
				initURL: "http://other-api.com/users",
				params: undefined,
				query: undefined,
			});

			expect(result.fullURL).toBe("http://other-api.com/users");
		});

		it("should handle baseURL with trailing slash", () => {
			const result = getFullAndNormalizedURL({
				baseURL: "https://api.example.com/",
				initURL: "/users",
				params: undefined,
				query: undefined,
			});

			expect(result.fullURL).toBe("https://api.example.com//users");
		});

		it("should handle baseURL without trailing slash", () => {
			const result = getFullAndNormalizedURL({
				baseURL: "https://api.example.com",
				initURL: "/users",
				params: undefined,
				query: undefined,
			});

			expect(result.fullURL).toBe("https://api.example.com/users");
		});

		it("should handle relative URL without leading slash", () => {
			const result = getFullAndNormalizedURL({
				baseURL: "https://api.example.com",
				initURL: "users",
				params: undefined,
				query: undefined,
			});

			// The actual behavior is that URLs without leading slash get concatenated directly
			expect(result.fullURL).toBe("https://api.example.comusers");
		});

		it("should handle baseURL with path", () => {
			const result = getFullAndNormalizedURL({
				baseURL: "https://api.example.com/v1",
				initURL: "/users",
				params: undefined,
				query: undefined,
			});

			expect(result.fullURL).toBe("https://api.example.com/v1/users");
		});

		it("should handle undefined baseURL", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users",
				params: undefined,
				query: undefined,
			});

			expect(result.fullURL).toBe("/users");
		});

		it("should combine baseURL with parameters and query", () => {
			const result = getFullAndNormalizedURL({
				baseURL: "https://api.example.com",
				initURL: "/users/:id",
				params: { id: "123" },
				query: { include: "profile" },
			});

			expect(result.fullURL).toBe("https://api.example.com/users/123?include=profile");
		});
	});

	describe("URL normalization with method modifiers", () => {
		it("should normalize @get/ prefix and return clean URL", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "@get/users/:id",
				params: { id: "123" },
				query: undefined,
			});

			expect(result.fullURL).toBe("/users/123");
			expect(result.normalizedInitURL).toBe("/users/:id");
		});

		it("should normalize @post/ prefix with baseURL", () => {
			const result = getFullAndNormalizedURL({
				baseURL: "https://api.example.com",
				initURL: "@post/users",
				params: undefined,
				query: { validate: true },
			});

			expect(result.fullURL).toBe("https://api.example.com/users?validate=true");
			expect(result.normalizedInitURL).toBe("/users");
		});

		it("should normalize complex method-prefixed URLs", () => {
			const result = getFullAndNormalizedURL({
				baseURL: "https://api.example.com/v1",
				initURL: "@put/users/{userId}/posts/:postId",
				params: { postId: "post456", userId: "user123" },
				query: { update: "partial" },
			});

			expect(result.fullURL).toBe(
				"https://api.example.com/v1/users/user123/posts/post456?update=partial"
			);
			expect(result.normalizedInitURL).toBe("/users/{userId}/posts/:postId");
		});

		it("should not modify URLs without method prefix", () => {
			const result = getFullAndNormalizedURL({
				baseURL: "https://api.example.com",
				initURL: "/users/:id",
				params: { id: "123" },
				query: undefined,
			});

			expect(result.fullURL).toBe("https://api.example.com/users/123");
			expect(result.normalizedInitURL).toBe("/users/:id");
		});
	});

	describe("Integration tests with createFetchClient", () => {
		it("should handle object parameters in real API calls", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
			});

			const result = await client("/users/:id", {
				params: { id: "123" },
				resultMode: "all",
			});

			expectSuccessResult(result);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/123",
				expect.objectContaining({
					method: "GET",
				})
			);
		});

		it("should handle array parameters in real API calls", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
			});

			const result = await client("/users/:id/posts/:postId", {
				params: ["user123", "post456"],
				resultMode: "all",
			});

			expectSuccessResult(result);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/user123/posts/post456",
				expect.objectContaining({
					method: "GET",
				})
			);
		});

		it("should handle query parameters in real API calls", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
			});

			const result = await client("/users", {
				query: { active: true, limit: 10, page: 1 },
				resultMode: "all",
			});

			expectSuccessResult(result);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users?active=true&limit=10&page=1",
				expect.objectContaining({
					method: "GET",
				})
			);
		});

		it("should handle method modifiers in real API calls", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com",
			});

			const result = await client("@post/users", {
				body: { email: "john@example.com", name: "John" },
				resultMode: "all",
			});

			expectSuccessResult(result);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users",
				expect.objectContaining({
					method: "POST",
				})
			);
		});

		it("should handle complex URL processing in real API calls", async () => {
			const client = createFetchClient({
				baseURL: "https://api.example.com/v1",
			});

			const result = await client("@put/users/{userId}/posts/:postId", {
				body: { title: "Updated Post" },
				params: { postId: "post456", userId: "user123" },
				query: { update: "partial", validate: true },
				resultMode: "all",
			});

			expectSuccessResult(result);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/v1/users/user123/posts/post456?update=partial&validate=true",
				expect.objectContaining({
					body: JSON.stringify({ title: "Updated Post" }),
					method: "PUT",
				})
			);
		});

		it("should handle callApi function with URL processing", async () => {
			const result = await callApi("@delete/users/:id", {
				baseURL: "https://api.example.com",
				params: { id: "123" },
				query: { force: true },
				resultMode: "all",
			});

			expectSuccessResult(result);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/123?force=true",
				expect.objectContaining({
					method: "DELETE",
				})
			);
		});
	});

	describe("Edge cases and error handling", () => {
		it("should handle empty string URL", () => {
			const result = getFullAndNormalizedURL({
				baseURL: "https://api.example.com",
				initURL: "",
				params: undefined,
				query: undefined,
			});

			expect(result.fullURL).toBe("https://api.example.com");
		});

		it("should handle special characters in parameter values", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:id",
				params: { id: "user@example.com" },
				query: undefined,
			});

			expect(result.fullURL).toBe("/users/user@example.com");
		});

		it("should handle URL with fragment", () => {
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:id#profile",
				params: { id: "123" },
				query: { tab: "settings" },
			});

			expect(result.fullURL).toBe("/users/123#profile?tab=settings");
		});

		it("should handle very long parameter values", () => {
			const longValue = "a".repeat(1000);
			const result = getFullAndNormalizedURL({
				baseURL: undefined,
				initURL: "/users/:id",
				params: { id: longValue },
				query: undefined,
			});

			expect(result.fullURL).toBe(`/users/${longValue}`);
		});
	});
});
