# Design Document

## Overview

This document outlines the implementation of `fetchMiddleware` composition for CallApi using a dedicated middleware system. The implementation includes:

1. **New `middlewares.ts` module** - Dedicated middleware system with composition logic
2. **Plugin middleware support** - Plugins can define `middlewares` property with `fetchMiddleware`
3. **Unified middleware/hook management** - Both hooks and middlewares use registry-based composition
4. **Automatic composition** - Middlewares from all sources (plugins, base config, per-request) compose automatically

This approach provides a clean separation of concerns and makes middleware a first-class feature alongside hooks.

## Architecture

### Composition Flow

The middleware system uses a registry-based approach where middlewares are collected and composed automatically:

```
graph LR
┌─────────────────────────────────────────────────────────┐
│ Plugin Initialization Phase                             │
├─────────────────────────────────────────────────────────┤
│ 1. Collect plugin middlewares → Add to registry        │
│ 2. Collect base config middleware → Add to registry    │
│ 3. Collect per-request middleware → Add to registry    │
│ 4. Compose all via composeAllMiddlewares()             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Request Execution Phase                                 │
├─────────────────────────────────────────────────────────┤
│ Plugin Middleware 1                                     │
│   ↓ calls fetchImpl                                     │
│ Plugin Middleware 2                                     │
│   ↓ calls fetchImpl                                     │
│ Base Config Middleware                                  │
│   ↓ calls fetchImpl                                     │
│ Per-Request Middleware                                  │
│   ↓ calls fetchImpl                                     │
│ customFetchImpl (if provided)                           │
│   ↓                                                      │
│ Native fetch()                                          │
└─────────────────────────────────────────────────────────┘
```

**Key Points:**

- Middlewares are collected in a Set-based registry
- Composition happens once during plugin initialization
- Each middleware receives `fetchImpl` representing the rest of the chain
- The composed middleware is stored in `options.fetchMiddleware`

## Components and Interfaces

### 1. Middleware System (`middlewares.ts`)

**Location:** `packages/callapi/src/middlewares.ts`

A dedicated module for middleware management:

```typescript
export type FetchImpl = UnmaskType<
  (input: string | Request | URL, init?: RequestInit) => Promise<Response>
>;

export interface Middlewares {
  /**
   * Wraps the fetch implementation to intercept requests at the network layer.
   * Multiple middleware compose in order: plugins → base config → per-request.
   */
  fetchMiddleware?: (fetchImpl: FetchImpl) => FetchImpl;
}

type MiddlewareRegistries = Required<{
  [Key in keyof Middlewares]: Set<Middlewares[Key]>;
}>;

export const getMiddlewareRegistriesAndKeys = () => {
  const middlewareRegistries: MiddlewareRegistries = {
    fetchMiddleware: new Set(),
  };

  const middlewareRegistryKeys = Object.keys(middlewareRegistries) as Array<keyof Middlewares>;

  return { middlewareRegistries, middlewareRegistryKeys };
};

export const composeAllMiddlewares = (
  middlewareArray: Array<Middlewares[keyof Middlewares] | undefined>
) => {
  let composedMiddleware: Middlewares[keyof Middlewares];

  for (const currentMiddleware of middlewareArray) {
    if (!currentMiddleware) continue;

    const previousMiddleware = composedMiddleware;

    composedMiddleware = previousMiddleware
      ? (fetchImpl) => currentMiddleware(previousMiddleware(fetchImpl))
      : currentMiddleware;
  }

  return composedMiddleware;
};
```

**Key Features:**

- Registry-based system similar to hooks
- Automatic composition via `composeAllMiddlewares`
- Type-safe with proper TypeScript inference
- Extensible for future middleware types

### 2. Plugin Middleware Support

**Location:** `packages/callapi/src/plugins.ts`

Plugins define middlewares via the `middlewares` property:

```typescript
export type PluginMiddlewares = Middlewares;

export interface CallApiPlugin {
  // ... other properties ...

  /**
   * Middlewares for the plugin
   */
  middlewares?: Middlewares | ((context: PluginSetupContext) => Awaitable<Middlewares>);
}

// Plugin example:
const cachingPlugin = definePlugin({
  id: "caching",
  middlewares: {
    fetchMiddleware: (fetchImpl) => async (input, init) => {
      const cached = cache.get(input.toString());
      if (cached) return cached;

      const response = await fetchImpl(input, init);
      cache.set(input.toString(), response.clone());
      return response;
    }
  }
});

// Or with dynamic setup:
const authPlugin = definePlugin({
  id: "auth",
  middlewares: ({ options }) => ({
    fetchMiddleware: (fetchImpl) => async (input, init) => {
      const token = await getToken(options.authConfig);
      return fetchImpl(input, {
        ...init,
        headers: { ...init?.headers, Authorization: `Bearer ${token}` }
      });
    }
  })
});
```

