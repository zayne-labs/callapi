# CallApi - The Fetch Wrapper You Actually Want

I built **CallApi** because I was tired of writing the same HTTP boilerplate in every project. Error handling, retries, deduplication, parsing responses... it's 2025 and we're still doing this manually?

## The Problem

Fetch is great for simple requests, but real apps need more. The existing solutions either:

- Miss features you actually need (request deduplication, schema validation, progress tracking)
- Have APIs that feel outdated
- Ship massive bundles due to legacy constraints
- Don't play nice with TypeScript
- Or all of the above

## What CallApi Does

It's a **drop-in replacement** for fetch. If you know fetch, you already know CallApi. But it adds everything you'd build yourself anyway - done properly.

**Under 6KB**. Zero dependencies. Runs everywhere (browsers, Node 18+, Deno, Bun, Workers). TypeScript-first with full inference.

## Features That Matter

### Request Deduplication

User spam-clicks a button and fires off 10 identical API calls? Fixed. CallApi automatically deduplicates requests with three strategies:

- **Cancel**: Latest request wins (search-as-you-type)
- **Defer**: Share the same response (multiple components need same data)
- **None**: Let them all through (polling)

```ts
const req1 = callApi("/api/user");
const req2 = callApi("/api/user"); // Reuses req1's response with defer strategy
```

No more race conditions. No more wasted bandwidth.

### Smart Response Parsing

Stop writing `await response.json()` everywhere. CallApi looks at the Content-Type header and does the right thing:

```ts
const { data: user } = await callApi("/api/user"); // JSON? Parsed.
const { data: html } = await callApi("/page.html"); // HTML? String.
const { data: image } = await callApi("/avatar.png"); // Image? Blob.
```

### Error Handling That Makes Sense

Fetch's error handling is rough. CallApi gives you structured errors:

```ts
const { data, error } = await callApi("/api/users");

if (error) {
	console.log(error.name); // "HTTPError", "ValidationError", "TimeoutError"
	console.log(error.errorData); // The actual error response from your API
	console.log(error.response); // Full response object if you need it
}
```

No more `try/catch` hell. No more checking `response.ok`.

### Retries That Actually Work

Network flaky? API rate-limiting you? CallApi handles retries with exponential backoff:

```ts
await callApi("/api/data", {
	retryAttempts: 3,
	retryStrategy: "exponential", // 1s, 2s, 4s, 8s...
	retryDelay: 1000,
	retryMaxDelay: 10000,
	retryStatusCodes: [429, 500, 502, 503],
	retryCondition: ({ response }) => response?.status === 429,
});
```

### Schema Validation (Type-Safe + Runtime)

Define your API schema once, get TypeScript types AND runtime validation:

```ts
import { createFetchClient, defineSchema } from "@zayne-labs/callapi";
import { z } from "zod";

const api = createFetchClient({
	schema: defineSchema({
		"/users/:id": {
			data: z.object({
				id: z.number(),
				name: z.string(),
				email: z.string(),
			}),
		},
	}),
});

const { data } = await api("/users/123");
// TypeScript knows the exact shape
// Runtime validates it matches
// If it doesn't? ValidationError with details
```

Works with Zod, Valibot, ArkType, or any Standard Schema validator.

### Hooks for Everything

Need to add auth headers? Log requests? Track errors? There's a hook for that:

```ts
const api = createFetchClient({
	onRequest: ({ request }) => {
		request.headers.set("Authorization", `Bearer ${token}`);
	},

	onResponse: ({ data, response }) => {
		console.log(`${response.status} - ${response.url}`);
	},

	onError: ({ error }) => {
		Sentry.captureException(error);
	},

	onRequestStream: ({ event }) => {
		console.log(`Upload: ${event.progress}%`);
	},

	onResponseStream: ({ event }) => {
		console.log(`Download: ${event.progress}%`);
	},
});
```

Hooks run in parallel (fast) or sequential (when order matters). Define them at plugin, base config, or per-request level.

### Plugin System

