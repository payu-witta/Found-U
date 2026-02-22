import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Redis } from 'ioredis';
import { getRedis } from '../lib/redis.js';
import { env } from '../config/env.js';

// ── Store interface ───────────────────────────────────────────────────────────

interface RateLimitResult {
  count: number;
  resetAt: number; // Unix ms
}

interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitResult>;
}

// ── Redis store (distributed, safe for multi-replica deployments) ─────────────

class RedisStore implements RateLimitStore {
  constructor(private readonly client: Redis) {}

  async increment(key: string, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetAt = windowStart + windowMs;
    const redisKey = `rl:${key}:${windowStart}`;

    const pipeline = this.client.pipeline();
    pipeline.incr(redisKey);
    pipeline.pexpireat(redisKey, resetAt);
    const results = await pipeline.exec();

    const count = (results?.[0]?.[1] as number | null) ?? 1;
    return { count, resetAt };
  }
}

// ── In-memory store (single instance; default fallback) ──────────────────────

class MemoryStore implements RateLimitStore {
  private readonly entries = new Map<string, RateLimitResult>();

  constructor() {
    // Evict expired entries every 5 minutes to prevent unbounded memory growth
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.entries.entries()) {
        if (entry.resetAt <= now) this.entries.delete(key);
      }
    }, 5 * 60 * 1000).unref();
  }

  async increment(key: string, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const existing = this.entries.get(key);

    if (!existing || existing.resetAt <= now) {
      const entry: RateLimitResult = { count: 1, resetAt: now + windowMs };
      this.entries.set(key, entry);
      return entry;
    }

    existing.count++;
    return existing;
  }
}

// ── Store singleton (lazy, auto-selects Redis or Memory) ─────────────────────

let store: RateLimitStore | null = null;

function getStore(): RateLimitStore {
  if (store) return store;
  const redis = getRedis();
  store = redis ? new RedisStore(redis) : new MemoryStore();
  return store;
}

// ── Client key ────────────────────────────────────────────────────────────────

function getClientKey(c: Parameters<MiddlewareHandler>[0]): string {
  const forwarded = c.req.header('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : (c.req.header('x-real-ip') ?? 'unknown');
  const user = c.get('user') as { sub?: string } | undefined;
  return user?.sub ? `${ip}:${user.sub}` : ip;
}

// ── Middleware ────────────────────────────────────────────────────────────────

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
}

export const rateLimit = (options: RateLimitOptions = {}): MiddlewareHandler => {
  const windowMs = options.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
  const max = options.max ?? env.RATE_LIMIT_MAX_REQUESTS;
  const message = options.message ?? 'Too many requests, please try again later.';

  return async (c, next) => {
    if (env.RATE_LIMIT_DISABLED) {
      return next();
    }
    const key = getClientKey(c);
    const { count, resetAt } = await getStore().increment(key, windowMs);

    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(Math.max(0, max - count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

    if (count > max) {
      c.header('Retry-After', String(Math.ceil(windowMs / 1000)));
      throw new HTTPException(429, { message });
    }

    await next();
  };
};
