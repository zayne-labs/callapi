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
});

// Export the mock fetch for use in tests
export { mockFetch };

// Global test configuration
export const TEST_CONFIG = {
	baseURL: "https://api.example.com",
	mockDelay: 100,
	retryAttempts: 3,
	timeout: 5000,
} as const;
