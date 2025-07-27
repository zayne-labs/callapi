# CallApi Deduplication Improvements Tasks

## Overview
This document outlines improvements to enhance the CallApi deduplication functionality, making it more robust, performant, and suitable for a wider range of use cases.

## Priority Implementation Order

### Phase 1: Core Infrastructure (High Priority)

- [ ] **1.1 Cache TTL and Size Limits**
  - Add `maxCacheSize` option (default: 1000)
  - Add `cacheTTL` option (default: 300000ms / 5 minutes)
  - Add `enableCacheCleanup` option (default: true)
  - Implement automatic cache cleanup with periodic intervals
  - Add cache eviction strategies (LRU, FIFO)
  - Update `DedupeOptions` interface with new properties

- [ ] **1.2 Enhanced Cache Implementation**
  - Create `TTLCache` class with timestamp tracking
  - Implement periodic cleanup mechanism (every 60 seconds)
  - Add cache size monitoring and automatic eviction
  - Ensure memory-efficient cache operations
  - Add cache statistics tracking

- [ ] **1.3 Improved Default Key Generation**
  - Create `generateSmartDedupeKey` function
  - Define volatile headers exclusion list (date, authorization, user-agent, etc.)
  - Implement stable headers extraction
  - Add intelligent body hashing for POST/PUT requests
  - Extract and normalize relevant query parameters
  - Exclude timestamp-based parameters from key generation

### Phase 2: Advanced Features (Medium Priority)

- [ ] **2.1 Request Priority System**
  - Add `priority` option: 'low' | 'normal' | 'high' | 'critical'
  - Add `cancellable` option (default: true)
  - Implement priority-based request cancellation logic
  - Allow higher priority requests to override lower priority ones
  - Update cache management to respect priority levels

- [ ] **2.2 Advanced Deduplication Strategies**
  - Implement `"queue"` strategy - queue requests instead of cancelling
  - Implement `"throttle"` strategy - max N requests per time window
  - Implement `"debounce"` strategy - wait for quiet period
  - Add `throttleConfig` with `maxRequests` and `timeWindow`
  - Add `debounceConfig` with `delay` parameter
  - Create strategy-specific handlers and logic

- [ ] **2.3 Cache Analytics and Monitoring**
  - Add `enableMetrics` option (default: false)
  - Create `CacheMetrics` interface (hits, misses, size, hitRate, evictions)
  - Add `onCacheEvent` callback for cache events
  - Implement `getCacheMetrics()` function
  - Track cache performance statistics
  - Add debugging and monitoring capabilities

### Phase 3: Advanced Control (Medium Priority)

- [ ] **3.1 Conditional Deduplication**
  - Add `shouldDedupe` callback function
  - Add `isDuplicate` custom comparison function
  - Allow fine-grained control over deduplication logic
  - Support context-aware deduplication decisions
  - Enable custom duplicate detection algorithms

- [ ] **3.2 Enhanced Error Handling**
  - Add `onDeferredRequestError` option: 'retry' | 'fail' | 'fallback'
  - Add `maxDeferredSharing` limit for shared promises
  - Add `fallbackStrategy` option: 'execute' | 'fail'
  - Implement robust error recovery mechanisms
  - Handle edge cases in deferred request failures

### Phase 4: Advanced Features (Low Priority)

- [ ] **4.1 Request Grouping and Batching**
  - Add `batchGroup` option for grouping related requests
  - Add `batchTimeout` for maximum batch wait time
  - Add `batchSize` for maximum requests per batch
  - Implement batch processing logic
  - Create batch execution strategies

- [ ] **4.2 Performance Optimizations**
  - Optimize key generation performance
  - Implement efficient cache lookup algorithms
  - Add request coalescing for identical requests
  - Optimize memory usage patterns
  - Profile and benchmark deduplication performance

## Implementation Details

### 1. Enhanced DedupeOptions Interface

