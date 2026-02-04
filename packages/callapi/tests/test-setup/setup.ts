/**
 * Test setup file with global mocks and configuration
 * This file is loaded before all tests to set up the testing environment
 */

import { beforeEach, vi } from "vitest";

// Global fetch mock - we only need to mock the actual network calls
export const mockFetch = vi.fn();

beforeEach(() => {
	// Suppress console.warn for "Invalid URL" warnings in tests
	// These warnings are expected when testing relative URLs without baseURL
	const originalConsoleError = console.error;

	console.error = (...args) => {
		const message = args[0];
		if (typeof message === "string" && message.includes("Invalid URL")) return;

		originalConsoleError(...args);
	};
});
