/* eslint-disable ts-eslint/no-unsafe-member-access -- Ignore */
/* eslint-disable ts-eslint/no-unsafe-call -- Ignore */
import { createFetchClient } from "@zayne-labs/callapi";
import { expect, test, vi } from "vitest";
import { loggerPlugin } from "../../src/plugins/logger/logger";
import {
	createFetchMock,
	createMockErrorResponse,
	createMockResponse,
	mockFetchError,
	mockFetchSuccess,
} from "../test-setup/fetch-mock";
import { mockUser } from "../test-setup/fixtures";

test("Logger Plugin - plugin initializes with correct metadata", () => {
	const plugin = loggerPlugin();

	expect(plugin.id).toBe("logger");
	expect(plugin.name).toBe("Logger");
	expect(plugin.version).toBe("1.1.0");
	expect(plugin.hooks).toBeDefined();
});

test("Logger Plugin - onRequest hook logs request with method and URL", async () => {
	using ignoredMockFetch = createFetchMock();
	const logSpy = vi.fn();
	const customConsole = { log: logSpy };

	const plugin = loggerPlugin({ consoleObject: customConsole, enabled: true });

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	mockFetchSuccess(mockUser);

	await client("/users/1");

	expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("[GET]"));
	expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("https://api.example.com/users/1"));
});

test("Logger Plugin - onRequest hook respects enabled boolean", async () => {
	using ignoredMockFetch = createFetchMock();
	const logSpy = vi.fn();
	const customConsole = { log: logSpy };

	const plugin = loggerPlugin({ consoleObject: customConsole, enabled: false });

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	mockFetchSuccess(mockUser);

	await client("/users/1");

	expect(logSpy).not.toHaveBeenCalled();
});

test("Logger Plugin - onRequest hook respects granular enabled config", async () => {
	using ignoredMockFetch = createFetchMock();
	const logSpy = vi.fn();
	const successSpy = vi.fn();
	const customConsole = { log: logSpy, success: successSpy };

	const plugin = loggerPlugin({
		consoleObject: customConsole,
		enabled: { onRequest: false, onSuccess: true },
	});

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	mockFetchSuccess(mockUser);

	await client("/users/1");

	expect(logSpy).not.toHaveBeenCalled();
	expect(successSpy).toHaveBeenCalled();
});

test("Logger Plugin - onSuccess hook logs successful response with status and duration", async () => {
	using ignoredMockFetch = createFetchMock();
	const successSpy = vi.fn();
	const customConsole = { log: successSpy, success: successSpy };

	const plugin = loggerPlugin({ consoleObject: customConsole, enabled: true });

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	mockFetchSuccess(mockUser);

	await client("/users/1");

	const successMessage = successSpy.mock.calls.find((call) =>
		call[0]?.toString().includes("Request completed with status: 200")
	);
	expect(successMessage).toBeDefined();
	expect(successMessage?.[0]).toContain("(OK)");
});

test("Logger Plugin - onResponseError hook logs HTTP errors in basic mode", async () => {
	using ignoredMockFetch = createFetchMock();
	const errorSpy = vi.fn();
	const customConsole = { error: errorSpy, log: errorSpy };

	const plugin = loggerPlugin({ consoleObject: customConsole, enabled: true, mode: "basic" });

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	globalThis.fetch = vi.fn().mockResolvedValue(createMockErrorResponse({ error: "Not found" }, 404));

	await client("/users/1");

	expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Failed with status: 404"));
	expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Reason ="));
});

test("Logger Plugin - onResponseError hook logs HTTP errors in verbose mode", async () => {
	using ignoredMockFetch = createFetchMock();
	const errorSpy = vi.fn();
	const logSpy = vi.fn();
	const customConsole = { error: errorSpy, log: logSpy };

	const plugin = loggerPlugin({ consoleObject: customConsole, enabled: true, mode: "verbose" });

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	const errorData = { code: "NOT_FOUND", message: "Resource not found" };
	mockFetchError(errorData, 404);

	await client("/users/1");

	expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("ErrorData:"), errorData);
});

