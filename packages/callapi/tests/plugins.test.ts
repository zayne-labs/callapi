/**
 * Plugin system tests
 */

import { describe, expect, it } from "vitest";
import { createFetchClient } from "../src/createFetchClient";
import type { CallApiPlugin } from "../src/plugins";
import { mockUser } from "./fixtures";
import { createMockResponse, expectErrorResult, expectSuccessResult } from "./helpers";
import { mockFetch } from "./setup";

describe("plugins", () => {
	it("should default to pluginsFirst and run hooks in order when sequential", async () => {
		const order: string[] = [];

		const orderingPlugin: CallApiPlugin = {
			hooks: {
				onRequest: () => {
					order.push("plugin");
				},
			},
			id: "ordering-plugin",
			name: "Ordering Plugin",
		};

		const client = createFetchClient({
			baseURL: "https://api.example.com",
			// Do not set hooksRegistrationOrder to use default (pluginsFirst)
			onRequest: () => {
				order.push("main");
			},
			plugins: [orderingPlugin],
		});

		mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

		await client("/users/1", { hooksExecutionMode: "sequential" });

		expect(order).toEqual(["plugin", "main"]);
		expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/users/1", expect.any(Object));
	});

	it("should respect hooksRegistrationOrder=mainFirst when sequential", async () => {
		const order: string[] = [];

		const plugin: CallApiPlugin = {
			hooks: {
				onRequest: () => order.push("plugin"),
			},
			id: "order-main-first",
			name: "Order Main First",
		};

		const client = createFetchClient({
			baseURL: "https://api.example.com",
			onRequest: () => order.push("main"),
			plugins: [plugin],
		});

		mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

		await client("/users/1", {
			hooksExecutionMode: "sequential",
			hooksRegistrationOrder: "mainFirst",
		});

		expect(order).toEqual(["main", "plugin"]);
	});

	it("should execute multiple plugins in provided order (pluginsFirst)", async () => {
		const order: string[] = [];

		const p1: CallApiPlugin = {
			hooks: { onRequest: () => order.push("p1") },
			id: "p1",
			name: "P1",
		};
		const p2: CallApiPlugin = {
			hooks: { onRequest: () => order.push("p2") },
			id: "p2",
			name: "P2",
		};

		const client = createFetchClient({
			baseURL: "https://api.example.com",
			onRequest: () => order.push("main"),
			plugins: [p1, p2],
		});

		mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
		await client("/users/1", { hooksExecutionMode: "sequential" });

		expect(order).toEqual(["p1", "p2", "main"]);
	});

	it("should compose base hook array with instance hook preserving order", async () => {
		const order: string[] = [];

		const baseB1 = () => order.push("base1");
		const baseB2 = () => order.push("base2");
		const instI3 = () => order.push("inst3");
		const plugin: CallApiPlugin = {
			hooks: { onRequest: () => order.push("plugin") },
			id: "pl",
			name: "PL",
		};

		const client = createFetchClient({
			baseURL: "https://api.example.com",
			onRequest: [baseB1, baseB2],
			plugins: [plugin],
		});

		mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
		await client("/users/1", { hooksExecutionMode: "sequential", onRequest: instI3 });

		// With pluginsFirst: plugin then base1, base2, inst3
		expect(order).toEqual(["plugin", "base1", "base2", "inst3"]);
	});

	it("should allow plugin setup to modify initURL and request options", async () => {
		const setupPlugin: CallApiPlugin = {
			hooks: {
				onRequest: (ctx) => {
					// Confirm we see POST before fetch
					expect(ctx.request.method).toBe("POST");
				},
			},
			id: "setup-plugin",
			name: "Setup Plugin",
			setup: () => {
				return {
					initURL: "/users/2",
					request: { method: "POST" },
				};
			},
		};

		const client = createFetchClient({ baseURL: "https://api.example.com", plugins: [setupPlugin] });

		mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

		const result = await client("/users/1");
		expectSuccessResult(result);
		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/users/2",
			expect.objectContaining({ method: "POST" })
		);
	});

	it("should support plugins config as a function with basePlugins", async () => {
		const order: string[] = [];
		const basePlugin: CallApiPlugin = {
			hooks: { onRequest: () => order.push("base") },
			id: "base",
			name: "Base",
		};
		const extraPlugin: CallApiPlugin = {
			hooks: { onRequest: () => order.push("extra") },
			id: "extra",
			name: "Extra",
		};

		const client = createFetchClient({ baseURL: "https://api.example.com", plugins: [basePlugin] });

		mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

		await client("/users/1", {
			hooksExecutionMode: "sequential",
			plugins: ({ basePlugins }) => [...basePlugins, extraPlugin],
		});

		expect(order).toEqual(["base", "extra"]);
	});

	it("should handle plugin without hooks and without setup", async () => {
		const noOpPlugin: CallApiPlugin = { id: "noop", name: "Noop" } as CallApiPlugin;
		const client = createFetchClient({ baseURL: "https://api.example.com", plugins: [noOpPlugin] });

		mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));
		const result = await client("/users/1");
		expectSuccessResult(result);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it("should reject when plugin setup throws before request", async () => {
		const failingSetup: CallApiPlugin = {
			id: "fail-setup",
			name: "Fail Setup",
			setup: () => {
				throw new Error("setup failed");
			},
		};

		const client = createFetchClient({ baseURL: "https://api.example.com", plugins: [failingSetup] });

		await expect(client("/users/1")).rejects.toThrow("setup failed");
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it("should surface plugin onRequest errors as result error and execute error hooks", async () => {
		const errorOrder: string[] = [];

		const throwingPlugin: CallApiPlugin = {
			hooks: {
				onRequest: () => {
					throw new Error("plugin request error");
				},
			},
			id: "throw-on-request",
			name: "Throw On Request",
		};

		const client = createFetchClient({
			baseURL: "https://api.example.com",
			onError: () => errorOrder.push("onError"),
			onRequestError: () => errorOrder.push("onRequestError"),
			plugins: [throwingPlugin],
		});

		// Even though hooks throw before fetch, the client should return an error result (not throw)
		const result = await client("/users/1");
		expectErrorResult(result);
		const err = result.error;
		expect(err.message).toContain("plugin request error");
		expect(errorOrder).toEqual(["onRequestError", "onError"]);
		expect(mockFetch).not.toHaveBeenCalled();
	});
});