Want caching? Upload progress with XHR? Offline detection? Build a plugin:

```ts
import { definePlugin } from "@zayne-labs/callapi/utils";

const loggingPlugin = definePlugin({
	id: "logging",
	name: "Request Logger",
	hooks: {
		onRequest: ({ options }) => console.log(`Request: ${options.initURL}`),
		onResponse: ({ response }) => console.log(`Response: ${response.status}`),
	},
});

const api = createFetchClient({
	plugins: [loggingPlugin],
});
```

Plugins can wrap fetch with middleware, add hooks, define custom options. They compose automatically.

### URL Helpers

Dynamic params and query strings without manual string building:

```ts
// Dynamic params
await callApi("/users/:id/posts/:postId", {
	params: { id: 123, postId: 456 },
}); // → /users/123/posts/456

// Query strings
await callApi("/search", {
	query: { q: "javascript", limit: 10 },
}); // → /search?q=javascript&limit=10

// Method prefixes
await callApi("@delete/users/123"); // Sets method to DELETE
```

### Auth Helpers

Stop manually building Authorization headers:

```ts
// Bearer (most common)
auth: "my-token";

// Dynamic
auth: () => authStore.getToken();

// Basic auth
auth: {
	type: "Basic";
	username: "user";
	password: "pass";
}

// Custom
auth: {
	type: "Custom";
	prefix: "ApiKey";
	value: "secret";
}
```

### Streaming with Progress

First-class support for streams with progress events:

```ts
const { data: stream } = await callApi("/large-file", {
	responseType: "stream",
	onResponseStream: ({ event }) => {
		updateProgress(event.progress); // 0-100
		console.log(`${event.transferredBytes} / ${event.totalBytes}`);
	},
});
```

Works for uploads too with `onRequestStream`.

## Why It's Nice

**TypeScript just works.** Full inference everywhere. Your editor knows what `data` is.

**The API feels familiar.** If you know fetch, you know 90% of CallApi.

**It's actually small.** Under 6.8KB. Zero dependencies. Tree-shakeable.

**It's fast.** Built on native Web APIs (Fetch, AbortController, Streams).

**It works everywhere.** Browsers, Node 18+, Deno, Bun, Cloudflare Workers.

## Getting Started

```bash
npm install @zayne-labs/callapi
```

```ts
import { callApi, createFetchClient } from "@zayne-labs/callapi";

// Simple usage - just like fetch
const { data, error } = await callApi("/api/users");

// Or create a configured client
const api = createFetchClient({
	baseURL: "https://api.example.com",
	retryAttempts: 2,
	timeout: 10000,
	dedupeStrategy: "cancel",
	onError: ({ error }) => trackError(error),
});

const { data: users } = await api("/users");
```

## Links

- **Docs**: <https://zayne-labs-callapi.vercel.app>
- **GitHub**: <https://github.com/zayne-labs/callapi>
- **NPM**: <https://www.npmjs.com/package/@zayne-labs/callapi>

---

## Platform-Specific Versions

### Twitter/X Thread

**Tweet 1:**
I built CallApi because I was tired of writing the same HTTP boilerplate in every project.

It's a fetch wrapper that solves real problems:
• Request deduplication
• Smart retries
• Proper error handling
• Schema validation
• Progress tracking

Under 6.8KB, zero deps 🧵

**Tweet 2:**
Request Deduplication 🔄

User spam-clicks a button? No problem.

3 strategies:
• Cancel (latest wins)
• Defer (share response)
• None (independent)

No more race conditions. No more wasted bandwidth.

**Tweet 3:**
Smart Response Parsing 🧠

Stop writing await response.json() everywhere.

CallApi checks Content-Type and does the right thing:
• JSON → parsed object
• HTML → string
• Images → blob

It just works.

**Tweet 4:**
Error Handling ⚠️

Fetch's error handling is rough.

CallApi gives you:
• error.name (HTTPError, ValidationError, TimeoutError)
• error.errorData (actual API response)
• error.response (full response object)

No more try/catch hell.

