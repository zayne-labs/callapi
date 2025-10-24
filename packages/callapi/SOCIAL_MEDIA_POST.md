# CallApi - A Fetch Wrapper That Actually Gets It

So I built **CallApi** because I got tired of writing the same HTTP boilerplate in every project. You know the drill - error handling, retries, deduplication, parsing responses... it's 2025 and we're still doing this manually?

## The Problem

Fetch is great for simple requests, but real apps need more. And the existing solutions? They either:

- Miss features you actually need (like request deduplication, schema validation etc)
- Have APIs that feel like they're from 2010
- Ship with massive bundles because backwards compatibility
- Don't play nice with TypeScript
- Or all of the above

I tried them all. None felt right.

## What CallApi Does Differently

It's a **drop-in replacement** for fetch. If you know fetch, you already know CallApi. But it adds all the stuff you'd build yourself anyway - just done properly.

Under **6KB**. Zero dependencies. Runs everywhere (browsers, Node 18+, Deno, Bun). TypeScript-first with full inference.

## The Features That Matter

### Request Deduplication (Finally!)

Ever had a user spam-click a button and fire off 10 identical API calls? Yeah, that's fixed. CallApi automatically deduplicates requests with three strategies:

- **Cancel**: Latest request wins (perfect for search-as-you-type)
- **Defer**: Share the same response (when multiple components need the same data)
- **None**: Let them all through (for polling or when you actually want duplicates)

```ts
// These automatically share the same request
const req1 = callApi("/api/user");
const req2 = callApi("/api/user"); // Reuses req1's response
```

No more race conditions. No more wasted bandwidth.

### Smart Response Parsing

Stop writing `await response.json()` everywhere. CallApi looks at the Content-Type header and does the right thing:

```js
const resultOne = await callApi("/api/data"); // JSON? Parsed.
const resultTwo = await callApi("/page.html"); // HTML? String.
const resultThree = await callApi("/image.png"); // Image? Blob.
```

It just works. Like it should have from the start.

### Error Handling That Makes Sense

Fetch's error handling is... not great. CallApi gives you structured errors you can actually work with:

```js
const { data, error } = await callApi("/api/users");

if (error) {
 console.log(error.name); // "HTTPError", "ValidationError", "TimeoutError"
 console.log(error.errorData); // The actual error response from your API
 console.log(error.response); // Full response object if you need it
}
```

No more `try/catch` hell. No more checking `response.ok`. Just clean, predictable error handling.

### Retries That Actually Work

Network flaky? API rate-limiting you? CallApi handles retries with exponential backoff:

```ts
await callApi("/api/data", {
 retryAttempts: 3,
 retryStrategy: "exponential", // 1s, 2s, 4s, 8s...
 retryDelay: 1000,
 retryMaxDelay: 10000,
 retryStatusCodes: [429, 500, 502, 503], // Only retry these
 retryCondition: ({ response }) => {
  // Or write custom logic
  return response?.status === 429;
 },
});
```

Linear backoff too if that's your thing. Or write custom retry logic. Your call.

### Schema Validation (Type-Safe + Runtime)

This one's cool. Define your API schema once, get TypeScript types AND runtime validation:

```ts
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

const user = await api("/users/123");
// TypeScript knows the exact shape
// Runtime validates it matches
// If it doesn't? ValidationError with details
```

Works with Zod, Valibot, ArkType, or any Standard Schema validator. You can even validate request bodies, headers, query params - the whole thing.

### Hooks for Everything

Need to add auth headers? Log requests? Track errors? There's a hook for that:

```ts
const api = createFetchClient({
 onRequest: ({ request }) => {
  // Add auth, modify headers, whatever
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
 },
});
```

Hooks can run in parallel (fast) or sequential (when order matters). Define them at the plugin level, base config, or per-request. They compose automatically.

### Plugin System (The Fun Part)

Want to add caching? Upload progress with XHR? Offline detection? Build a plugin:

```ts
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
   },
  };
 },
});
```

Plugins can wrap fetch (middleware), add hooks, define custom options, whatever you need. They compose together automatically.

This is how you'd build upload progress with XHR, or offline detection, or request throttling - things that need to intercept at the network layer.

### URL Helpers (Small But Nice)

Dynamic params and query strings without the manual string building:

```ts
// Dynamic params
await callApi("/users/:id/posts/:postId", {
 params: { id: 123, postId: 456 },
}); // → /users/123/posts/456

// Query strings
await callApi("/search", {
 query: { q: "javascript", limit: 10 },
}); // → /search?q=javascript&limit=10

// Method prefixes (because why not)
await callApi("@delete/users/123"); // Sets method to DELETE
```

Little things that add up.

### Auth Helpers

Stop manually building Authorization headers:

```
// Bearer (most common)
auth: "my-token"
auth: { bearer: () => authStore.getToken() } // Dynamic

// Basic auth
auth: { type: "Basic", username: "user", password: "pass" }

// Custom
auth: { type: "Custom", prefix: "ApiKey", value: "secret" }
```

### Auto Content-Type

Objects become JSON. FormData stays FormData. Query strings get the right header. You don't think about it.

### Timeouts

```ts
await callApi("/api/data", {
 timeout: 5000, // Abort after 5 seconds
});
```

### Streaming

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

## Why It's Nice to Use

**TypeScript just works.** Full inference everywhere. Your editor knows what `data` is without you telling it.

**The API feels familiar.** If you know fetch, you know 90% of CallApi. The rest is just additions that make sense.

**It's actually small.** Under 6KB. Zero dependencies. Tree-shakeable. Not one of those "lightweight" libraries that's actually 50KB.

**It's fast.** Built on native Web APIs (Fetch, AbortController, Streams). No abstractions that slow things down.

**It works everywhere.** Browsers, Node 18+, Deno, Bun, Cloudflare Workers. If it runs JavaScript, it runs CallApi.

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

