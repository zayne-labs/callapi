/**
 * Validation error tests - flat structure without nested describe blocks
 * Tests ValidationError creation, formatting, and issue handling
 */

import { expect, test } from "vitest";
import type { StandardSchemaV1 } from "../../src/types/standard-schema";
import { HTTPError, ValidationError } from "../../src/utils/external/error";
import { createMockResponse } from "../test-setup/fetch-mock";

test("ValidationError.isError correctly identifies ValidationError instances", () => {
	const validationError = new ValidationError({
		issueCause: "unknown",
		issues: [{ message: "Test error", path: [] }],
		response: null,
	});

	expect(ValidationError.isError(validationError)).toBe(true);
	expect(ValidationError.isError(new Error("Regular error"))).toBe(false);
	expect(
		ValidationError.isError(
			new HTTPError({
				errorData: {},
				response: createMockResponse({}),
				defaultHTTPErrorMessage: "Test",
			})
		)
	).toBe(false);
	expect(ValidationError.isError(null)).toBe(false);
	expect(ValidationError.isError(undefined)).toBe(false);
	expect(ValidationError.isError("string")).toBe(false);
	expect(ValidationError.isError({})).toBe(false);
});

test("ValidationError is created with proper issue formatting for multiple fields", () => {
	const validationIssues: StandardSchemaV1.Issue[] = [
		{
			message: "Invalid email format",
			path: ["email"],
		},
		{
			message: "Name is required",
			path: ["name"],
		},
	];

	const validationError = new ValidationError({
		issueCause: "unknown",
		issues: validationIssues,
		response: null,
	});

	expect(validationError.name).toBe("ValidationError");
	expect(validationError.errorData).toEqual(validationIssues);
	expect(validationError.message).toContain("Invalid email format → at email");
	expect(validationError.message).toContain("Name is required → at name");
});

test("ValidationError formats nested path correctly with dot notation", () => {
	const validationIssues: StandardSchemaV1.Issue[] = [
		{
			message: "Invalid nested field",
			path: ["user", "profile", "settings", "theme"],
		},
	];

	const validationError = new ValidationError({
		issueCause: "unknown",
		issues: validationIssues,
		response: null,
	});

	expect(validationError.message).toContain("Invalid nested field → at user.profile.settings.theme");
});

test("ValidationError handles empty path for root level validation errors", () => {
	const validationIssues: StandardSchemaV1.Issue[] = [
		{
			message: "Root level validation error",
			path: [],
		},
	];

	const validationError = new ValidationError({
		issueCause: "unknown",
		issues: validationIssues,
		response: null,
	});

	expect(validationError.message).toContain("Root level validation error");
});

test("ValidationError handles single issue correctly", () => {
	const validationIssues: StandardSchemaV1.Issue[] = [
		{
			message: "Password must be at least 8 characters",
			path: ["password"],
		},
	];

	const validationError = new ValidationError({
		issueCause: "unknown",
		issues: validationIssues,
		response: null,
	});

	expect(validationError.name).toBe("ValidationError");
	expect(validationError.errorData).toEqual(validationIssues);
	expect(validationError.message).toContain("Password must be at least 8 characters → at password");
});

test("ValidationError handles complex nested paths with arrays", () => {
	const validationIssues: StandardSchemaV1.Issue[] = [
		{
			message: "Invalid item",
			path: ["items", 0, "name"],
		},
		{
			message: "Invalid quantity",
			path: ["items", 1, "quantity"],
		},
	];

	const validationError = new ValidationError({
		issueCause: "unknown",
		issues: validationIssues,
		response: null,
	});

	expect(validationError.message).toContain("Invalid item → at items.0.name");
	expect(validationError.message).toContain("Invalid quantity → at items.1.quantity");
});

test("ValidationError stores response when provided", () => {
	const mockResponse = createMockResponse({ error: "validation failed" }, 422);

	const validationIssues: StandardSchemaV1.Issue[] = [
		{
			message: "Validation failed",
			path: ["field"],
		},
	];

	const validationError = new ValidationError({
		issueCause: "unknown",
		issues: validationIssues,
		response: mockResponse,
	});

	expect(validationError.response).toBe(mockResponse);
});

test("ValidationError handles multiple issues with same path", () => {
	const validationIssues: StandardSchemaV1.Issue[] = [
		{
			message: "Must be a valid email",
			path: ["email"],
		},
		{
			message: "Email is already taken",
			path: ["email"],
		},
	];

	const validationError = new ValidationError({
		issueCause: "unknown",
		issues: validationIssues,
		response: null,
	});

	expect(validationError.message).toContain("Must be a valid email → at email");
	expect(validationError.message).toContain("Email is already taken → at email");
});