```typescript
export type DedupeOptions = {
  // Existing options
  dedupeCacheScope?: "global" | "local";
  dedupeCacheScopeKey?: "default" | AnyString;
  dedupeKey?: string | ((context: RequestContext) => string);
  dedupeStrategy?: "cancel" | "defer" | "none" | "queue" | "throttle" | "debounce";

  /**
   * Maximum number of entries to keep in the deduplication cache
   * When exceeded, oldest entries are evicted using LRU strategy
   * @default 1000
   * @example
   * ```ts
   * const client = createFetchClient({
   *   maxCacheSize: 500, // Keep max 500 cached requests
   *   cacheTTL: 300000   // Each entry expires after 5 minutes
   * });
   * ```
   */
  maxCacheSize?: number;

  /**
   * Time-to-live for cache entries in milliseconds
   * Entries older than this will be automatically cleaned up
   * @default 300000 (5 minutes)
   * @example
   * ```ts
   * const client = createFetchClient({
   *   cacheTTL: 60000, // Cache entries expire after 1 minute
   *   enableCacheCleanup: true
   * });
   * ```
   */
  cacheTTL?: number;

  /**
   * Enable automatic cache cleanup of expired entries
   * @default true
   */
  enableCacheCleanup?: boolean;

  /**
   * Priority level for request deduplication
   * Higher priority requests can override lower priority ones
   * @example
   * ```ts
   * // Critical user action that should cancel background requests
   * const saveData = await client("/api/save", {
   *   method: "POST",
   *   body: userData,
   *   priority: "critical", // Will cancel lower priority requests
   *   dedupeStrategy: "cancel"
   * });
   *
   * // Background data refresh
   * const refreshData = await client("/api/data", {
   *   priority: "low",
   *   cancellable: true // Can be cancelled by higher priority requests
   * });
   * ```
   */
  priority?: 'low' | 'normal' | 'high' | 'critical';

  /**
   * Whether this request can be cancelled by higher priority requests
   * @default true
   */
  cancellable?: boolean;

  /**
   * Configuration for throttle strategy
   * Limits the number of requests within a time window
   * @example
   * ```ts
   * const apiClient = createFetchClient({
   *   dedupeStrategy: "throttle",
   *   throttleConfig: {
   *     maxRequests: 10,    // Max 10 requests
   *     timeWindow: 60000   // Per minute
   *   }
   * });
   * ```
   */
  throttleConfig?: {
    maxRequests: number;
    timeWindow: number; // in milliseconds
  };

  /**
   * Configuration for debounce strategy
   * Waits for a quiet period before executing the request
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
   *     dedupeKey: "search" // All searches share same key
   *   });
   * };
   * ```
   */
  debounceConfig?: {
    delay: number; // in milliseconds
  };

  /**
   * Enable cache metrics collection for monitoring and debugging
   * @default false
   * @example
   * ```ts
   * const client = createFetchClient({
   *   enableMetrics: true,
   *   onCacheEvent: (event) => {
   *     console.log(`Cache ${event.type}: ${event.key} at ${event.timestamp}`);
   *
   *     if (event.type === 'eviction') {
   *       console.warn('Cache is full, consider increasing maxCacheSize');
   *     }
   *   }
   * });
   *
   * // Later, get metrics
   * const metrics = getCacheMetrics();
   * console.log(`Hit rate: ${metrics.hitRate}%`);
   * ```
   */
  enableMetrics?: boolean;

  /**
   * Callback for cache events (hits, misses, evictions, cleanup)
   * Useful for monitoring, debugging, and analytics
   */
  onCacheEvent?: (event: {
    type: 'hit' | 'miss' | 'eviction' | 'cleanup';
    key: string;
    timestamp: number;
    metadata?: {
      cacheSize?: number;
      hitRate?: number;
      evictedEntry?: any;
    };
  }) => void;

  /**
   * Condition function to determine if request should be deduplicated
   * Provides fine-grained control over deduplication logic
   * @example
   * ```ts
   * const client = createFetchClient({
   *   shouldDedupe: (context) => {
   *     // Don't dedupe POST requests with different bodies
   *     if (context.options.method === 'POST') {
   *       return false;
   *     }
   *
   *     // Don't dedupe requests with authentication headers
   *     const hasAuth = context.request.headers.get('Authorization');
   *     if (hasAuth) {
   *       return false;
   *     }
   *
   *     // Dedupe everything else
   *     return true;
   *   }
   * });
   * ```
   */
  shouldDedupe?: (context: RequestContext) => boolean;

  /**
   * Custom comparison function for determining if requests are duplicates
   * Allows custom duplicate detection beyond the default key-based approach
   * @example
   * ```ts
   * const client = createFetchClient({
   *   isDuplicate: (current, cached) => {
   *     // Custom logic: consider requests duplicate if URLs match
   *     // regardless of headers or body
   *     return current.options.fullURL === cached.options.fullURL;
   *   }
   * });
   * ```
   */
  isDuplicate?: (current: RequestContext, cached: RequestContext) => boolean;

  /**
   * What to do when a deferred request fails
   * @example
   * ```ts
   * const client = createFetchClient({
   *   dedupeStrategy: "defer",
   *   onDeferredRequestError: "retry", // Retry failed deferred requests
   *   maxDeferredSharing: 5 // Max 5 requests can share same promise
   * });
   * ```
   */
  onDeferredRequestError?: 'retry' | 'fail' | 'fallback';

  /**
   * Maximum number of requests that can share the same deferred promise
   * Prevents memory issues with too many waiting requests
   * @default 10
   */
  maxDeferredSharing?: number;

  /**
   * Fallback strategy when deduplication fails
   * @default 'execute'
   */
  fallbackStrategy?: 'execute' | 'fail';

  // Future batching features
  batchGroup?: string;
  batchTimeout?: number;
  batchSize?: number;
}

