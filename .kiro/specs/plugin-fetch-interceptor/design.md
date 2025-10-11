# Design Document

## Overview

This document outlines the implementation of `fetchInterceptor` composition for CallApi. The `fetchInterceptor` option already exists in `SharedExtraOptions`, making it available at base config and per-request levels. This design adds:

1. Support for plugins to return `fetchInterceptor` from their `setup` function (as a top-level property)
2. Composition logic to chain interceptors from all levels during plugin initialization
3. The composed interceptor is added to `resolvedOptions.fetchInterceptor` and used by existing fetch logic

## Architecture

### Composition Flow

```
Per-Request Interceptor
  ↓ calls originalFetch
Plugin Interceptors (in order)
  ↓ calls originalFetch
Base Config Interceptor
  ↓ calls originalFetch
customFetchImpl (if provided)
  ↓
Native fetch()
```

Each interceptor receives `originalFetch` which represents everything below it in the chain.

## Components and Interfaces

### 1. Add FetchInterceptor Type to SharedExtraOptions

**Location:** `packages/callapi/src/types/common.ts`

Add `FetchInterceptor` type using the existing `FetchImpl` type:

```typescript
// FetchImpl already exists:
// type FetchImpl = UnmaskType<(input: string | Request | URL, init?: RequestInit) => Promise<Response>>;

// Add FetchInterceptor type:
type FetchInterceptor = (originalFetch: FetchImpl) => FetchImpl;

type SharedExtraOptions<TPluginOptions extends PluginOptions = PluginOptions> = {
  // ... existing options ...
  fetchInterceptor?: FetchInterceptor;
  // ... other options ...
};
```

### 2. Update PluginInitResult Type

**Location:** `packages/callapi/src/plugins.ts`

Add `fetchInterceptor` as a top-level property in `PluginInitResult`:

```typescript
export type PluginInitResult = Partial<
  Omit<PluginSetupContext, "initURL" | "request"> & {
    initURL: InitURLOrURLObject;
    request: CallApiRequestOptions;
    fetchInterceptor?: FetchInterceptor; // Add as top-level property
  }
>;

// Plugin example:
setup: ({ options }) => {
  const cache = new Map();

  return {
    fetchInterceptor: (originalFetch) => async (input, init) => {
      const cached = cache.get(input.toString());
      if (cached) return cached;

      const response = await originalFetch(input, init);
      cache.set(input.toString(), response.clone());
      return response;
    }
  };
}
```

### 3. Integration with Existing Code

**Location:** `packages/callapi/src/plugins.ts`

Update `initializePlugins` to collect and compose interceptors:

