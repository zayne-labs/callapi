<h1 align="center">CallApi</h1>

<p align="center">
  <img src="https://raw.githubusercontent.com/zayne-labs/callapi/refs/heads/main/apps/docs/public/logo.png" alt="CallApi Logo" width="30%">
</p>

<p align="center">
   <!-- <a href="https://deno.bundlejs.com/badge?q=@zayne-labs/callapi,@zayne-labs/callapi&treeshake=%5B*%5D,%5B%7B+createFetchClient+%7D%5D&config=%7B%22compression%22:%7B%22type%22:%22brotli%22,%22quality%22:11%7D%7D"><img src="https://deno.bundlejs.com/badge?q=@zayne-labs/callapi,@zayne-labs/callapi&treeshake=%5B*%5D,%5B%7B+createFetchClient+%7D%5D&config=%7B%22compression%22:%7B%22type%22:%22brotli%22,%22quality%22:11%7D%7D" alt="bundle size"></a> -->
   <a href="https://www.npmjs.com/package/@zayne-labs/callapi"><img src="https://img.shields.io/npm/v/@zayne-labs/callapi?style=flat&color=EFBA5F" alt="npm version"></a>
   <a href="https://github.com/zayne-labs/callapi/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/@zayne-labs/callapi?style=flat&color=EFBA5F" alt="license"></a>
   <a href="https://www.npmjs.com/package/@zayne-labs/callapi"><img src="https://img.shields.io/npm/dm/@zayne-labs/callapi?style=flat&color=EFBA5F" alt="downloads per month"></a>
   <a href="https://github.com/zayne-labs/callapi/graphs/commit-activity"><img src="https://img.shields.io/github/commit-activity/m/zayne-labs/callapi?style=flat&color=EFBA5F" alt="commit activity"></a>
 <a href="https://deepwiki.com/zayne-labs/callapi"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
   <a href="https://code2tutorial.com/tutorial/f77cfbd0-3c37-4c37-9608-b3c977e46f00/index.md"><img src="https://img.shields.io/badge/Code2Tutorial-blue?color=blue&logo=victoriametrics" alt="Code2Tutorial"></a>
 </p>

<p align="center">
  <strong>An advanced fetch library that actually solves real problems.</strong>
</p>

<p align="center">
  <a href="https://zayne-labs-callapi.netlify.app"><strong>Documentation</strong></a> ·
  <a href="https://zayne-labs-callapi.netlify.app/docs/getting-started"><strong>Getting Started</strong></a> ·
  <a href="https://github.com/zayne-labs/callapi/tree/main/packages/callapi-plugins"><strong>Plugins</strong></a>
</p>

---

## Why?

Fetch is too basic for real apps. You end up writing the same boilerplate: error handling, retries, deduplication, response parsing etc. CallApi handles all of that and practically more.

**Drop-in replacement for fetch. Under 6KB. Zero dependencies.**

```js
import { callApi } from "@zayne-labs/callapi";

const { data, error } = await callApi("/api/users");
```

## Features

**Request Deduplication** - User spam-clicks a button? Handled. No race conditions.

```js
const req1 = callApi("/api/user");
const req2 = callApi("/api/user"); // Shares req1's response
```

**Smart Response Parsing** - Looks at Content-Type, does the right thing.

```js
const { data } = await callApi("/api/data"); // JSON? Parsed.
```

**Error Handling** - Structured errors you can actually use.

```js
const { data, error } = await callApi("/api/users");

if (error) {
 console.log(error.name); // "HTTPError", "ValidationError"
 console.log(error.errorData); // Actual API response
}
```

**Retries** - Exponential backoff, custom conditions.

```js
await callApi("/api/data", {
 retryAttempts: 3,
 retryStrategy: "exponential",
 retryStatusCodes: [429, 500, 502, 503],
});
```

**Schema Validation** - TypeScript types + runtime validation.

```js
import { z } from "zod";
import { defineSchema, createFetchClient } from "@zayne-labs/callapi";

const callMainApi = createFetchClient({
 schema: defineSchema({
  "/users/:id": {
   data: z.object({
    id: z.number(),
    name: z.string(),
   }),
  },
 }),
});

const user = await callMainApi("/users/123"); // Fully typed + validated
```

**Hooks** - Intercept at any point.

```js
const api = createFetchClient({
 onRequest: ({ request }) => {
  request.headers.set("Authorization", `Bearer ${token}`);
 },
 onError: ({ error }) => {
  Sentry.captureException(error);
 },
 onResponseStream: ({ event }) => {
  console.log(`Downloaded ${event.progress}%`);
 },
});
```

**Plugins** - Extend with setup, hooks, and middleware.

```js
const metricsPlugin = definePlugin({
 id: "metrics",
 name: "Metrics Plugin",

 setup: ({ options }) => ({
  options: {
   ...options,
   meta: { startTime: Date.now() },
  },
 }),

 hooks: {
  onSuccess: ({ options }) => {
   const duration = Date.now() - options.meta.startTime;

   console.info(`Request took ${duration}ms`);
  },
 },

 middlewares: {
  fetchMiddleware: (ctx) => async (input, init) => {
   console.info("→", input);

   const response = await ctx.fetchImpl(input, init);

   console.info("←", response.status);
   return response;
  },
 },
});

const api = createFetchClient({
 plugins: [metricsPlugin],
});
```

**URL Helpers** - Dynamic params, query strings, method prefixes.

```js
await callApi("/users/:id", { params: { id: 123 } });
await callApi("/search", { query: { q: "test" } });
await callApi("@delete/users/123");
```

**See the [full documentation](https://zayne-labs-callapi.netlify.app/docs) for all features.**

## Installation

```bash
npm install @zayne-labs/callapi
```

```js
import { callApi, createFetchClient } from "@zayne-labs/callapi";

// Simple
const { data } = await callApi("/api/users");

// Configured
const api = createFetchClient({
 baseURL: "https://api.example.com",
 retryAttempts: 2,
 timeout: 10000,
 onError: ({ error }) => trackError(error),
});
```

### CDN

```html
<script type="module">
 import { callApi } from "https://esm.run/@zayne-labs/callapi";
</script>
```

## What makes it worth considering?

- **TypeScript-first** - Full inference everywhere
- **Familiar API** - If you know fetch, you know CallApi
- **Actually small** - Zero dependencies and Under 6KB, unlike other 50kb libs in the wild
- **Fast** - Built on native Web APIs
- **Works everywhere** - Browsers, Node 18+, Deno, Bun, Cloudflare Workers

## License

MIT © [Ryan Zayne](https://github.com/ryan-zayne)