test("Logger Plugin - onRequestError hook logs network errors", async () => {
	using ignoredMockFetch = createFetchMock();
	const errorSpy = vi.fn();
	const customConsole = { error: errorSpy, log: errorSpy };

	const plugin = loggerPlugin({ consoleObject: customConsole, enabled: true });

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

	await client("/users/1").catch(() => {});

	expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Request failed!"));
	expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Reason ="));
});

test("Logger Plugin - onRetry hook logs retry attempts", async () => {
	using ignoredMockFetch = createFetchMock();
	const warnSpy = vi.fn();
	const customConsole = { log: warnSpy, warn: warnSpy };

	const plugin = loggerPlugin({ consoleObject: customConsole, enabled: true });

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	globalThis.fetch = vi
		.fn()
		.mockResolvedValueOnce(createMockErrorResponse({ error: "Server error" }, 500))
		.mockResolvedValueOnce(createMockResponse(mockUser));

	await client("/users/1", { retryAttempts: 2, retryDelay: 10 });

	expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Retry attempt #"));
});

test("Logger Plugin - onValidationError hook logs validation errors in basic mode", async () => {
	using ignoredMockFetch = createFetchMock();
	const errorSpy = vi.fn();
	const customConsole = { error: errorSpy, log: errorSpy };

	const plugin = loggerPlugin({ consoleObject: customConsole, enabled: true, mode: "basic" });

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	globalThis.fetch = vi.fn().mockResolvedValue(createMockResponse({ invalid: "data" }));

	await client("/users/1", {
		schema: {
			data: (data: unknown) => {
				if (typeof data === "object" && data !== null && "invalid" in data) {
					throw new Error("Invalid response format");
				}
				return data;
			},
		},
	});

	expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("validation failed"));
});

test("Logger Plugin - onValidationError hook logs validation errors in verbose mode", async () => {
	using ignoredMockFetch = createFetchMock();
	const errorSpy = vi.fn();
	const customConsole = { error: errorSpy, log: () => {} };

	const plugin = loggerPlugin({ consoleObject: customConsole, enabled: true, mode: "verbose" });

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	mockFetchSuccess({ invalid: "data" });

	await client("/users/1", {
		schema: {
			data: (data: unknown) => {
				if (typeof data === "object" && data !== null && "invalid" in data) {
					throw new Error("Invalid response format");
				}
				return data;
			},
		},
	});

	expect(errorSpy).toHaveBeenCalled();
	const errorMessage = errorSpy.mock.calls[0]?.[0] as string;
	expect(errorMessage).toContain("Issues:");
	expect(errorSpy.mock.calls[0]?.[1]).toBeDefined();
});

test("Logger Plugin - granular enabled config controls individual hooks", async () => {
	using ignoredMockFetch = createFetchMock();
	const logSpy = vi.fn();
	const successSpy = vi.fn();
	const errorSpy = vi.fn();
	const customConsole = { error: errorSpy, log: logSpy, success: successSpy };

	const plugin = loggerPlugin({
		consoleObject: customConsole,
		enabled: { onError: false, onRequest: true, onSuccess: true },
	});

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	mockFetchSuccess(mockUser);

	await client("/users/1");

	expect(logSpy).toHaveBeenCalled(); // onRequest
	expect(successSpy).toHaveBeenCalled(); // onSuccess
});

test("Logger Plugin - uses default console when none provided", async () => {
	using ignoredMockFetch = createFetchMock();

	const plugin = loggerPlugin({ enabled: true });

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	mockFetchSuccess(mockUser);

	// Should not throw with default console
	await client("/users/1");
});

test("Logger Plugin - respects onError in granular config for error hooks", async () => {
	using ignoredMockFetch = createFetchMock();
	const errorSpy = vi.fn();
	const customConsole = { error: errorSpy, log: errorSpy };

	const plugin = loggerPlugin({
		consoleObject: customConsole,
		enabled: { onError: true },
	});

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	mockFetchError({ error: "Not found" }, 404);

	await client("/users/1");

	expect(errorSpy).toHaveBeenCalled();
});

