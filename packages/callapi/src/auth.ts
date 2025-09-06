/* eslint-disable perfectionist/sort-object-types -- Avoid Sorting for now */

import type { CallApiExtraOptions } from "./types/common";
import type { Awaitable } from "./types/type-helpers";
import { isFunction, isObject, isPromise } from "./utils/guards";

type PossibleAuthValue = Awaitable<string | null | undefined>;

type PossibleAuthValueOrGetter = PossibleAuthValue | (() => PossibleAuthValue);

export type BearerOrTokenAuth =
	| {
			type?: "Bearer";
			bearer?: PossibleAuthValueOrGetter;
			token?: never;
	  }
	| {
			type?: "Token";
			bearer?: never;
			token?: PossibleAuthValueOrGetter;
	  };

export type BasicAuth = {
	type: "Basic";
	username: PossibleAuthValueOrGetter;
	password: PossibleAuthValueOrGetter;
};

/**
 * Custom auth
 *
 * @param prefix - prefix of the header
 * @param authValue - value of the header
 *
 * @example
 * ```ts
 * {
 *  type: "Custom",
 *  prefix: "Token",
 *  authValue: "token"
 * }
 * ```
 */
export type CustomAuth = {
	type: "Custom";
	prefix: PossibleAuthValueOrGetter;
	value: PossibleAuthValueOrGetter;
};

// eslint-disable-next-line perfectionist/sort-union-types -- Let the first one be first
export type Auth = PossibleAuthValueOrGetter | BearerOrTokenAuth | BasicAuth | CustomAuth;

const resolveAuthValue = (value: PossibleAuthValueOrGetter) => (isFunction(value) ? value() : value);

type AuthHeaderObject = { Authorization: string };

export const getAuthHeader = async (
	auth: CallApiExtraOptions["auth"]
): Promise<AuthHeaderObject | undefined> => {
	if (auth === undefined) return;

	if (isPromise(auth) || isFunction(auth) || !isObject(auth)) {
		const authValue = await resolveAuthValue(auth);

		if (authValue === undefined) return;

		return {
			Authorization: `Bearer ${authValue}`,
		};
	}

	switch (auth.type) {
		case "Basic": {
			const [username, password] = await Promise.all([
				resolveAuthValue(auth.username),
				resolveAuthValue(auth.password),
			]);

			if (username === undefined || password === undefined) return;

			return {
				Authorization: `Basic ${globalThis.btoa(`${username}:${password}`)}`,
			};
		}

		case "Custom": {
			const [prefix, value] = await Promise.all([
				resolveAuthValue(auth.prefix),
				resolveAuthValue(auth.value),
			]);

			if (value === undefined) return;

			return {
				Authorization: `${prefix} ${value}`,
			};
		}

		default: {
			const [bearer, token] = await Promise.all([
				resolveAuthValue(auth.bearer),
				resolveAuthValue(auth.token),
			]);

			if (bearer !== undefined) {
				return { Authorization: `Bearer ${bearer}` };
			}

			if (token === undefined) return;

			return { Authorization: `Token ${token}` };
		}
	}
};
