import { Case, Evidence, Event } from "@bugproof/shared";
import type { CaseStore } from "./types";

/**
 * In-memory fallback store. Used when no Redis env vars are configured
 * (local dev, or a preview deploy without the Upstash integration).
 * State does not survive a cold start / restart — that is fine because
 * every finished case also has a static replay file in apps/web/data/cases/.
 */
export function createMemoryStore(): CaseStore {
  const cases = new Map<string, Case>();
  const events = new Map<string, Event[]>();
  const evidence = new Map<string, Evidence[]>();

  return {
    async listCases() {
      return Array.from(cases.values());
    },

    async getCase(id) {
      return cases.get(id) ?? null;
    },

    async upsertCase(c) {
      const parsed = Case.parse(c);
      cases.set(parsed.id, parsed);
    },

    async appendEvents(caseId, newEvents) {
      const parsed = newEvents.map((e) => Event.parse(e));
      const existing = events.get(caseId) ?? [];
      events.set(caseId, [...existing, ...parsed]);
    },

    async getEvents(caseId, afterTs) {
      const list = events.get(caseId) ?? [];
      const filtered = afterTs ? list.filter((e) => e.ts > afterTs) : list;
      return [...filtered].sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
    },

    async putEvidence(caseId, item) {
      const parsed = Evidence.parse(item);
      const existing = evidence.get(caseId) ?? [];
      evidence.set(caseId, [...existing, parsed]);
    },

    async getEvidence(caseId) {
      return evidence.get(caseId) ?? [];
    },
  };
}
