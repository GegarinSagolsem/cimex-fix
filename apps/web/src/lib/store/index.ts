import { Redis } from "@upstash/redis";
import { createMemoryStore } from "./memoryStore";
import { createRedisStore } from "./redisStore";
import type { CaseStore } from "./types";

export type { CaseStore } from "./types";

/**
 * Picks Upstash Redis when credentials are present (either the native
 * UPSTASH_REDIS_REST_* vars, or KV_REST_API_* which the Vercel Upstash
 * marketplace integration sets), otherwise falls back to an in-memory
 * store so local dev / previews without the integration still work.
 *
 * Cached on globalThis so hot-reload / repeated module evaluation in dev
 * doesn't spin up a new in-memory store (and lose data) on every request.
 */
declare global {
  var __bugproofStore: CaseStore | undefined;
}

function buildStore(): CaseStore {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (url && token) {
    return createRedisStore(new Redis({ url, token }));
  }

  return createMemoryStore();
}

export const store: CaseStore = globalThis.__bugproofStore ?? (globalThis.__bugproofStore = buildStore());