```typescript
export const initializePlugins = async (context: PluginSetupContext) => {
  const { baseConfig, config, initURL, options, request } = context;

  const hookRegistries = getHookRegistries();

  // Collect interceptors as we go
  const interceptors: FetchInterceptor[] = [];

  const hookRegistryKeyArray = Object.keys(hookRegistries) as Array<keyof Hooks>;

  const addMainHooks = () => {
    // ... existing code unchanged ...
  };

  const addPluginHooks = (pluginHooks: Required<CallApiPlugin>["hooks"]) => {
    // ... existing code unchanged ...
  };

  const hookRegistrationOrder =
    options.hooksRegistrationOrder ?? extraOptionDefaults().hooksRegistrationOrder;

  if (hookRegistrationOrder === "mainFirst") {
    addMainHooks();
  }

  const { currentRouteSchemaKey, mainInitURL } = getCurrentRouteSchemaKeyAndMainInitURL({
    baseExtraOptions: baseConfig,
    extraOptions: config,
    initURL,
  });

  let resolvedFetchInterceptor: FetchInterceptor | undefined;
  let resolvedCurrentRouteSchemaKey = currentRouteSchemaKey;
  let resolvedInitURL = mainInitURL;
  let resolvedOptions = options;
  let resolvedRequestOptions = request;

  const executePluginSetupFn = async (pluginSetupFn: CallApiPlugin["setup"]) => {
    if (!pluginSetupFn) return;

    const initResult = await pluginSetupFn({
      baseConfig,
      config,
      initURL,
      options,
      request,
    });

    if (!isPlainObject(initResult)) return;

    const urlString = initResult.initURL?.toString();

    if (isString(urlString)) {
      const newResult = getCurrentRouteSchemaKeyAndMainInitURL({
        baseExtraOptions: baseConfig,
        extraOptions: config,
        initURL: urlString,
      });

      resolvedCurrentRouteSchemaKey = newResult.currentRouteSchemaKey;
      resolvedInitURL = newResult.mainInitURL;
    }

    if (isPlainObject(initResult.request)) {
      resolvedRequestOptions = initResult.request as CallApiRequestOptionsForHooks;
    }

    if (isPlainObject(initResult.options)) {
      resolvedOptions = initResult.options;
    }

    // If plugin provides a fetchInterceptor (top-level), compose it
    if (initResult.fetchInterceptor) {
      const prev = resolvedFetchInterceptor;
      resolvedFetchInterceptor = prev
        ? (baseFetch) => initResult.fetchInterceptor!(prev(baseFetch))
        : initResult.fetchInterceptor;
    }

  };

  const resolvedPlugins = getResolvedPlugins({ baseConfig, options });

  for (const plugin of resolvedPlugins) {
    await executePluginSetupFn(plugin.setup);

    if (!plugin.hooks) continue;

    addPluginHooks(plugin.hooks);
  }

  if (hookRegistrationOrder === "pluginsFirst") {
    addMainHooks();
  }

  if (baseConfig.fetchInterceptor) {
      const prev = resolvedFetchInterceptor;
      resolvedFetchInterceptor = prev
        ? (baseFetch) => baseConfig.fetchInterceptor!(prev(baseFetch))
        : baseConfig.fetchInterceptor;
    }

   if (config.fetchInterceptor) {
      const prev = resolvedFetchInterceptor;
      resolvedFetchInterceptor = prev
        ? (baseFetch) => config.fetchInterceptor!(prev(baseFetch))
        : config.fetchInterceptor;
    }

  // ... existing hook composition code ...

  return {
    resolvedCurrentRouteSchemaKey,
    resolvedHooks,
    resolvedInitURL,
    resolvedOptions: {
      ...resolvedOptions,
      fetchInterceptor: resolvedFetchInterceptor
    },
    resolvedRequestOptions,
  };
};
```

**Key Points:**

- Plugin interceptors are returned as a top-level property in `PluginInitResult`
- Composition happens incrementally during plugin initialization
- The final composed interceptor is added to `resolvedOptions.fetchInterceptor`
- Existing code that uses `options.fetchInterceptor` will automatically use the composed interceptor
- No changes needed to `getFetchImpl` or `dedupe.ts` - they already handle `options.fetchInterceptor`

## Error Handling

### Error Types

```typescript
/**
 * Error thrown when an interceptor fails to initialize
 */
class InterceptorInitializationError extends Error {
  constructor(
    public source: string,
    public originalError: unknown
  ) {
    super(`Failed to initialize fetch interceptor from ${source}`);
    this.name = 'InterceptorInitializationError';
    this.cause = originalError;
  }
}

/**
 * Error thrown when an interceptor fails during execution
 */
class InterceptorExecutionError extends Error {
  constructor(
    public source: string,
    public input: RequestInfo | URL,
    public originalError: unknown
  ) {
    super(`Fetch interceptor error (${source})`);
    this.name = 'InterceptorExecutionError';
    this.cause = originalError;
  }
}
```

### Error Wrapping

Wrap interceptor errors with source information for debugging:

```typescript
// During composition
try {
  composedFetch = interceptor(previousFetch);
} catch (error) {
  throw new InterceptorInitializationError(source, error);
}

// During execution (optional enhancement)
const wrappedInterceptor = (originalFetch: FetchFunction): FetchFunction => {
  return async (input, init) => {
    try {
      return await interceptor(originalFetch)(input, init);
    } catch (error) {
      throw new InterceptorExecutionError(source, input, error);
    }
  };
};
```