/**
 * Cache metrics interface for monitoring deduplication performance
 */
export type CacheMetrics = {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  evictions: number;
  totalRequests: number;
  averageKeyGenerationTime: number;
  memoryUsage: number;
};
```

### 2. TTL Cache Implementation with LRU Eviction

```typescript
type CacheEntry = {
  data: RequestInfo;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
};

class TTLCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder = new Map<string, number>(); // For LRU tracking
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout;
  private metrics: CacheMetrics;
  private accessCounter = 0;

  constructor(maxSize = 1000, defaultTTL = 300000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.metrics = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
      evictions: 0,
      totalRequests: 0,
      averageKeyGenerationTime: 0,
      memoryUsage: 0
    };
    this.startCleanup();
  }

  get(key: string): RequestInfo | undefined {
    this.metrics.totalRequests++;

    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.metrics.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Update access tracking for LRU
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.accessOrder.set(key, this.accessCounter++);

    this.metrics.hits++;
    this.updateHitRate();
    return entry.data;
  }

  set(key: string, data: RequestInfo, ttl = this.defaultTTL): void {
    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 1,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
    this.accessOrder.set(key, this.accessCounter++);
    this.metrics.size = this.cache.size;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    this.metrics.size = this.cache.size;
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.metrics.size = 0;
  }

  private evictLRU(): void {
    // Find the least recently used entry
    let oldestKey: string | undefined;
    let oldestAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      this.metrics.evictions++;
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Clean every minute
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    }

    this.metrics.size = this.cache.size;
  }

  private updateHitRate(): void {
    this.metrics.hitRate = this.metrics.totalRequests > 0
      ? (this.metrics.hits / this.metrics.totalRequests) * 100
      : 0;
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}
```

### 3. Smart Key Generation with Body Hashing

```typescript
const generateSmartDedupeKey = async (context: RequestContext): Promise<string> => {
  const startTime = performance.now();

  // Define volatile headers that should be excluded from key generation
  const volatileHeaders = new Set([
    'date', 'authorization', 'user-agent', 'x-request-id',
    'x-trace-id', 'x-correlation-id', 'timestamp', 'x-forwarded-for',
    'accept-encoding', 'connection', 'cache-control', 'pragma',
    'if-modified-since', 'if-none-match'
  ]);

  // Extract stable headers
  const stableHeaders: Record<string, string> = {};
  if (context.request.headers) {
    for (const [key, value] of context.request.headers.entries()) {
      if (!volatileHeaders.has(key.toLowerCase())) {
        stableHeaders[key.toLowerCase()] = value;
      }
    }
  }

  // Hash request body intelligently
  const bodyHash = await hashRequestBody(context.request.body);

  // Extract and normalize relevant query parameters
  const relevantParams = extractRelevantParams(context.options.fullURL);

  // Create deterministic key data
  const keyData = {
    url: normalizeURL(context.options.fullURL, relevantParams),
    method: context.options.method?.toUpperCase() || 'GET',
    body: bodyHash,
    headers: stableHeaders,
    contentType: stableHeaders['content-type'] || null
  };

  const key = deterministicHashFn(keyData);

  // Track key generation performance
  const generationTime = performance.now() - startTime;
  updateKeyGenerationMetrics(generationTime);

  return key;
};

