# CallApi Plugins

<p align="center">
   <a href="https://www.npmjs.com/package/@zayne-labs/callapi-plugins"><img src="https://img.shields.io/npm/v/@zayne-labs/callapi-plugins?style=flat&color=EFBA5F" alt="npm version"></a>
   <a href="https://github.com/zayne-labs/callapi/blob/master/LICENSE"><img src="https://img.shields.io/npm/l/@zayne-labs/callapi-plugins?style=flat&color=EFBA5F" alt="license"></a>
   <a href="https://www.npmjs.com/package/@zayne-labs/callapi-plugins"><img src="https://img.shields.io/npm/dm/@zayne-labs/callapi-plugins?style=flat&color=EFBA5F" alt="downloads per month"></a>
</p>

A collection of official plugins for [CallApi](https://github.com/zayne-labs/callapi) that extend its functionality with common patterns and utilities.

## Installation

```bash
# npm
npm install @zayne-labs/callapi-plugins

# pnpm
pnpm add @zayne-labs/callapi-plugins
```

**Note:** This package requires `@zayne-labs/callapi` as a peer dependency.

## Available Plugins

### Logger Plugin

Comprehensive HTTP request/response logging with beautiful console output, built on top of [consola](https://github.com/unjs/consola).

**Features:**

- Logs all HTTP requests and responses
- Tracks errors and retries
- Color-coded console output
- Customizable logging options
- Granular control over what gets logged

```js
import { createFetchClient } from "@zayne-labs/callapi";
import { loggerPlugin } from "@zayne-labs/callapi-plugins";

const api = createFetchClient({
	baseURL: "https://api.example.com",
	plugins: [
		loggerPlugin({
			enabled: process.env.NODE_ENV === "development",
			mode: "verbose", // or "basic"
		}),
	],
});
```

**Configuration Options:**

- `enabled` - Toggle logging on/off (boolean or granular object)
- `mode` - "basic" or "verbose" logging
- `consoleObject` - Custom console implementation

**Granular Control:**

```js
loggerPlugin({
	enabled: {
		onRequest: true,
		onSuccess: true,
		onError: true, // Fallback for all error types
		onValidationError: false, // Disable specific error types
	},
});
```

## Usage

Import and use plugins with your CallApi instance:

```js
import { createFetchClient } from "@zayne-labs/callapi";
import { loggerPlugin } from "@zayne-labs/callapi-plugins";

// Base configuration
const api = createFetchClient({
	baseURL: "https://api.example.com",
	plugins: [
		loggerPlugin({
			enabled: process.env.NODE_ENV === "development",
		}),
	],
});

// Per-request plugins
const { data } = await api("/users", {
	plugins: [loggerPlugin({ mode: "verbose" })],
});
```

## Plugin Development

Want to create your own plugin? Check out the [plugin development guide](https://zayne-labs-callapi.netlify.app/docs/plugins) in the main CallApi documentation.

Basic plugin structure:

```js
import { definePlugin } from "@zayne-labs/callapi";

const myPlugin = definePlugin({
	id: "my-plugin",
	name: "My Plugin",
	version: "1.0.0",

	setup: ({ request, options }) => {
		// Modify request/options before sending
		return { request, options };
	},

	hooks: {
		onRequest: (ctx) => {
			// Handle request lifecycle events
		},
		onSuccess: (ctx) => {
			// Handle successful responses
		},
	},
});
```

## Documentation

For detailed documentation and examples, visit:

- [CallApi Documentation](https://zayne-labs-callapi.netlify.app)
- [Plugin Guide](https://zayne-labs-callapi.netlify.app/docs/plugins)
- [Logger Plugin Docs](https://zayne-labs-callapi.netlify.app/docs/plugins/utility/logger)

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to the [main repository](https://github.com/zayne-labs/callapi).

## License

MIT © [Ryan Zayne](https://github.com/zayne-labs)
