/**
 * Test setup file with global mocks and configuration
 * This file is loaded before all tests to set up the testing environment
 */

import { beforeEach, vi } from "vitest";

// Global fetch mock - we only need to mock the actual network calls
const mockFetch = vi.fn();

// Set up global fetch mock
beforeEach(() => {
	// Reset all mocks and their implementations before each test
	// This prevents mockResolvedValueOnce/mockRejectedValueOnce leakage across tests
	vi.resetAllMocks();

	// Mock global fetch to intercept network calls
	globalThis.fetch = mockFetch;

	// Suppress console.warn for "Invalid URL" warnings in tests
	// These warnings are expected when testing relative URLs without baseURL
	const originalConsoleError = console.error;
	console.error = (...args) => {
		const message = args[0];
		if (typeof message === "string" && message.includes("Invalid URL")) return;

		originalConsoleError(...args);
	};
});

// Export the mock fetch for use in tests
export { mockFetch };
