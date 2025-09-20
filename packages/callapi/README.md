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
CallApi Fetch is an extra-lightweight wrapper over fetch that provides quality of life improvements beyond the bare fetch api, while keeping the API familiar.</p>

It takes in a url and a request options object, just like fetch, but with some additional options to make your life easier. Check out the [API Reference](https://zayne-labs-callapi.netlify.app/docs/extra-options) for a quick look at the additional options.

# Docs

[View Documentation website](https://zayne-labs-callapi.netlify.app)

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
