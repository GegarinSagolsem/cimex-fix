import type { Case, Evidence, Event } from "@bugproof/shared";

/**
 * Storage adapter for live case data (Plan.md §4.2).
 * Two implementations: Upstash Redis (production) and an in-memory
 * fallback (local dev / no env vars set). Static replay files in
 * apps/web/data/cases/*.json are layered on top by the data source,
 * never written to by this interface.
 */
export interface CaseStore {
  listCases(): Promise<Case[]>;
  getCase(id: string): Promise<Case | null>;
  upsertCase(c: Case): Promise<void>;
  appendEvents(caseId: string, events: Event[]): Promise<void>;
  getEvents(caseId: string, afterTs?: string): Promise<Event[]>;
  putEvidence(caseId: string, evidence: Evidence): Promise<void>;
  getEvidence(caseId: string): Promise<Evidence[]>;
}
