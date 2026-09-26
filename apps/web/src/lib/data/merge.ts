import type { Case, Evidence, Event } from "@bugproof/shared";
import { store } from "@/lib/store";
import { getStaticCase, listStaticCases } from "@/lib/replay";
import type { CaseDetail } from "./types";

/**
 * Merges the live store with the static replay files:
 * reads check the store first, then fill in from static files. Static
 * files are read-only here — nothing in this module ever writes to disk.
 */

function eventKey(e: Event): string {
  return `${e.ts}|${e.agent}|${e.kind}|${e.title}`;
}

function dedupeEvents(events: Event[]): Event[] {
  const seen = new Map<string, Event>();
  for (const e of events) seen.set(eventKey(e), e);
  return Array.from(seen.values()).sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
}

function evidenceKey(e: Evidence): string {
  return `${e.kind}|${JSON.stringify(e.data)}`;
}

function dedupeEvidence(evidence: Evidence[]): Evidence[] {
  const seen = new Map<string, Evidence>();
  for (const e of evidence) seen.set(evidenceKey(e), e);
  return Array.from(seen.values());
}

export async function listMergedCases(): Promise<Case[]> {
  const [storeCases, staticDetails] = await Promise.all([
    store.listCases(),
    Promise.resolve(listStaticCases()),
  ]);

  const byId = new Map<string, Case>();
  // Static first, store overlays/overwrites (store is the live/authoritative copy).
  for (const d of staticDetails) byId.set(d.case.id, d.case);
  for (const c of storeCases) byId.set(c.id, c);

  return Array.from(byId.values()).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

export async function getMergedCaseDetail(id: string): Promise<CaseDetail | null> {
  const staticDetail = getStaticCase(id);
  const [storeCase, storeEvents, storeEvidence] = await Promise.all([
    store.getCase(id),
    store.getEvents(id),
    store.getEvidence(id),
  ]);

  if (!staticDetail && !storeCase) return null;

  const finalCase = storeCase ?? staticDetail!.case;
  const events = dedupeEvents([...(staticDetail?.events ?? []), ...storeEvents]);
  const evidence = dedupeEvidence([...(staticDetail?.evidence ?? []), ...storeEvidence]);

  return { case: finalCase, events, evidence };
}

export async function getMergedEventsSince(id: string, afterTs?: string): Promise<Event[]> {
  const detail = await getMergedCaseDetail(id);
  if (!detail) return [];
  return afterTs ? detail.events.filter((e) => e.ts > afterTs) : detail.events;
}