/**
 * Hash request body based on its type and content
 */
const hashRequestBody = async (body: BodyInit | null): Promise<string | null> => {
  if (!body) return null;

  try {
    if (typeof body === 'string') {
      return simpleHash(body);
    }

    if (body instanceof FormData) {
      // Hash FormData entries
      const entries: string[] = [];
      for (const [key, value] of body.entries()) {
        entries.push(`${key}=${typeof value === 'string' ? value : '[File]'}`);
      }
      return simpleHash(entries.sort().join('&'));
    }

    if (body instanceof URLSearchParams) {
      // Sort parameters for consistent hashing
      const sorted = Array.from(body.entries()).sort();
      return simpleHash(sorted.map(([k, v]) => `${k}=${v}`).join('&'));
    }

    if (body instanceof ArrayBuffer || body instanceof Uint8Array) {
      // Hash binary data (first 1KB for performance)
      const bytes = new Uint8Array(body instanceof ArrayBuffer ? body : body.buffer);
      const sample = bytes.slice(0, 1024);
      return simpleHash(Array.from(sample).join(','));
    }

    if (body instanceof Blob) {
      // Hash blob metadata
      return simpleHash(`${body.type}-${body.size}`);
    }

    // For ReadableStream or other types, use a generic identifier
    return simpleHash(body.constructor.name);
  } catch (error) {
    // Fallback to generic hash if body processing fails
    return simpleHash(String(body));
  }
};

/**
 * Extract relevant query parameters, excluding volatile ones
 */
const extractRelevantParams = (fullURL: string): Record<string, string> => {
  try {
    const url = new URL(fullURL);
    const relevantParams: Record<string, string> = {};

    // Parameters to exclude from deduplication key
    const volatileParams = new Set([
      'timestamp', '_t', 'cache_bust', 'cb', '_', 'nocache',
      'random', 'r', 'time', 'ts', '_ts', 'v', 'version'
    ]);

    for (const [key, value] of url.searchParams.entries()) {
      if (!volatileParams.has(key.toLowerCase())) {
        relevantParams[key] = value;
      }
    }

    return relevantParams;
  } catch {
    return {};
  }
};

/**
 * Normalize URL by removing volatile parameters and fragments
 */
const normalizeURL = (fullURL: string, relevantParams?: Record<string, string>): string => {
  try {
    const url = new URL(fullURL);

    // Remove fragment
    url.hash = '';

    // Rebuild search params with only relevant ones
    if (relevantParams) {
      url.search = '';
      for (const [key, value] of Object.entries(relevantParams)) {
        url.searchParams.set(key, value);
      }
      // Sort parameters for consistency
      url.searchParams.sort();
    }

    return url.toString();
  } catch {
    return fullURL;
  }
};

/**
 * Simple hash function for strings
 */
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
};

