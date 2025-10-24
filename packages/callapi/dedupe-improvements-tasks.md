# Deduplication Improvements

Enhancements to make CallApi's deduplication more robust and flexible for real-world use cases.

## Current Cache Behavior

Cache entries are automatically removed after each request completes (in the `finally` block). This means:

- No memory leaks - cache only holds in-flight requests
- No need for TTL or cleanup mechanisms
- Cache is self-managing

## Priority Order

### Phase 1: Core Improvements (High Priority)

#### 1.1 Smarter Default Key Generation

Improve the default key to exclude volatile data that shouldn't affect deduplication.

**Current Issue:**
Default key includes ALL headers and query params, even volatile ones like timestamps.

**Solution:**

```ts
const generateSmartDedupeKey = (context: RequestContext): string => {
 // Exclude volatile headers
 const volatileHeaders = new Set([
  "date",
  "authorization",
  "user-agent",
  "x-request-id",
  "x-trace-id",
  "timestamp",
 ]);

 const stableHeaders: Record<string, string> = {};
 for (const [key, value] of context.request.headers.entries()) {
  if (!volatileHeaders.has(key.toLowerCase())) {
   stableHeaders[key] = value;
  }
 }

 // Exclude volatile query params
 const url = new URL(context.options.fullURL);
 const volatileParams = new Set(["timestamp", "_t", "cache_bust", "cb", "_"]);

 for (const param of volatileParams) {
  url.searchParams.delete(param);
 }

 return deterministicHashFn({
  url: url.toString(),
  method: context.options.method,
  body: context.request.body,
  headers: stableHeaders,
 });
};
```

**Why:** Prevents false cache misses from irrelevant differences.

---

### Phase 2: Advanced Strategies (Medium Priority)

#### 2.1 Throttle Strategy

Limit request rate to prevent API rate-limiting.

**Type Changes:**

````ts
type DedupeStrategyUnion = UnmaskType<"cancel" | "defer" | "none" | "throttle">;

export type DedupeOptions = {
 // ... existing options

 /**
  * Configuration for throttle strategy.
  * Limits requests within a time window.
  *
  * @example
  * ```ts
  * const client = createFetchClient({
  *   dedupeStrategy: "throttle",
  *   throttleConfig: {
  *     maxRequests: 10,
  *     timeWindow: 60000 // 10 requests per minute
  *   }
  * });
  * ```
  */
 throttleConfig?: {
  maxRequests: number;
  timeWindow: number; // milliseconds
 };
};
````

**Implementation:**

```ts
const createThrottleStrategy = (config: { maxRequests: number; timeWindow: number }) => {
 const requestCounts = new Map<string, { count: number; windowStart: number }>();

 const canExecute = (key: string): boolean => {
  const now = Date.now();
  const existing = requestCounts.get(key);

  if (!existing || now - existing.windowStart >= config.timeWindow) {
   requestCounts.set(key, { count: 1, windowStart: now });
   return true;
  }

  if (existing.count < config.maxRequests) {
   existing.count++;
   return true;
  }

  return false;
 };

 const cleanup = () => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
   if (now - data.windowStart >= config.timeWindow) {
    requestCounts.delete(key);
   }
  }
 };

 return { canExecute, cleanup };
};
```

**Why:** Prevents hitting API rate limits, especially for public APIs.

---

#### 2.2 Debounce Strategy

Wait for quiet period before executing (perfect for search-as-you-type).

**Type Changes:**

````ts
type DedupeStrategyUnion = UnmaskType<"cancel" | "debounce" | "defer" | "none" | "throttle">;

export type DedupeOptions = {
 // ... existing options

 /**
  * Configuration for debounce strategy.
  * Waits for quiet period before executing.
  *
  * @example
  * ```ts
  * const searchClient = createFetchClient({
  *   dedupeStrategy: "debounce",
  *   debounceConfig: {
  *     delay: 300 // Wait 300ms after last request
  *   }
  * });
  *
  * // Perfect for search-as-you-type
  * const handleSearch = (query: string) => {
  *   searchClient("/api/search", {
  *     query: { q: query },
  *     dedupeKey: "search"
  *   });
  * };
  * ```
  */
 debounceConfig?: {
  delay: number; // milliseconds
 };
};
````

**Implementation:**

```ts
const createDebounceStrategy = (delay: number) => {
 const timers = new Map<string, NodeJS.Timeout>();
 const pending = new Map<string, { reject: Function; resolve: Function }>();

 const schedule = <T>(key: string, executor: () => Promise<T>): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
   // Clear existing timer
   const existingTimer = timers.get(key);
   if (existingTimer) {
    clearTimeout(existingTimer);
   }

   // Reject previous pending request
   const existingRequest = pending.get(key);
   if (existingRequest) {
    existingRequest.reject(new DOMException("Superseded", "AbortError"));
   }

   // Store new request
   pending.set(key, { resolve, reject });

   // Set new timer
   const timer = setTimeout(async () => {
    try {
     const result = await executor();
     resolve(result);
    } catch (error) {
     reject(error);
    } finally {
     pending.delete(key);
     timers.delete(key);
    }
   }, delay);

   timers.set(key, timer);
  });
 };

 const cancel = (key: string): boolean => {
  const timer = timers.get(key);
  const request = pending.get(key);

  if (timer) {
   clearTimeout(timer);
   timers.delete(key);
  }

  if (request) {
   request.reject(new DOMException("Request cancelled", "AbortError"));
   pending.delete(key);
   return true;
  }

  return false;
 };

 const cleanup = () => {
  for (const timer of timers.values()) {
   clearTimeout(timer);
  }
  timers.clear();
  pending.clear();
 };

 return { schedule, cancel, cleanup };
};
```

