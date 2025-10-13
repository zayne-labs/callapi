<h1 align="center">CallApi</h1>

<p align="center">
   <img src="https://raw.githubusercontent.com/zayne-labs/callapi/refs/heads/main/apps/docs/public/logo.png" alt="CallApi Logo" width="30%">
</p>

<p align="center">
   <a href="https://www.npmjs.com/package/@zayne-labs/callapi"><img src="https://img.shields.io/npm/v/@zayne-labs/callapi?style=flat&color=EFBA5F" alt="npm version"></a>
   <a href="https://github.com/zayne-labs/callapi/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/@zayne-labs/callapi?style=flat&color=EFBA5F" alt="license"></a>
   <a href="https://www.npmjs.com/package/@zayne-labs/callapi"><img src="https://img.shields.io/npm/dm/@zayne-labs/callapi?style=flat&color=EFBA5F" alt="downloads per month"></a>
   <a href="https://github.com/zayne-labs/callapi/graphs/commit-activity"><img src="https://img.shields.io/github/commit-activity/m/zayne-labs/callapi?style=flat&color=EFBA5F" alt="commit activity"></a>
   <a href="https://deepwiki.com/zayne-labs/callapi"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
   <a href="https://code2tutorial.com/tutorial/02b6c57c-4847-4e76-b91e-d64dde370609/index.md"><img src="https://img.shields.io/badge/Code2Tutorial-blue?color=blue&logo=victoriametrics" alt="Code2Tutorial"></a>
</p>

<p align="center">A fetch wrapper that actually solves real problems.</p>

<p align="center">
  <a href="https://zayne-labs-callapi.netlify.app"><strong>Documentation</strong></a> ·
  <a href="https://zayne-labs-callapi.netlify.app/docs/getting-started"><strong>Getting Started</strong></a> ·
  <a href="https://github.com/zayne-labs/callapi/tree/main/packages/callapi-plugins"><strong>Plugins</strong></a>
</p>

---

Stop writing the same HTTP boilerplate in every project. CallApi is a drop-in replacement for fetch with all the features you'd build yourself anyway - just done properly.

**Under 6KB. Zero dependencies. Runs everywhere.**

```js
import { callApi } from "@zayne-labs/callapi";

const { data, error } = await callApi("/api/users");
```

## The Problem

Fetch is great for simple requests, but real apps need more:

- Handling duplicate requests (user spam-clicks a button)
- Retrying failed requests (network flaky, API rate-limiting)
- Parsing responses (stop writing `await response.json()` everywhere)
- Error handling that makes sense (not just `response.ok`)
- TypeScript types that actually work

You end up writing the same code over and over. Or pulling in a 100KB library.

## What CallApi Does

It's fetch, but with the stuff you actually need:

### Request Deduplication

User spam-clicks? No problem. Duplicate requests are handled automatically.

```js
// These share the same request - no race conditions
const req1 = callApi("/api/user");
const req2 = callApi("/api/user"); // Reuses req1's response
```

Three strategies:

- **Cancel**: Latest request wins (perfect for search-as-you-type)
- **Defer**: Share response between duplicates (when multiple components need the same data)
- **None**: Let them all through (for polling)

### Smart Response Parsing

Looks at Content-Type and does the right thing. No more manual parsing.

```js
const { data } = await callApi("/api/data"); // JSON? Parsed.
const { data } = await callApi("/page.html"); // HTML? String.
const { data } = await callApi("/image.png"); // Image? Blob.
```

### Error Handling That Makes Sense

```js
const { data, error } = await callApi("/api/users");

if (error) {
  console.log(error.name); // "HTTPError", "ValidationError", "TimeoutError"
  console.log(error.errorData); // The actual error response from your API
}
```

No more `try/catch` hell. No more checking `response.ok`. Just clean, predictable errors.

### Retries That Actually Work

Network flaky? API rate-limiting you? Handled.