/**
 * Track key generation performance metrics
 */
let keyGenerationTimes: number[] = [];
const updateKeyGenerationMetrics = (time: number): void => {
  keyGenerationTimes.push(time);

  // Keep only last 100 measurements
  if (keyGenerationTimes.length > 100) {
    keyGenerationTimes = keyGenerationTimes.slice(-100);
  }
};

const getAverageKeyGenerationTime = (): number => {
  if (keyGenerationTimes.length === 0) return 0;
  return keyGenerationTimes.reduce((a, b) => a + b, 0) / keyGenerationTimes.length;
};
```

### 4. Advanced Strategy Implementations

```typescript
/**
 * Throttle strategy implementation
 * Limits the number of requests within a time window
 */
class ThrottleStrategy {
  private requestCounts = new Map<string, { count: number; windowStart: number }>();
  private config: Required<DedupeOptions['throttleConfig']>;

  constructor(config: DedupeOptions['throttleConfig']) {
    this.config = {
      maxRequests: config?.maxRequests ?? 10,
      timeWindow: config?.timeWindow ?? 60000
    };
  }

  canExecute(key: string): boolean {
    const now = Date.now();
    const existing = this.requestCounts.get(key);

    if (!existing) {
      this.requestCounts.set(key, { count: 1, windowStart: now });
      return true;
    }

    // Check if we're in a new time window
    if (now - existing.windowStart >= this.config.timeWindow) {
      this.requestCounts.set(key, { count: 1, windowStart: now });
      return true;
    }

    // Check if we're under the limit
    if (existing.count < this.config.maxRequests) {
      existing.count++;
      return true;
    }

    return false;
  }

  getTimeUntilNextSlot(key: string): number {
    const existing = this.requestCounts.get(key);
    if (!existing) return 0;

    const timeElapsed = Date.now() - existing.windowStart;
    return Math.max(0, this.config.timeWindow - timeElapsed);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requestCounts.entries()) {
      if (now - data.windowStart >= this.config.timeWindow) {
        this.requestCounts.delete(key);
      }
    }
  }
}

/**
 * Debounce strategy implementation
 * Waits for a quiet period before executing the request
 */
class DebounceStrategy {
  private timers = new Map<string, NodeJS.Timeout>();
  private pendingRequests = new Map<string, {
    executor: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    context: RequestContext;
  }>();
  private config: Required<DedupeOptions['debounceConfig']>;

  constructor(config: DedupeOptions['debounceConfig']) {
    this.config = {
      delay: config?.delay ?? 300
    };
  }

  scheduleExecution<T>(
    key: string,
    context: RequestContext,
    executor: () => Promise<T>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Clear existing timer
      const existingTimer = this.timers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Reject previous pending request (it was superseded)
      const existingRequest = this.pendingRequests.get(key);
      if (existingRequest) {
        existingRequest.reject(new DOMException('Request superseded by newer request', 'AbortError'));
      }

      // Store new request
      this.pendingRequests.set(key, {
        executor,
        resolve,
        reject,
        context
      });

      // Set new timer
      const timer = setTimeout(async () => {
        const request = this.pendingRequests.get(key);
        if (request) {
          try {
            const result = await request.executor();
            request.resolve(result);
          } catch (error) {
            request.reject(error);
          } finally {
            this.pendingRequests.delete(key);
            this.timers.delete(key);
          }
        }
      }, this.config.delay);

      this.timers.set(key, timer);
    });
  }

  cancel(key: string): boolean {
    const timer = this.timers.get(key);
    const request = this.pendingRequests.get(key);

    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    if (request) {
      request.reject(new DOMException('Request cancelled', 'AbortError'));
      this.pendingRequests.delete(key);
      return true;
    }

    return false;
  }

  cleanup(): void {
    for (const [key, timer] of this.timers.entries()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.pendingRequests.clear();
  }
}

/**
 * Queue strategy implementation
 * Queues requests instead of cancelling them
 */
