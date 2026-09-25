import type { Redis } from "@upstash/redis";
import { Case, Evidence, Event } from "@bugproof/shared";
import type { CaseStore } from "./types";

/**
 * Upstash Redis-backed store. Keys are namespaced "bp:" so this can share
 * a Redis instance with other apps. The @upstash/redis client
 * auto-(de)serializes JSON values, so we pass/receive plain objects.
 */
const PREFIX = "bp:";
const caseKey = (id: string) => `${PREFIX}case:${id}`;
const casesIndexKey = `${PREFIX}cases:index`;
const eventsKey = (id: string) => `${PREFIX}events:${id}`;
const evidenceKey = (id: string) => `${PREFIX}evidence:${id}`;

export function createRedisStore(redis: Redis): CaseStore {
  return {
    async listCases() {
      const ids = await redis.zrange<string[]>(casesIndexKey, 0, -1, { rev: true });
      if (!ids || ids.length === 0) return [];
      const raw = await Promise.all(ids.map((id) => redis.get<unknown>(caseKey(id))));
      return raw
        .map((c) => Case.safeParse(c))
        .filter((r): r is { success: true; data: Case } => r.success)
        .map((r) => r.data);
    },

    async getCase(id) {
      const raw = await redis.get<unknown>(caseKey(id));
      if (raw == null) return null;
      const parsed = Case.safeParse(raw);
      return parsed.success ? parsed.data : null;
    },

    async upsertCase(c) {
      const parsed = Case.parse(c);
      const score = Date.parse(parsed.startedAt) || Date.now();
      await redis.set(caseKey(parsed.id), parsed);
      await redis.zadd(casesIndexKey, { score, member: parsed.id });
    },

    async appendEvents(caseId, newEvents) {
      const parsed = newEvents.map((e) => Event.parse(e));
      if (parsed.length === 0) return;
      await redis.rpush(eventsKey(caseId), ...parsed);
    },

    async getEvents(caseId, afterTs) {
      const raw = await redis.lrange<unknown>(eventsKey(caseId), 0, -1);
      const parsed = raw
        .map((e) => Event.safeParse(e))
        .filter((r): r is { success: true; data: Event } => r.success)
        .map((r) => r.data);
      const filtered = afterTs ? parsed.filter((e) => e.ts > afterTs) : parsed;
      return filtered.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
    },

    async putEvidence(caseId, item) {
      const parsed = Evidence.parse(item);
      await redis.rpush(evidenceKey(caseId), parsed);
    },

    async getEvidence(caseId) {
      const raw = await redis.lrange<unknown>(evidenceKey(caseId), 0, -1);
      return raw
        .map((e) => Evidence.safeParse(e))
        .filter((r): r is { success: true; data: Evidence } => r.success)
        .map((r) => r.data);
    },
  };
}
