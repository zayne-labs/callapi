/**
 * Authentication system tests
 * Tests all authentication types and auth header generation
 */

import { describe, expect, it } from "vitest";
import { callApi, createFetchClient } from "../src/createFetchClient";
import { mockAuthToken, mockBasicAuth, mockCustomAuth, mockUser } from "./fixtures";
import { createMockResponse, expectSuccessResult } from "./helpers";
import { mockFetch } from "./setup";

describe("Authentication System", () => {
	describe("Bearer token authentication", () => {
		it("should handle Bearer token as string", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			await callApi("https://api.example.com/users/1", { auth: mockAuthToken });

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({ Authorization: `Bearer ${mockAuthToken}` }),
				})
			);
		});

		it.each([
			["auth object", { value: mockAuthToken, type: "Bearer" as const }],
			["function value", { value: () => mockAuthToken, type: "Bearer" as const }],
		])("should handle Bearer token with %s", async (_, auth) => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			await callApi("https://api.example.com/users/1", { auth });

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({ Authorization: `Bearer ${mockAuthToken}` }),
				})
			);
		});

		it("should handle async Bearer token function", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const getTokenAsync = async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return mockAuthToken;
			};

			await callApi("https://api.example.com/users/1", {
				auth: { value: getTokenAsync, type: "Bearer" },
			});

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({ Authorization: `Bearer ${mockAuthToken}` }),
				})
			);
		});

		it("should handle undefined Bearer token", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			await callApi("https://api.example.com/users/1", {
				auth: { value: undefined, type: "Bearer" },
			});

			const callArgs = mockFetch.mock.calls[0]?.[1] as RequestInit;
			const headers = callArgs.headers as Record<string, string>;
			expect(headers.Authorization).toBeUndefined();
		});
	});

	describe("Basic authentication", () => {
		it("should handle Basic auth with username and password", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			await callApi("https://api.example.com/users/1", {
				auth: {
					password: mockBasicAuth.password,
					type: "Basic",
					username: mockBasicAuth.username,
				},
			});

			// Verify the Basic auth header is correctly encoded
			const expectedEncoded = globalThis.btoa(`${mockBasicAuth.username}:${mockBasicAuth.password}`);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `Basic ${expectedEncoded}`,
					}),
				})
			);
		});

		it("should handle Basic auth with function values", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const getUsername = () => mockBasicAuth.username;
			const getPassword = () => mockBasicAuth.password;

			await callApi("https://api.example.com/users/1", {
				auth: {
					password: getPassword,
					type: "Basic",
					username: getUsername,
				},
			});

			const expectedEncoded = globalThis.btoa(`${mockBasicAuth.username}:${mockBasicAuth.password}`);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `Basic ${expectedEncoded}`,
					}),
				})
			);
		});

		it("should handle async Basic auth functions", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const getUsernameAsync = async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return mockBasicAuth.username;
			};

			const getPasswordAsync = async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return mockBasicAuth.password;
			};

			await callApi("https://api.example.com/users/1", {
				auth: {
					password: getPasswordAsync,
					type: "Basic",
					username: getUsernameAsync,
				},
			});

			const expectedEncoded = globalThis.btoa(`${mockBasicAuth.username}:${mockBasicAuth.password}`);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `Basic ${expectedEncoded}`,
					}),
				})
			);
		});

		it("should handle empty username or password", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			await callApi("https://api.example.com/users/1", {
				auth: {
					password: "password",
					type: "Basic",
					username: "",
				},
			});

			const expectedEncoded = globalThis.btoa(":password");

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `Basic ${expectedEncoded}`,
					}),
				})
			);
		});
	});

	describe("Token authentication", () => {
		it.each([
			["token value", { type: "Token" as const, value: mockAuthToken }],
			["function value", { type: "Token" as const, value: () => mockAuthToken }],
		])("should handle Token auth with %s", async (_, auth) => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			await callApi("https://api.example.com/users/1", { auth });

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({ Authorization: `Token ${mockAuthToken}` }),
				})
			);
		});

		it("should handle async Token auth function", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const getTokenAsync = async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return mockAuthToken;
			};

			await callApi("https://api.example.com/users/1", {
				auth: {
					type: "Token",
					value: getTokenAsync,
				},
			});

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `Token ${mockAuthToken}`,
					}),
				})
			);
		});

		it("should handle undefined token", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			await callApi("https://api.example.com/users/1", {
				auth: {
					type: "Token",
					value: undefined,
				},
			});

			// Should not include Authorization header when token is undefined
			const callArgs = mockFetch.mock.calls[0]?.[1] as RequestInit;
			const headers = callArgs.headers as Record<string, string>;
			expect(headers.Authorization).toBeUndefined();
		});
	});

	describe("Custom authentication", () => {
		it("should handle Custom auth with prefix and value", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			await callApi("https://api.example.com/users/1", {
				auth: {
					prefix: mockCustomAuth.prefix,
					type: "Custom",
					value: mockCustomAuth.value,
				},
			});

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `${mockCustomAuth.prefix} ${mockCustomAuth.value}`,
					}),
				})
			);
		});

		it("should handle Custom auth with function values", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const getPrefix = () => mockCustomAuth.prefix;
			const getValue = () => mockCustomAuth.value;

			await callApi("https://api.example.com/users/1", {
				auth: {
					prefix: getPrefix,
					type: "Custom",
					value: getValue,
				},
			});

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `${mockCustomAuth.prefix} ${mockCustomAuth.value}`,
					}),
				})
			);
		});

		it("should handle async Custom auth functions", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const getPrefixAsync = async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return mockCustomAuth.prefix;
			};

			const getValueAsync = async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return mockCustomAuth.value;
			};

			await callApi("https://api.example.com/users/1", {
				auth: {
					prefix: getPrefixAsync,
					type: "Custom",
					value: getValueAsync,
				},
			});

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `${mockCustomAuth.prefix} ${mockCustomAuth.value}`,
					}),
				})
			);
		});

		it("should handle Custom auth with different prefix formats", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			await callApi("https://api.example.com/users/1", {
				auth: {
					prefix: "X-API-Key",
					type: "Custom",
					value: "secret-key-123",
				},
			});

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "X-API-Key secret-key-123",
					}),
				})
			);
		});
	});

	describe("Authentication with createFetchClient", () => {
		it("should inherit auth from base config", async () => {
			const client = createFetchClient({
				auth: {
					value: mockAuthToken,
					type: "Bearer",
				},
				baseURL: "https://api.example.com",
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const result = await client("/users/1");

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `Bearer ${mockAuthToken}`,
					}),
				})
			);

			expectSuccessResult(result);
		});

		it("should allow instance auth to override base auth", async () => {
			const client = createFetchClient({
				auth: {
					value: "base-token",
					type: "Bearer",
				},
				baseURL: "https://api.example.com",
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			await client("/users/1", {
				auth: {
					value: "instance-token",
					type: "Bearer",
				},
			});

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "Bearer instance-token",
					}),
				})
			);
		});

		it("should handle different auth types between base and instance", async () => {
			const client = createFetchClient({
				auth: {
					value: mockAuthToken,
					type: "Bearer",
				},
				baseURL: "https://api.example.com",
			});

			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			await client("/users/1", {
				auth: {
					password: mockBasicAuth.password,
					type: "Basic",
					username: mockBasicAuth.username,
				},
			});

			const expectedEncoded = globalThis.btoa(`${mockBasicAuth.username}:${mockBasicAuth.password}`);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `Basic ${expectedEncoded}`,
					}),
				})
			);
		});
	});

	describe("Authentication error scenarios", () => {
		it("should handle async auth function that rejects", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const getTokenWithError = () => {
				throw new Error("Auth token retrieval failed");
			};

			// The auth function error should propagate
			await expect(
				callApi("https://api.example.com/users/1", {
					auth: {
						value: getTokenWithError,
						type: "Bearer",
					},
					throwOnError: true,
				})
			).rejects.toThrow("Auth token retrieval failed");
		});
	});

	describe("Authentication with special characters", () => {
		it("should handle Basic auth with special characters in password", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const specialPassword = "p@ssw0rd!#$%";

			await callApi("https://api.example.com/users/1", {
				auth: {
					password: specialPassword,
					type: "Basic",
					username: "user",
				},
			});

			const expectedEncoded = globalThis.btoa(`user:${specialPassword}`);

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `Basic ${expectedEncoded}`,
					}),
				})
			);
		});

		it("should handle Custom auth with special characters", async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

			const specialValue = "key-with-special-chars!@#$%^&*()";

			await callApi("https://api.example.com/users/1", {
				auth: {
					prefix: "X-Special",
					type: "Custom",
					value: specialValue,
				},
			});

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.example.com/users/1",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: `X-Special ${specialValue}`,
					}),
				})
			);
		});
	});
});