### 3. Unified Hook and Middleware Management

**Location:** `packages/callapi/src/plugins.ts`

The `setupHooksAndMiddlewares` function manages both:

```typescript
const setupHooksAndMiddlewares = (context) => {
  const { hookRegistries, hookRegistryKeys } = getHookRegistriesAndKeys();
  const { middlewareRegistries, middlewareRegistryKeys } = getMiddlewareRegistriesAndKeys();

  const addMainMiddlewares = () => {
    for (const middlewareName of middlewareRegistryKeys) {
      const baseMiddleware = baseConfig[middlewareName];
      const instanceMiddleware = config[middlewareName];

      baseMiddleware && middlewareRegistries[middlewareName].add(baseMiddleware);
      instanceMiddleware && middlewareRegistries[middlewareName].add(instanceMiddleware);
    }
  };

  const addPluginMiddlewares = (pluginMiddlewares: PluginMiddlewares) => {
    for (const middlewareName of middlewareRegistryKeys) {
      const pluginMiddleware = pluginMiddlewares[middlewareName];
      if (!pluginMiddleware) continue;

      middlewareRegistries[middlewareName].add(pluginMiddleware);
    }
  };

  const getResolvedMiddlewares = () => {
    const resolvedMiddlewares: Middlewares = {};

    for (const [middlewareName, middlewareRegistry] of Object.entries(middlewareRegistries)) {
      if (middlewareRegistry.size === 0) continue;

      const middlewareArray = [...middlewareRegistry];
      if (middlewareArray.length === 0) continue;

      const composedMiddleware = composeAllMiddlewares(middlewareArray);
      resolvedMiddlewares[middlewareName as keyof Middlewares] = composedMiddleware;
    }

    return resolvedMiddlewares;
  };

  return {
    addMainHooks,
    addMainMiddlewares,
    addPluginHooks,
    addPluginMiddlewares,
    getResolvedHooks,
    getResolvedMiddlewares,
  };
};
```

### 4. Plugin Initialization Flow

**Location:** `packages/callapi/src/plugins.ts`

```typescript
export const initializePlugins = async (context: PluginSetupContext) => {
  const {
    addMainHooks,
    addMainMiddlewares,
    addPluginHooks,
    addPluginMiddlewares,
    getResolvedHooks,
    getResolvedMiddlewares,
  } = setupHooksAndMiddlewares({ baseConfig, config, options });

  const resolvedPlugins = getResolvedPlugins({ baseConfig, options });

  for (const plugin of resolvedPlugins) {
    const [, pluginHooks, pluginMiddlewares] = await Promise.all([
      executePluginSetupFn(plugin.setup),
      isFunction(plugin.hooks) ? plugin.hooks(context) : plugin.hooks,
      isFunction(plugin.middlewares) ? plugin.middlewares(context) : plugin.middlewares,
    ]);

    pluginHooks && addPluginHooks(pluginHooks);
    pluginMiddlewares && addPluginMiddlewares(pluginMiddlewares);
  }

  addMainHooks();
  addMainMiddlewares();

  const resolvedHooks = getResolvedHooks();
  const resolvedMiddlewares = getResolvedMiddlewares();

  return {
    resolvedCurrentRouteSchemaKey,
    resolvedHooks,
    resolvedInitURL,
    resolvedMiddlewares,  // ← Returned to createFetchClient
    resolvedOptions,
    resolvedRequestOptions,
  };
};
```

**Composition Order:**

1. Plugin middlewares are added first (in plugin registration order)
2. Base config middleware is added
3. Per-request middleware is added last
4. All are composed via `composeAllMiddlewares`

### 5. Integration with createFetchClient

**Location:** `packages/callapi/src/createFetchClient.ts`

```typescript
const {
  resolvedCurrentRouteSchemaKey,
  resolvedHooks,
  resolvedInitURL,
  resolvedMiddlewares,  // ← Received from initializePlugins
  resolvedOptions,
  resolvedRequestOptions,
} = await initializePlugins({ baseConfig, config, initURL, options, request });

let options = {
  ...resolvedOptions,
  ...resolvedHooks,
  ...resolvedMiddlewares,  // ← Merged into options
  fullURL,
  initURL: resolvedInitURL,
  initURLNormalized: normalizedInitURL,
} satisfies CallApiExtraOptionsForHooks;

// Later in the code:
const fetchApi = getFetchImpl(options.customFetchImpl, options.fetchMiddleware);
const response = await handleRequestDeferStrategy({ fetchApi, options, request });
```

