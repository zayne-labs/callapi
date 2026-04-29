import { createFetchClientWithContext } from "../../src";

export const createTestFetchClient = createFetchClientWithContext();

export const callTestApi = createTestFetchClient({
	debugMode: false,
});