class QueueStrategy {
  private queues = new Map<string, Array<{
    executor: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    context: RequestContext;
  }>>();
  private processing = new Set<string>();
  private maxQueueSize = 10;

  async enqueue<T>(
    key: string,
    context: RequestContext,
    executor: () => Promise<T>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queue = this.queues.get(key) || [];

      // Check queue size limit
      if (queue.length >= this.maxQueueSize) {
        reject(new Error(`Queue for key '${key}' is full (max: ${this.maxQueueSize})`));
        return;
      }

      queue.push({ executor, resolve, reject, context });
      this.queues.set(key, queue);

      // Start processing if not already processing
      if (!this.processing.has(key)) {
        this.processQueue(key);
      }
    });
  }

  private async processQueue(key: string): Promise<void> {
    if (this.processing.has(key)) return;

    this.processing.add(key);
    const queue = this.queues.get(key);

    while (queue && queue.length > 0) {
      const request = queue.shift();
      if (request) {
        try {
          const result = await request.executor();
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      }
    }

    this.processing.delete(key);
    if (queue && queue.length === 0) {
      this.queues.delete(key);
    }
  }

  getQueueSize(key: string): number {
    return this.queues.get(key)?.length || 0;
  }

  clearQueue(key: string): void {
    const queue = this.queues.get(key);
    if (queue) {
      queue.forEach(request => {
        request.reject(new DOMException('Queue cleared', 'AbortError'));
      });
      this.queues.delete(key);
    }
    this.processing.delete(key);
  }
}
```

### 5. Usage Examples with Advanced Features

```typescript
// Advanced deduplication with priority and TTL
const criticalClient = createFetchClient({
  dedupeStrategy: "cancel",
  priority: "critical",
  cacheTTL: 60000, // 1 minute
  maxCacheSize: 500,
  enableMetrics: true,

  onCacheEvent: (event) => {
    console.log(`Cache ${event.type} for key: ${event.key}`);

    if (event.type === 'eviction') {
      console.warn('Cache is full, consider increasing maxCacheSize');
    }

    if (event.type === 'hit' && event.metadata?.hitRate) {
      console.log(`Current hit rate: ${event.metadata.hitRate.toFixed(2)}%`);
    }
  },

  shouldDedupe: (context) => {
    // Don't dedupe POST requests with different bodies
    if (context.options.method === 'POST' && context.request.body) {
      return false;
    }

    // Don't dedupe requests with authentication headers
    const hasAuth = context.request.headers?.get('Authorization');
    if (hasAuth) {
      return false;
    }

    // Dedupe everything else
    return true;
  }
});

// Throttled API client for rate-limited APIs
const throttledClient = createFetchClient({
  baseURL: "https://api.ratelimited.com",
  dedupeStrategy: "throttle",
  throttleConfig: {
    maxRequests: 10,
    timeWindow: 60000 // 10 requests per minute
  },

  onCacheEvent: (event) => {
    if (event.type === 'throttled') {
      const waitTime = event.metadata?.waitTime || 0;
      console.log(`Request throttled, wait ${waitTime}ms`);
    }
  }
});

// Debounced search client
const searchClient = createFetchClient({
  baseURL: "https://api.search.com",
  dedupeStrategy: "debounce",
  debounceConfig: {
    delay: 300 // Wait 300ms after last request
  }
});

// Perfect for search-as-you-type
const handleSearch = (query: string) => {
  return searchClient("/search", {
    query: { q: query },
    dedupeKey: "search", // All searches share same key
    priority: "normal"
  });
};

// Queue-based client for sequential processing
const sequentialClient = createFetchClient({
  dedupeStrategy: "queue",
  maxCacheSize: 100,

  // Custom duplicate detection
  isDuplicate: (current, cached) => {
    // Consider requests duplicate only if URLs and methods match
    return current.options.fullURL === cached.options.fullURL &&
           current.options.method === cached.options.method;
  }
});

