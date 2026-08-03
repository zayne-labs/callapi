import { vi } from "vitest";

export const createFetchMock = () => {
	const mockFetch = vi.fn();
	globalThis.fetch = mockFetch as never;
	return {
		[Symbol.dispose]: () => {
			mockFetch.mockRestore();
		},
	};
};

export const createMockResponse = (data: unknown, status = 200) => {
	return Response.json(data, { status });
};

export const createMockErrorResponse = (data: unknown, status: number) => {
	return Response.json(data, { status, statusText: "Error" });
};

export const mockFetchSuccess = (data: unknown) => {
	globalThis.fetch = vi.fn().mockResolvedValue(createMockResponse(data));
};

export const mockFetchError = (data: unknown, status: number) => {
	globalThis.fetch = vi.fn().mockResolvedValue(createMockErrorResponse(data, status));
};
