"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { AgentName, type Event } from "@bugproof/shared";
import { toOffsetSec, timelineDurationSec, formatDuration } from "@/lib/timeline";
import { cn } from "@/lib/utils";

const AGENT_ORDER = AgentName.options;

const AGENT_LABEL: Record<string, string> = {
  lead: "Lead",
  triage: "Triage",
  locator: "Locator",
  historian: "Historian",
  reproducer: "Reproducer",
  fixer: "Fixer",
  critic: "Critic",
};

export function AgentSwimlanes({
  events,
  startedAt,
  endedAt,
}: {
  events: Event[];
  startedAt: string;
  endedAt?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const totalDuration = timelineDurationSec(events, startedAt, endedAt);
  // Follow-up events after the proof (e.g. a later re-bisect) stay in the activity feed, not in the run's lanes.
  const runEvents = events.filter((e) => toOffsetSec(e.ts, startedAt) <= totalDuration);

  const mostRecentAgent = runEvents.length
    ? runEvents.reduce((latest, e) => (toOffsetSec(e.ts, startedAt) > toOffsetSec(latest.ts, startedAt) ? e : latest)).agent
    : undefined;

  const lanes = AGENT_ORDER.map((agent) => {
    const agentEvents = runEvents.filter((e) => e.agent === agent);
    if (agentEvents.length === 0) return null;

    const offsets = agentEvents.map((e) => toOffsetSec(e.ts, startedAt));
    const start = Math.min(...offsets);
    const end = Math.max(...offsets);
    const leftPct = (start / totalDuration) * 100;
    const widthPct = Math.max(((end - start) / totalDuration) * 100, 1.5);

    // A single event has no duration; the bar keeps a minimum width only so it stays visible.
    const duration = agentEvents.length > 1 ? formatDuration(end - start) : "—";

    return { agent, agentEvents, leftPct, widthPct, duration };
  }).filter((lane): lane is NonNullable<typeof lane> => lane !== null);

  return (
    <div className="flex flex-col gap-2" role="list" aria-label="Agent swimlanes">
      {lanes.map(({ agent, agentEvents, leftPct, widthPct, duration }) => {
        const isActive = !endedAt && agent === mostRecentAgent;
        return (
          <div key={agent} role="listitem" className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate font-mono text-xs text-[var(--muted)]">
              {AGENT_LABEL[agent] ?? agent}
            </span>
            <div className="relative h-6 flex-1 rounded bg-[var(--surface)]">
              <motion.div
                initial={prefersReducedMotion ? false : { width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{ left: `${leftPct}%` }}
                className={cn(
                  "absolute top-0 h-full rounded bg-[var(--agent)]/70",
                  isActive && "shadow-[0_0_12px_2px_var(--agent)]",
                )}
                title={`${agentEvents.length} event${agentEvents.length === 1 ? "" : "s"}`}
              />
            </div>
            <span className="w-24 shrink-0 text-right font-mono text-xs text-[var(--muted)]">
              {duration}
            </span>
          </div>
        );
      })}
    </div>
  );
}
