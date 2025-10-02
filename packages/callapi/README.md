<h1 align="center">CallApi - Advanced Fetch Client</h1>

<!-- <p align="center">
   <img src="https://res.cloudinary.com/djvestif4/image/upload/v1745621399/call-api/logo_unyvnx.jpg" alt="CallApi Logo" width="30%">
</p> -->
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
   <a href="https://code2tutorial.com/tutorial/02b6c57c-4847-4e76-b91e-d64dde370609/index.md"><img src="https://img.shields.io/badge/Code2Tutorial-blue?color=blue&logo=victoriametrics" alt="Code2Tutorial"></a>
 </p>

<p align="center">
A modern fetch wrapper that actually makes HTTP requests enjoyable to work with.</p>

CallApi keeps the familiar fetch API you know, but adds the features you've always wanted: automatic retries, request deduplication, smart response parsing, and proper error handling. No more writing the same boilerplate over and over.

## Why CallApi?

**Drop-in replacement** - Same API as fetch, just better
**Smart retries** - Exponential backoff, custom conditions
**Request deduplication** - No more duplicate API calls
**Auto response parsing** - JSON, text, or binary - it just works
**Better error handling** - Structured errors you can actually use
**Extensible** - Hooks and plugins for custom behavior
**Tiny** - Under 6KB, zero dependencies

## Quick Example

```js
import { callApi } from "@zayne-labs/callapi";

// Simple request - response type detected automatically
const { data, error } = await callApi("/api/users");

// Create a configured client
import { createFetchClient } from "@zayne-labs/callapi";

const callBackendApi = createFetchClient({
 baseURL: "https://api.example.com",
 retryAttempts: 2,
 timeout: 10000,
});

const user = await callBackendApi("/users/123");
```

## Key Features

### Request Deduplication

Prevent duplicate requests automatically:

```js
// These will share the same request
const req1 = callApi("/api/user");
const req2 = callApi("/api/user"); // Uses result from req1
```

### Smart Response Parsing

No more `response.json()` everywhere:

```js
// Automatically parsed based on Content-Type
const { data } = await callApi("/api/data"); // JSON
const { data } = await callApi("/api/page"); // HTML text
const { data } = await callApi("/api/image.png"); // Blob
```

### Proper Error Handling

```js
const { data, error } = await callApi("/api/users");

if (error) {
 console.log(error.name); // "HTTPError", "ValidationError", etc.
 console.log(error.message); // Human readable message
 console.log(error.errorData); // Server response data
}
```

### URL Parameters & Query Strings

```js
// Dynamic parameters
await callApi("/users/:id/posts/:postId", {
 params: { id: 123, postId: 456 },
}); // → /users/123/posts/456

// Query parameters
await callApi("/search", {
 query: { q: "javascript", limit: 10 },
}); // → /search?q=javascript&limit=10
```

### Schema Validation

Runtime validation with your favorite library:

```js
import { z } from "zod";
import { defineSchema, createFetchClient } from "@zayne-labs/callapi";

// Client-level validation with route schemas
const callBackendApi = createFetchClient({
 baseURL: "https://api.example.com",
 schema: defineSchema({
  "/users/:id": {
   data: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
   }),
  },
  "/posts": {
   data: z.array(
    z.object({
     id: z.number(),
     title: z.string(),
    })
   ),
  },
 }),
});

// Automatically validated based on route (both at runtime and at the type level)
const user = await callBackendApi("/users/123"); // Typed as { id: number, name: string, email: string }
const posts = await callBackendApi("/posts"); // Typed as Array<{ id: number, title: string }>

// Per-request validation
import { callApi } from "@zayne-labs/callapi";

const userSchema = z.object({
 id: z.number(),
 name: z.string(),
});

const { data } = await callApi("/api/user", {
 schema: { data: userSchema }, // Validates response
});
// data is now typed as { id: number, name: string }
```

# Documentation

[Full documentation and examples →](https://zayne-labs-callapi.netlify.app)

## Installing `CallApi`

### Through npm (recommended)

```bash
# npm
npm install @zayne-labs/callapi

# pnpm
pnpm add @zayne-labs/callapi
```

Then you can use it by importing it in your JavaScript file.

```js
import { callApi } from "@zayne-labs/callapi";
```

### Using `CallApi` without `npm`

You can import callApi directly into JavaScript through a CDN.

To do this, you first need to set your `script`'s type to `module`, then import `callApi`.

```html
<script type="module">
 import { callApi } from "https://esm.run/@zayne-labs/callapi";
</script>

<!-- Locked to a specific version -->
<script type="module">
 import { callApi } from "https://esm.run/@zayne-labs/callapi@1.10.3";
</script>
```