**Tweet 5:**
Retries 🔁

Network flaky? API rate-limiting?

• Exponential backoff (1s, 2s, 4s, 8s...)
• Custom retry conditions
• Status code filtering
• Method filtering

Smart retries that save support tickets.

**Tweet 6:**
Schema Validation ✅

Define your API schema once, get:
• TypeScript types
• Runtime validation
• Detailed error messages

Works with Zod, Valibot, ArkType, or any Standard Schema validator.

**Tweet 7:**
Hooks 🪝

• onRequest / onRequestReady
• onResponse / onSuccess / onError
• onRequestStream / onResponseStream
• onRetry / onValidationError

Parallel or sequential. Plugin, base, or per-request level.

**Tweet 8:**
Plugin System 🔌

Build plugins for:
• Response caching
• Upload progress
• Offline detection
• Request throttling

Plugins wrap fetch with middleware. They compose automatically.

**Tweet 9:**
The little things:
• URL helpers (params, query)
• Auth helpers (Bearer, Basic, Custom)
• Auto Content-Type detection
• Timeouts
• Streaming with progress
• Method prefixes (@delete/users/123)

All the stuff you'd build anyway.

**Tweet 10:**
Why I built this:

Tired of:
• Writing the same error handling
• Manually deduplicating requests
• Wrestling with TypeScript types
• Pulling in 100KB libraries
• Writing await response.json() forever

npm install @zayne-labs/callapi

What would you use? 👇

### LinkedIn Post

**Introducing CallApi: A Modern Fetch Wrapper for Production Applications**

After years of writing the same HTTP boilerplate across projects, I built CallApi - a fetch wrapper that solves real problems.

**The Challenge:**

The Fetch API is great for simple requests, but production apps need more: automatic retries, request deduplication, proper error handling, validation, and progress tracking. Most developers either write incomplete abstractions or pull in heavy libraries with legacy constraints.

**The Solution:**

CallApi is a drop-in replacement for fetch with the features you need:

🔄 **Request Deduplication** - Eliminate duplicate calls and race conditions automatically

🧠 **Smart Response Parsing** - Auto-detect and parse based on Content-Type

⚠️ **Structured Error Handling** - HTTPError, ValidationError, TimeoutError with full context

🔁 **Advanced Retries** - Exponential backoff with custom conditions and status code filtering

✅ **Schema Validation** - Runtime + type-level validation with Zod/Valibot/ArkType

🪝 **Powerful Hooks** - Intercept at any lifecycle point (onRequest, onResponse, onError, onRetry, onRequestStream, onResponseStream)

🔌 **Plugin System** - Extend with composable middleware for caching, progress tracking, offline detection

📊 **Progress Tracking** - Upload/download streams with real-time progress events

**Technical Highlights:**

- Under 6.8KB with zero dependencies
- Full TypeScript support with complete type inference
- Works everywhere: browsers, Node.js 18+, Deno, Bun, Cloudflare Workers
- Tree-shakeable and optimized for modern bundlers
- Built on Web Standards (Fetch API, AbortController, Streams)

**Developer Experience:**

If you know fetch, you already know CallApi. The API is intentionally familiar, with quality-of-life improvements that save hours of development time.

```ts
// Simple usage
const { data, error } = await callApi("/api/users");

// Configured client
const api = createFetchClient({
	baseURL: "https://api.example.com",
	retryAttempts: 3,
	dedupeStrategy: "cancel",
	onError: ({ error }) => trackError(error),
});
```

**Why It Matters:**

Data fetching is at the core of most web applications. A robust, well-designed HTTP client can significantly improve code quality, reduce bugs, and accelerate development.

📚 Documentation: <https://zayne-labs-callapi.vercel.app>
💻 GitHub: <https://github.com/zayne-labs/callapi>
📦 NPM: <https://www.npmjs.com/package/@zayne-labs/callapi>

What HTTP client features matter most to you?

# WebDevelopment #JavaScript #TypeScript #OpenSource #API #HTTP