// High-priority user action that cancels background requests
const saveUserData = async (userData: any) => {
  return criticalClient("/api/user/save", {
    method: "POST",
    body: userData,
    priority: "critical", // Will cancel lower priority requests
    dedupeStrategy: "cancel",
    dedupeKey: "user-save"
  });
};

// Background data refresh (can be cancelled)
const refreshUserData = async () => {
  return criticalClient("/api/user/data", {
    priority: "low",
    cancellable: true,
    dedupeStrategy: "defer", // Share result if multiple components need it
    dedupeKey: "user-data-refresh"
  });
};

// Get cache metrics for monitoring
const monitorCache = () => {
  const metrics = getCacheMetrics();

  console.log(`Cache Performance:
    Hit Rate: ${metrics.hitRate.toFixed(2)}%
    Total Requests: ${metrics.totalRequests}
    Cache Size: ${metrics.size}/${maxCacheSize}
    Evictions: ${metrics.evictions}
    Avg Key Gen Time: ${metrics.averageKeyGenerationTime.toFixed(2)}ms
  `);

  // Alert if hit rate is low
  if (metrics.hitRate < 50 && metrics.totalRequests > 100) {
    console.warn('Low cache hit rate detected. Consider reviewing deduplication keys.');
  }

  // Alert if cache is frequently full
  if (metrics.evictions > metrics.totalRequests * 0.1) {
    console.warn('High eviction rate detected. Consider increasing maxCacheSize.');
  }
};

// Advanced error handling with deferred requests
const robustClient = createFetchClient({
  dedupeStrategy: "defer",
  onDeferredRequestError: "retry", // Retry failed deferred requests
  maxDeferredSharing: 5, // Max 5 requests can share same promise
  fallbackStrategy: "execute", // Execute individually if deduplication fails

  onCacheEvent: (event) => {
    if (event.type === 'deferred_error') {
      console.error(`Deferred request failed: ${event.key}`, event.metadata?.error);
    }
  }
});
```

## Testing Requirements

### Unit Tests
- [ ] **TTL Cache Tests**
  - Test cache expiration and cleanup
  - Test LRU eviction when cache is full
  - Test metrics collection accuracy
  - Test concurrent access scenarios

- [ ] **Smart Key Generation Tests**
  - Test volatile header exclusion
  - Test body hashing for different content types
  - Test query parameter normalization
  - Test key consistency across identical requests

- [ ] **Strategy Implementation Tests**
  - Test throttle strategy with various configurations
  - Test debounce strategy timing and cancellation
  - Test queue strategy ordering and limits
  - Test priority-based cancellation

- [ ] **Integration Tests**
  - Test with real HTTP requests
  - Test cross-client deduplication (global scope)
  - Test memory usage under load
  - Test performance with large caches

### Performance Tests
- [ ] Benchmark key generation performance (target: <1ms average)
- [ ] Benchmark cache lookup performance (target: <0.1ms)
- [ ] Memory usage profiling with large datasets
- [ ] Concurrent request handling (1000+ simultaneous requests)
- [ ] Cache cleanup performance impact

## Documentation Updates

- [ ] Update `DedupeOptions` JSDoc with comprehensive examples
- [ ] Add performance considerations guide
- [ ] Create troubleshooting section for common issues
- [ ] Add migration guide for breaking changes
- [ ] Document best practices for each strategy
- [ ] Add monitoring and debugging guide

## Success Metrics

- **Performance**: 50%+ reduction in duplicate requests
- **Memory**: Stable memory usage with automatic cleanup
- **Developer Experience**: Clear metrics and debugging tools
- **Flexibility**: Support for 5+ different use case patterns
- **Reliability**: 99.9%+ uptime with robust error handling
- **Test Coverage**: >95% code coverage
- **Documentation**: Complete examples for all features

---

**Note**: This comprehensive improvement plan prioritizes high-impact features first while building a solid foundation for advanced capabilities. Each phase can be implemented incrementally without breaking existing functionality.