## Testing Strategy

### Unit Tests

**File:** `packages/callapi/tests/fetch-interceptor.test.ts`

```typescript
describe('fetchInterceptor', () => {
  describe('composition', () => {
    it('should compose interceptors in correct order');
    it('should allow short-circuiting');
    it('should work with customFetchImpl');
  });

  describe('plugin interceptors', () => {
    it('should use interceptor from plugin setup');
    it('should have access to plugin options');
    it('should have access to plugin state via closure');
  });

  describe('options access', () => {
    it('should provide CallApi options in init parameter');
    it('should provide plugin options in init parameter');
  });

  describe('error handling', () => {
    it('should wrap initialization errors with source');
    it('should wrap execution errors with source');
  });

  describe('backward compatibility', () => {
    it('should work without any interceptors');
    it('should work with only customFetchImpl');
  });
});
```

### Integration Tests

- Caching plugin with cache hits/misses
- Authentication plugin with token refresh
- Multiple plugins working together
- Per-request interceptors overriding plugin behavior

## Example: Caching Plugin

```typescript
import { definePlugin } from "@zayne-labs/callapi";
import { z } from "zod";

const cachingPlugin = definePlugin({
  id: "caching-plugin",
  name: "Caching Plugin",
  version: "1.0.0",

  defineExtraOptions: () => z.object({
    cachePolicy: z.enum(["cache-first", "no-cache"]).default("cache-first"),
    cacheLifetimeMs: z.number().int().positive().default(60 * 1000),
  }),

  setup: ({ options }) => {
    const cache = new Map<string, { data: Response; timestamp: number }>();
    const cacheLifetime = options.cacheLifetimeMs;
    const cachePolicy = options.cachePolicy;

    return {
      fetchInterceptor: (originalFetch) => async (input, init) => {
        if (cachePolicy === "no-cache") {
          return originalFetch(input, init);
        }

        const cacheKey = `${input}`;
        const cached = cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < cacheLifetime) {
          console.log(`Cache hit: ${cacheKey}`);
          return cached.data.clone();
        }

        console.log(`Cache miss: ${cacheKey}`);
        const response = await originalFetch(input, init);

        if (response.ok) {
          cache.set(cacheKey, {
            data: response.clone(),
            timestamp: Date.now()
          });
        }

        return response;
      }
    };
  }
});
```

## Usage Examples

### Basic Usage (Base Config)

```typescript
const client = createFetchClient({
  baseURL: 'https://api.example.com',
  fetchInterceptor: (originalFetch) => async (input, init) => {
    console.log('Request starting:', input);
    const response = await originalFetch(input, init);
    console.log('Response:', response.status);
    return response;
  }
});
```

### Per-Request Usage

```typescript
const { data } = await callApi('/users', {
  fetchInterceptor: (originalFetch) => async (input, init) => {
    // Add auth token for this specific request
    const token = await getAuthToken();
    return originalFetch(input, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`
      }
    });
  }
});
```

### Plugin Usage

```typescript
const myPlugin = definePlugin({
  id: 'my-plugin',
  setup: ({ options }) => {
    const state = createState();

    return {
      fetchInterceptor: (originalFetch) => async (input, init) => {
        // Has access to state via closure
        return originalFetch(input, init);
      }
    };
  }
});
```

## Performance Considerations

1. **Composition Overhead**: Minimal - composition happens once per request
2. **Memory**: Each interceptor adds one function to the chain
3. **Call Stack**: Depth increases with number of interceptors (typically 3-5)

## Security Considerations

1. **Option Exposure**: All options are exposed to interceptors - document sensitive data handling
2. **Response Tampering**: Interceptors can modify responses - validate in critical paths
3. **Plugin Trust**: Plugins have full request control - only use trusted plugins
