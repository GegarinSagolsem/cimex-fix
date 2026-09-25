import "server-only";

/**
 * Naive in-memory rate limiter (Plan.md §4.4: 10/min per IP on /api/triage).
 * Not distributed — fine for a hackathon single-instance deploy. Cached on
 * globalThis so hot-reload / repeated module evaluation in dev doesn't
 * reset the window.
 */
declare global {
  var __bugproofRateLimits: Map<string, Map<string, number[]>> | undefined;
}

const buckets: Map<string, Map<string, number[]>> =
  globalThis.__bugproofRateLimits ?? (globalThis.__bugproofRateLimits = new Map());

/** Returns true if `key` is still within `limit` requests per `windowMs`. */
export function checkRateLimit(bucket: string, key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucketMap = buckets.get(bucket) ?? new Map<string, number[]>();
  buckets.set(bucket, bucketMap);

  const timestamps = (bucketMap.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    bucketMap.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  bucketMap.set(key, timestamps);
  return true;
}

/** Best-effort client IP from standard proxy headers. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
