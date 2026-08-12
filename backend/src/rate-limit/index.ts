import type { Context, Next } from "hono";
import { config } from "../config.js";

// In-memory sliding-window limiter, keyed by arbitrary strings.
// For multi-instance production, set UPSTASH_REDIS_REST_URL/TOKEN and this
// module will switch to a distributed counter via Upstash REST.

interface Bucket {
  windowStart: number;
  count: number;
}

const buckets = new Map<string, Bucket>();

function peekWindow(key: string, windowMs: number): Bucket {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now - existing.windowStart >= windowMs) {
    return { windowStart: now, count: 0 };
  }
  return existing;
}

const UPSTASH_ENDPOINT = config.upstashRedisRestUrl;
const UPSTASH_TOKEN = config.upstashRedisRestToken;

async function upstashCount(key: string, limit: number, windowMs: number): Promise<boolean> {
  const res = await fetch(`${UPSTASH_ENDPOINT}/incr`, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(key),
  });
  if (!res.ok) return true; // fail open
  const data = (await res.json()) as { result?: number | string };
  const count = Number(data.result ?? 0);
  if (count === 1) {
    await fetch(`${UPSTASH_ENDPOINT}/expire/${key}/${windowMs / 1000}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
  }
  return count <= limit;
}

/** Family of limiters used by API routes. */
export const limiter = {
  /** 30 requests / minute — general API abuse guard. */
  api: (key: string, limit = 30, windowMs = 60_000) => check(key, limit, windowMs),
  /** 5 requests / minute — sensitive writes (order creation). */
  write: (key: string, limit = 5, windowMs = 60_000) => check(key, limit, windowMs),
  /** 3 uploads / 10 minutes — screenshot uploads. */
  upload: (key: string, limit = 3, windowMs = 600_000) => check(key, limit, windowMs),
};

async function check(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (UPSTASH_ENDPOINT && UPSTASH_TOKEN) {
    return upstashCount(key, limit, windowMs);
  }
  const bucket = peekWindow(key, windowMs);
  if (bucket.count === 0) {
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) return false;
  if (buckets.size > 10_000) {
    const now = Date.now();
    for (const [k, b] of buckets) {
      if (now - b.windowStart >= windowMs) buckets.delete(k);
    }
  }
  return true;
}

/** Hono middleware applying a per-IP + label limiter. */
export function rateLimit(label: string, limit: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "unknown";
    const key = `${label}:${ip}`;
    const allowed = await check(key, limit, windowMs);
    if (!allowed) {
      return c.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests. Please slow down and try again." } },
        429,
      );
    }
    await next();
  };
}

export { check as checkRateLimit };