**Why:** Better UX for search, autocomplete, and other rapid-fire scenarios.

---

### Phase 3: Monitoring (Low Priority)

#### 3.1 Cache Metrics

Add optional metrics for debugging and monitoring.

**Type Changes:**

````ts
export type CacheMetrics = {
 hitRate: number;
 hits: number;
 misses: number;
 size: number;
};

export type DedupeOptions = {
 // ... existing options

 /**
  * Enable cache metrics collection.
  *
  * @default false
  * @example
  * ```ts
  * const client = createFetchClient({
  *   enableMetrics: true,
  *   onCacheEvent: (event) => {
  *     console.log(`Cache ${event.type}: ${event.key}`);
  *   }
  * });
  *
  * // Later
  * const metrics = getCacheMetrics();
  * console.log(`Hit rate: ${metrics.hitRate}%`);
  * ```
  */
 enableMetrics?: boolean;

 /**
  * Callback for cache events.
  */
 onCacheEvent?: (event: { key: string; timestamp: number; type: "hit" | "miss" | "removed" }) => void;
};
````

**Why:** Helps debug deduplication issues and optimize cache settings.

---

## Implementation Notes

### Strategy Integration

New strategies integrate into `createDedupeStrategy`:

```ts
export const createDedupeStrategy = async (context: DedupeContext) => {
 // ... existing code

 const resolvedDedupeStrategy = isFunction(dedupeStrategy) ? dedupeStrategy(context) : dedupeStrategy;

 // Throttle strategy
 if (resolvedDedupeStrategy === "throttle") {
  const throttleConfig = globalOptions.throttleConfig ?? { maxRequests: 10, timeWindow: 60000 };
  const throttle = createThrottleStrategy(throttleConfig);

  if (!throttle.canExecute(dedupeKey)) {
   throw new Error(
    `Request throttled: exceeded ${throttleConfig.maxRequests} requests per ${throttleConfig.timeWindow}ms`
   );
  }
 }

 // Debounce strategy
 if (resolvedDedupeStrategy === "debounce") {
  const debounceConfig = globalOptions.debounceConfig ?? { delay: 300 };
  const debounce = createDebounceStrategy(debounceConfig.delay);

  // Return debounced execution
  return {
   handleRequestDeferStrategy: async (deferContext) => {
    return debounce.schedule(dedupeKey, async () => {
     // Execute the actual request
     const { fetchApi, options: localOptions, request: localRequest } = deferContext;
     const streamableRequest = await toStreamableRequest({
      ...context,
      options: localOptions,
      request: localRequest,
     });
     const response = await fetchApi(localOptions.fullURL, streamableRequest);
     return toStreamableResponse({ ...context, response });
    });
   },
   removeDedupeKeyFromCache: () => debounce.cancel(dedupeKey),
   resolvedDedupeStrategy,
   // ... other handlers
  };
 }

 // ... existing cancel/defer logic
};
```

---

## Testing Requirements

### Unit Tests

- [ ] Smart key generation excludes volatile data
- [ ] Throttle strategy timing
- [ ] Debounce strategy cancellation
- [ ] Metrics accuracy

### Integration Tests

- [ ] Real HTTP requests with throttle
- [ ] Debounce with rapid requests
- [ ] Global scope behavior

### Performance Tests

- [ ] Key generation < 1ms average
- [ ] Cache lookup < 0.1ms

---

## Migration Guide

### Breaking Changes

None. All new features are opt-in.

### Recommended Updates

```ts
// Before
const client = createFetchClient({
 dedupeStrategy: "cancel",
});

// After (with throttle for rate-limited APIs)
const mainClient = createFetchClient({
 dedupeStrategy: "throttle",
 throttleConfig: {
  maxRequests: 10,
  timeWindow: 60000,
 },
});

// After (with debounce for search)
const searchClient = createFetchClient({
 dedupeStrategy: "debounce",
 debounceConfig: {
  delay: 300,
 },
});
```

---

## Success Metrics

- **Performance**: Better handling of rapid-fire requests (search, autocomplete)
- **API Compliance**: Respect rate limits with throttle strategy
- **Developer Experience**: Clear metrics and debugging
- **Test Coverage**: >95%
- **Documentation**: Complete examples for all features

---

## Notes

- Keep implementation simple and focused
- Follow existing code style (see `dedupe.ts`)
- All features are opt-in, no breaking changes
- Prioritize real-world use cases over theoretical features
- Document with practical examples, not just API docs