```js
await callApi("/api/data", {
  retryAttempts: 3,
  retryStrategy: "exponential", // 1s, 2s, 4s, 8s...
  retryStatusCodes: [429, 500, 502, 503]
});
```

### Schema Validation (Type-Safe + Runtime)

Define your API schema once, get TypeScript types AND runtime validation:

```js
import { z } from "zod";
import { defineSchema, createFetchClient } from "@zayne-labs/callapi";

const api = createFetchClient({
  baseURL: "https://api.example.com",
  schema: defineSchema({
    "/users/:id": {
      data: z.object({
        id: z.number(),
        name: z.string(),
        email: z.string()
      })
    }
  })
});

const user = await api("/users/123");
// TypeScript knows the exact shape
// Runtime validates it matches
// If it doesn't? ValidationError with details
```

Works with Zod, Valibot, ArkType, or any Standard Schema validator.

### URL Helpers

```js
// Dynamic params
await callApi("/users/:id/posts/:postId", {
  params: { id: 123, postId: 456 }
}); // → /users/123/posts/456

// Query strings
await callApi("/search", {
  query: { q: "javascript", limit: 10 }
}); // → /search?q=javascript&limit=10

// Method prefixes
await callApi("@delete/users/123"); // Sets method to DELETE
```

### Hooks for Everything

```js
const api = createFetchClient({
  onRequest: ({ request }) => {
    // Add auth, modify headers
    request.headers.set("Authorization", `Bearer ${token}`);
  },

  onResponse: ({ data, response }) => {
    // Log, cache, transform
    console.log(`${response.status} - ${response.url}`);
  },

  onError: ({ error }) => {
    // Send to error tracking
    Sentry.captureException(error);
  },

  onRequestStream: ({ event }) => {
    // Upload progress
    console.log(`Uploaded ${event.progress}%`);
  },

  onResponseStream: ({ event }) => {
    // Download progress
    updateProgressBar(event.progress);
  }
});
```

### Plugin System

Build plugins for caching, upload progress with XHR, offline detection, whatever you need:

```js
const cachingPlugin = definePlugin({
  id: "caching",

  middlewares: ({ options }) => {
    const cache = new Map();

    return {
      fetchMiddleware: (fetchImpl) => async (input, init) => {
        // Check cache first
        const cached = cache.get(input.toString());
        if (cached && !isExpired(cached)) {
          return cached.response.clone();
        }

        // Fetch and cache
        const response = await fetchImpl(input, init);
        cache.set(input.toString(), { response: response.clone(), timestamp: Date.now() });
        return response;
      }
    };
  }
});
```

Plugins can wrap fetch (middleware), add hooks, define custom options. They compose automatically.

## Installation

```bash
npm install @zayne-labs/callapi
```

```js
import { callApi, createFetchClient } from "@zayne-labs/callapi";

// Simple usage
const { data, error } = await callApi("/api/users");

// Configured client
const api = createFetchClient({
  baseURL: "https://api.example.com",
  retryAttempts: 2,
  timeout: 10000,
  dedupeStrategy: "cancel",
  onError: ({ error }) => trackError(error)
});

const users = await api("/users");
```

### CDN (No Build Step)

```html
<script type="module">
  import { callApi } from "https://esm.run/@zayne-labs/callapi";

  const { data } = await callApi("/api/users");
</script>
```

## Why It's Nice to Use

**TypeScript just works.** Full inference everywhere. Your editor knows what `data` is without you telling it.

**The API feels familiar.** If you know fetch, you know 90% of CallApi. The rest is just additions that make sense.

**It's actually small.** Under 6KB. Zero dependencies. Tree-shakeable. Not one of those "lightweight" libraries that's actually 50KB.

**It's fast.** Built on native Web APIs (Fetch, AbortController, Streams). No abstractions that slow things down.

**It works everywhere.** Browsers, Node 18+, Deno, Bun, Cloudflare Workers. If it runs JavaScript, it runs CallApi.

## License

MIT © [Ryan Zayne](https://github.com/ryan-zayne)
