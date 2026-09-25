"use client";

import * as React from "react";
import type { Case, Evidence, Event } from "@bugproof/shared";
import type { CaseDetail } from "@/lib/data";
import { CaseHeader } from "@/components/case-detail/CaseHeader";
import { AgentSwimlanes } from "@/components/case-detail/AgentSwimlanes";
import { EvidenceTabs } from "@/components/case-detail/EvidenceTabs";
import { ReplayPlayer } from "@/components/case-detail/ReplayPlayer";
import { ActivityFeed } from "@/components/case-detail/ActivityFeed";

const POLL_MS = 1000;
const TERMINAL_STATUSES: Case["status"][] = ["proven", "unproven"];

function mergeEvents(existing: Event[], incoming: Event[]): Event[] {
  if (incoming.length === 0) return existing;
  const seen = new Map<string, Event>();
  for (const e of [...existing, ...incoming]) {
    seen.set(`${e.ts}|${e.agent}|${e.kind}|${e.title}`, e);
  }
  return Array.from(seen.values()).sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
}

function mergeEvidence(existing: Evidence[], incoming: Evidence[]): Evidence[] {
  if (incoming.length === 0) return existing;
  const seen = new Map<string, Evidence>();
  for (const e of [...existing, ...incoming]) {
    seen.set(`${e.kind}|${JSON.stringify(e.data)}`, e);
  }
  return Array.from(seen.values());
}

/**
 * Live/replay case view (Plan.md §4.2). While the case is not yet
 * proven/unproven, polls GET /api/cases/[id]?after=<lastTs> every second
 * and merges in new events/evidence/case updates. Stops polling once the
 * case reaches a terminal status.
 */
export function LiveCase({ id, initial }: { id: string; initial: CaseDetail }) {
  const [detail, setDetail] = React.useState<CaseDetail>(initial);
  const detailRef = React.useRef(detail);

  React.useEffect(() => {
    detailRef.current = detail;
  }, [detail]);

  React.useEffect(() => {
    if (TERMINAL_STATUSES.includes(detail.case.status)) return;

    let cancelled = false;
    const timer = setInterval(async () => {
      const current = detailRef.current;
      const lastTs = current.events.at(-1)?.ts;
      const url = `/api/cases/${id}${lastTs ? `?after=${encodeURIComponent(lastTs)}` : ""}`;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { case: Case; events: Event[]; evidence: Evidence[] };
        setDetail((prev) => ({
          case: data.case ?? prev.case,
          events: mergeEvents(prev.events, data.events ?? []),
          evidence: mergeEvidence(prev.evidence, data.evidence ?? []),
        }));
      } catch {
        // Transient network error — try again on the next tick.
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // Re-arm the effect once the case reaches a terminal status to stop polling.
  }, [id, detail.case.status]);

  const { case: c, events, evidence } = detail;

  return (
    <div className="flex min-h-full">
      <div className="min-w-0 flex-1">
        <CaseHeader case={c} />

        <div className="flex flex-col gap-8 p-6">
          {events.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No activity recorded for this case yet.</p>
          ) : (
            <>
              <section aria-labelledby="swimlanes-heading" className="flex flex-col gap-3">
                <h2 id="swimlanes-heading" className="text-sm font-semibold">
                  Agent trace
                </h2>
                <AgentSwimlanes events={events} startedAt={c.startedAt} endedAt={c.provenAt} />
              </section>

              <section aria-labelledby="replay-heading" className="flex flex-col gap-3">
                <h2 id="replay-heading" className="text-sm font-semibold">
                  Replay
                </h2>
                <ReplayPlayer events={events} startedAt={c.startedAt} endedAt={c.provenAt} />
              </section>
            </>
          )}

          <section aria-labelledby="evidence-heading" className="flex flex-col gap-3">
            <h2 id="evidence-heading" className="text-sm font-semibold">
              Evidence
            </h2>
            <EvidenceTabs evidence={evidence} />
          </section>
        </div>
      </div>

      <ActivityFeed events={events} startedAt={c.startedAt} />
    </div>
  );
}