**Key Points:**

- Middlewares are composed during plugin initialization
- The composed middleware is merged into options
- `getFetchImpl` uses the composed middleware
- No changes needed to dedupe or other systems

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
const wrappedInterceptor = (fetchImpl: FetchFunction): FetchFunction => {
  return async (input, init) => {
    try {
      return await interceptor(fetchImpl)(input, init);
    } catch (error) {
      throw new InterceptorExecutionError(source, input, error);
    }
  };
};
```

## Testing Strategy

### Unit Tests

**File:** `packages/callapi/tests/fetch-middleware.test.ts`

```typescript
describe('fetchMiddleware', () => {
  describe('middleware system', () => {
    it('should compose middlewares in correct order (plugins → base → per-request)');
    it('should handle empty middleware registry');
    it('should compose single middleware correctly');
    it('should compose multiple plugin middlewares in registration order');
  });

  describe('composition', () => {
    it('should allow short-circuiting (returning without calling fetchImpl)');
    it('should work with customFetchImpl');
    it('should pass correct fetchImpl to each middleware');
    it('should maintain proper call chain through all middlewares');
  });

  describe('plugin middlewares', () => {
    it('should use static middlewares object from plugin');
    it('should use dynamic middlewares function from plugin');
    it('should have access to plugin options in dynamic middlewares');
    it('should have access to plugin state via closure');
    it('should handle plugins without middlewares');
  });

  describe('registry system', () => {
    it('should collect middlewares in Set-based registry');
    it('should handle duplicate middleware additions');
    it('should clear registry between requests');
  });

  describe('error handling', () => {
    it('should propagate middleware errors correctly');
    it('should handle errors during composition');
    it('should provide clear error messages');
  });

  describe('backward compatibility', () => {
    it('should work without any middlewares');
    it('should work with only customFetchImpl');
    it('should work with existing hooks');
  });
});
```

### Integration Tests

- Caching plugin with cache hits/misses
- Authentication plugin with token refresh
- Multiple plugins with middlewares working together
- Per-request middlewares overriding plugin behavior
- Middleware + hooks working together
- Middleware + dedupe strategy working together

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

  // Option 1: Static middlewares object
  middlewares: {
    fetchMiddleware: (fetchImpl) => {
      const cache = new Map<string, { data: Response; timestamp: number }>();

      return async (input, init) => {
        const cacheKey = `${input}`;
        const cached = cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < 60000) {
          return cached.data.clone();
        }

        const response = await fetchImpl(input, init);

        if (response.ok) {
          cache.set(cacheKey, { data: response.clone(), timestamp: Date.now() });
        }

        return response;
      };
    }
  }
});

// Option 2: Dynamic middlewares with access to plugin options
const cachingPluginDynamic = definePlugin({
  id: "caching-plugin",
  name: "Caching Plugin",
  version: "1.0.0",

  defineExtraOptions: () => z.object({
    cachePolicy: z.enum(["cache-first", "no-cache"]).default("cache-first"),
    cacheLifetimeMs: z.number().int().positive().default(60 * 1000),
  }),

  middlewares: ({ options }) => {
    const cache = new Map<string, { data: Response; timestamp: number }>();
    const cacheLifetime = options.cacheLifetimeMs;
    const cachePolicy = options.cachePolicy;

    return {
      fetchMiddleware: (fetchImpl) => async (input, init) => {
        if (cachePolicy === "no-cache") {
          return fetchImpl(input, init);
        }

        const cacheKey = `${input}`;
        const cached = cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < cacheLifetime) {
          console.log(`Cache hit: ${cacheKey}`);
          return cached.data.clone();
        }

        console.log(`Cache miss: ${cacheKey}`);
        const response = await fetchImpl(input, init);

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
  fetchMiddleware: (fetchImpl) => async (input, init) => {
    console.log('Request starting:', input);
    const response = await fetchImpl(input, init);
    console.log('Response:', response.status);
    return response;
  }
});
```

### Per-Request Usage

```typescript
const { data } = await callApi('/users', {
  fetchMiddleware: (fetchImpl) => async (input, init) => {
    // Add auth token for this specific request
    const token = await getAuthToken();
    return fetchImpl(input, {
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
  middlewares: ({ options }) => {
    const state = createState();

    return {
      fetchMiddleware: (fetchImpl) => async (input, init) => {
        // Has access to state via closure
        state.increment();
        return fetchImpl(input, init);
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
