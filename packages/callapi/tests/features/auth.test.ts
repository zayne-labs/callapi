/**
 * Authentication tests - flat structure without nested describe blocks
 * Tests Bearer, Basic, Token, and Custom auth types with sync/async values
 */

import { expect, test } from "vitest";
import { callApi, createFetchClient } from "../../src/createFetchClient";
import { expectSuccessResult } from "../test-setup/assertions";
import { createFetchMock, mockFetchSuccess } from "../test-setup/fetch-mock";
import { mockAuthToken, mockBasicAuth, mockCustomAuth, mockUser } from "../test-setup/fixtures";

test("Bearer token as string sets Authorization header correctly", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("https://api.example.com/users/1", { auth: mockAuthToken });

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/1",
		expect.objectContaining({
			headers: expect.objectContaining({ Authorization: `Bearer ${mockAuthToken}` }),
		})
	);
});

test("Bearer token with auth object sets Authorization header correctly", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("https://api.example.com/users/1", {
		auth: { value: mockAuthToken, type: "Bearer" },
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/1",
		expect.objectContaining({
			headers: expect.objectContaining({ Authorization: `Bearer ${mockAuthToken}` }),
		})
	);
});

test("Bearer token with function value resolves and sets header", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("https://api.example.com/users/1", {
		auth: { value: () => mockAuthToken, type: "Bearer" },
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/1",
		expect.objectContaining({
			headers: expect.objectContaining({ Authorization: `Bearer ${mockAuthToken}` }),
		})
	);
});

test("Bearer token with async function resolves and sets header", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

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

test("Bearer token with undefined value does not set Authorization header", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("https://api.example.com/users/1", {
		auth: { value: undefined, type: "Bearer" },
	});

	const callArgs = mockFetch.mock.calls[0]?.[1] as RequestInit;
	const headers = callArgs.headers as Record<string, string>;
	expect(headers.Authorization).toBeUndefined();
});

test("Basic auth with username and password encodes correctly", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("https://api.example.com/users/1", {
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

test("Basic auth with function values resolves and encodes correctly", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

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

test("Basic auth with async functions resolves and encodes correctly", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

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

test("Basic auth with empty username encodes correctly", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

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

test("Token auth with value sets Authorization header correctly", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("https://api.example.com/users/1", {
		auth: { type: "Token", value: mockAuthToken },
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/1",
		expect.objectContaining({
			headers: expect.objectContaining({ Authorization: `Token ${mockAuthToken}` }),
		})
	);
});

test("Token auth with function value resolves and sets header", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("https://api.example.com/users/1", {
		auth: { type: "Token", value: () => mockAuthToken },
	});

	expect(mockFetch).toHaveBeenCalledWith(
		"https://api.example.com/users/1",
		expect.objectContaining({
			headers: expect.objectContaining({ Authorization: `Token ${mockAuthToken}` }),
		})
	);
});

test("Token auth with async function resolves and sets header", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

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

test("Token auth with undefined value does not set Authorization header", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	await callApi("https://api.example.com/users/1", {
		auth: {
			type: "Token",
			value: undefined,
		},
	});

	const callArgs = mockFetch.mock.calls[0]?.[1] as RequestInit;
	const headers = callArgs.headers as Record<string, string>;
	expect(headers.Authorization).toBeUndefined();
});

test("Custom auth with prefix and value sets Authorization header correctly", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

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

test("Custom auth with function values resolves and sets header", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

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

test("Custom auth with async functions resolves and sets header", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

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

test("Custom auth with different prefix formats works correctly", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

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

test("createFetchClient inherits auth from base config", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	const client = createFetchClient({
		auth: {
			value: mockAuthToken,
			type: "Bearer",
		},
		baseURL: "https://api.example.com",
	});

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

test("instance auth overrides base auth in createFetchClient", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	const client = createFetchClient({
		auth: {
			value: "base-token",
			type: "Bearer",
		},
		baseURL: "https://api.example.com",
	});

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

test("instance auth can use different type than base auth", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	const client = createFetchClient({
		auth: {
			value: mockAuthToken,
			type: "Bearer",
		},
		baseURL: "https://api.example.com",
	});

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

test("async auth function that throws propagates error", async () => {
	using _ignoredMockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

	const getTokenWithError = () => {
		throw new Error("Auth token retrieval failed");
	};

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

test("Basic auth with special characters in password encodes correctly", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

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

test("Custom auth with special characters in value works correctly", async () => {
	using mockFetch = createFetchMock();
	mockFetchSuccess(mockUser);

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