const users = await api("/users");
```

That's it. You're done.

## Links

- **Docs**: <https://zayne-labs-callapi.netlify.app>
- **GitHub**: <https://github.com/zayne-labs/callapi>
- **NPM**: <https://www.npmjs.com/package/@zayne-labs/callapi>

## The Real Talk

I built this because I was tired of:

- Writing the same error handling in every project
- Manually deduplicating requests
- Dealing with race conditions from duplicate API calls
- Wrestling with TypeScript types for API responses
- Pulling in 100KB libraries for basic features
- Writing `await response.json()` for the millionth time

CallApi handles all of that. It's the HTTP client I wanted to use but couldn't find.

If you're building a real app (not a todo list), you need this stuff. Request deduplication alone will save you headaches. The retry logic will save you support tickets. The TypeScript integration will save you bugs.

It's free, open source, and actually maintained. Give it a shot.

---

**What features would you actually use? What am I missing?**

# WebDev #JavaScript #TypeScript #OpenSource #HTTP #API #Fetch

---

## Platform-Specific Versions

### Twitter/X Thread

**Tweet 1:**
I built CallApi because I was tired of writing the same HTTP boilerplate in every project

It's a fetch wrapper that actually solves real problems:

- Request deduplication
- Smart retries
- Proper error handling
- Schema validation
- Progress tracking

Under 6KB, zero deps

Thread 👇

**Tweet 2:**
Request Deduplication 🔄

User spam-clicks a button? No problem. CallApi automatically handles duplicate requests.

3 strategies:

- Cancel (latest wins)
- Defer (share response)
- None (independent)

No more race conditions. No more wasted bandwidth.

**Tweet 3:**
Smart Response Parsing 🧠

Stop writing await response.json() everywhere.

CallApi looks at Content-Type and does the right thing:

- JSON → parsed object
- HTML → string
- Images → blob

It just works.

**Tweet 4:**
Error Handling That Makes Sense ⚠️

Fetch's error handling is... not great.

CallApi gives you:

- error.name (HTTPError, ValidationError, TimeoutError)
- error.errorData (actual API response)
- error.response (full response object)

No more try/catch hell.

**Tweet 5:**
Retries That Actually Work 🔁

Network flaky? API rate-limiting?

CallApi handles it:

- Exponential backoff (1s, 2s, 4s, 8s...)
- Custom retry conditions
- Status code filtering
- Method filtering

Smart retries that save support tickets.

**Tweet 6:**
Schema Validation ✅

Define your API schema once, get:

- TypeScript types
- Runtime validation
- Detailed error messages

Works with Zod, Valibot, ArkType, or any Standard Schema validator.

Type-safe from end to end.

**Tweet 7:**
Hooks for Everything 🪝

Need to:

- Add auth headers?
- Log requests?
- Track errors?
- Monitor upload/download progress?

There's a hook for that.

Parallel or sequential execution. Plugin, base, or per-request level.

**Tweet 8:**
Plugin System 🔌

Build plugins for:

- Response caching
- Upload progress with XHR
- Offline detection
- Request throttling

Plugins wrap fetch with middleware. They compose automatically.

This is the fun part.

**Tweet 9:**
And the little things that add up:

- URL helpers (params, query)
- Auth helpers (Bearer, Basic, Custom)
- Auto Content-Type detection
- Timeouts
- Streaming support
- Method prefixes (@delete/users/123)

All the stuff you'd build anyway.

**Tweet 10:**
Why I built this:

I was tired of:

- Writing the same error handling
- Manually deduplicating requests
- Wrestling with TypeScript types
- Pulling in 100KB libraries
- Writing await response.json() forever

CallApi handles it all.

npm install @zayne-labs/callapi

What would you use? 👇

### LinkedIn Post

#### Introducing CallApi: A Modern Fetch Wrapper for Production Applications

After years of writing the same HTTP boilerplate across projects, I built CallApi - a fetch wrapper that actually solves real problems.

**The Challenge:**

The Fetch API is great for simple requests, but production apps need more: automatic retries, request deduplication, proper error handling, validation, and progress tracking. Most developers either write incomplete abstractions or pull in heavy libraries with legacy constraints.

**The Solution:**

CallApi is a drop-in replacement for fetch with all the features you need:

🔄 **Request Deduplication** - Eliminate duplicate calls and race conditions automatically

🧠 **Smart Response Parsing** - Auto-detect and parse based on Content-Type (no more response.json())

⚠️ **Structured Error Handling** - HTTPError, ValidationError, TimeoutError with full context

🔁 **Advanced Retries** - Exponential backoff with custom conditions and status code filtering

✅ **Schema Validation** - Runtime + type-level validation with Zod/Valibot/ArkType

🪝 **Powerful Hooks** - Intercept at any lifecycle point (onRequest, onResponse, onError, onRetry, onRequestStream, onResponseStream)

🔌 **Plugin System** - Extend with composable middleware for caching, progress tracking, offline detection

📊 **Progress Tracking** - Upload/download streams with real-time progress events

**Technical Highlights:**

- Under 6KB with zero dependencies
- Full TypeScript support with complete type inference
- Works everywhere: browsers, Node.js 18+, Deno, Bun, Cloudflare Workers
- Tree-shakeable and optimized for modern bundlers
- Built on Web Standards (Fetch API, AbortController, Streams)

**Developer Experience:**

If you know fetch, you already know CallApi. The API is intentionally familiar, but with quality-of-life improvements that save hours of development time.

```typescript
// Simple usage
const { data, error } = await callApi("/api/users");

// Configured client
const api = createFetchClient({
 baseURL: "https://api.example.com",
 retryAttempts: 3,
 dedupeStrategy: "cancel",
 schema: defineSchema({
  /* ... */
 }),
 onError: ({ error }) => trackError(error),
});
```

**Why It Matters:**

Data fetching is at the core of most web applications. A robust, well-designed HTTP client can significantly improve code quality, reduce bugs, and accelerate development.

CallApi aims to be the most comprehensive yet intuitive fetching library available - handling the boring stuff so you can focus on building features.

📚 Documentation: <https://zayne-labs-callapi.netlify.app>
💻 GitHub: <https://github.com/zayne-labs/callapi>
📦 NPM: <https://www.npmjs.com/package/@zayne-labs/callapi>

I'd love to hear your thoughts! What HTTP client features matter most to you?

WebDevelopment #JavaScript #TypeScript #OpenSource #SoftwareEngineering #API #HTTP

---

## Notes

- Main post is conversational and focuses on real problems developers face
- Emphasizes practical benefits over technical jargon
- Twitter thread breaks down features into bite-sized, relatable tweets
- LinkedIn version is more professional but still approachable
- All versions highlight the "why" not just the "what"
- Removed emoji overload from main post for better readability
- Added more context about when/why you'd use each feature