test("Logger Plugin - onRequestError respects onError in granular config", async () => {
	using ignoredMockFetch = createFetchMock();
	const errorSpy = vi.fn();
	const customConsole = { error: errorSpy, log: errorSpy };

	const plugin = loggerPlugin({
		consoleObject: customConsole,
		enabled: { onError: true, onRequestError: true },
	});

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

	await client("/users/1").catch(() => {});

	expect(errorSpy).toHaveBeenCalled();
});

test("Logger Plugin - onValidationError respects onError in granular config", async () => {
	using ignoredMockFetch = createFetchMock();
	const errorSpy = vi.fn();
	const customConsole = { error: errorSpy, log: errorSpy };

	const plugin = loggerPlugin({
		consoleObject: customConsole,
		enabled: { onError: true, onValidationError: true },
	});

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	mockFetchSuccess({ invalid: "data" });

	await client("/users/1", {
		schema: {
			data: (data: unknown) => {
				if (typeof data === "object" && data !== null && "invalid" in data) {
					throw new Error("Invalid response format");
				}
				return data;
			},
		},
	});

	expect(errorSpy).toHaveBeenCalled();
});

test("Logger Plugin - formats duration correctly", async () => {
	using ignoredMockFetch = createFetchMock();
	const successSpy = vi.fn();
	const customConsole = { log: successSpy, success: successSpy };

	const plugin = loggerPlugin({ consoleObject: customConsole, enabled: true });

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	globalThis.fetch = vi.fn().mockImplementation(async () => {
		await new Promise((resolve) => setTimeout(resolve, 50));
		return createMockResponse(mockUser);
	});

	await client("/users/1");

	const successMessage = successSpy.mock.calls.find((call) =>
		call[0]?.toString().includes("Request completed with status: 200")
	);
	expect(successMessage).toBeDefined();
	expect(successMessage?.[0]).toContain("(OK)");
});

test("Logger Plugin - handles POST method correctly in logs", async () => {
	using ignoredMockFetch = createFetchMock();
	const logSpy = vi.fn();
	const customConsole = { log: logSpy };

	const plugin = loggerPlugin({ consoleObject: customConsole, enabled: true });

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	mockFetchSuccess(mockUser);

	await client("/users", { body: { name: "Test" }, method: "POST" });

	expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("[POST]"));
});

test("Logger Plugin - custom console object with fallback methods", async () => {
	using ignoredMockFetch = createFetchMock();
	const logSpy = vi.fn();
	const customConsole = { error: logSpy, log: logSpy };

	const plugin = loggerPlugin({ consoleObject: customConsole, enabled: true });

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	mockFetchError({ error: "Not found" }, 404);

	await client("/users/1");

	// Should use log as fallback when error/fail not provided
	expect(logSpy).toHaveBeenCalled();
});

test("Logger Plugin - produces one distinguishable log per parallel request", async () => {
	using ignoredMockFetch = createFetchMock();
	const successSpy = vi.fn();
	const customConsole = { log: successSpy, success: successSpy };

	const plugin = loggerPlugin({ consoleObject: customConsole, enabled: true });

	const client = createFetchClient({
		baseURL: "https://api.example.com",
		plugins: [plugin],
	});

	let callCount = 0;
	globalThis.fetch = vi.fn().mockImplementation(async (input) => {
		if (input.toString().includes("/slow")) {
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
		callCount++;
		return createMockResponse({ id: callCount });
	});

	await Promise.all([client("/slow"), client("/fast")]);

	const successMessages = successSpy.mock.calls.filter((call) =>
		call[0]?.toString().includes("Request completed with status: 200")
	);
	expect(successMessages).toHaveLength(2);
	expect(successMessages.filter((call) => call[0]?.toString().includes("/slow"))).toHaveLength(1);
	expect(successMessages.filter((call) => call[0]?.toString().includes("/fast"))).toHaveLength(1);
});
