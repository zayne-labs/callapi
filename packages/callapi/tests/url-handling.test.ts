/**
 * URL Integration Tests
 *
 * Tests for URL processing in the context of the fetch client (callApi and createFetchClient).
 */

import { beforeEach, describe, expect, it } from "vitest";
import { callApi, createFetchClient } from "../src";
import { mockUser } from "./fixtures";
import { createMockResponse, expectSuccessResult } from "./helpers";
import { mockFetch } from "./setup";

describe("URL Integration Tests", () => {
	beforeEach(() => {
		mockFetch.mockResolvedValue(createMockResponse(mockUser));
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
});
