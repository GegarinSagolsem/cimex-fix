"use client";

import * as React from "react";
import type { Event } from "@bugproof/shared";
import { toOffsetSec } from "@/lib/timeline";
import { cn } from "@/lib/utils";

/**
 * Chronological order (oldest first) so the feed reads like a log scrolling
 * upward as new events arrive, auto-scrolled to the newest entry at the bottom.
 */
export function ActivityFeed({ events, startedAt }: { events: Event[]; startedAt: string }) {
  const sorted = React.useMemo(
    () => [...events].sort((a, b) => toOffsetSec(a.ts, startedAt) - toOffsetSec(b.ts, startedAt)),
    [events, startedAt],
  );
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "end",
    });
  }, [sorted.length]);

  return (
    <aside
      aria-label="Live activity feed"
      className="hidden w-80 shrink-0 flex-col overflow-y-auto border-l border-[var(--border)] xl:flex"
    >
      <h2 className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
        Activity
      </h2>
      <ol className="flex flex-1 flex-col gap-3 p-4">
        {sorted.map((e, i) => (
          <li key={`${e.ts}-${i}`} className="flex gap-2 text-xs">
            <span className="shrink-0 font-mono text-[var(--muted)]">
              +{Math.round(toOffsetSec(e.ts, startedAt))}s
            </span>
            <span
              className={cn(
                "shrink-0 font-mono capitalize",
                e.kind === "evidence" && "text-[var(--success)]",
                e.kind === "status" && "text-[var(--accent)]",
              )}
            >
              {e.agent}
            </span>
            <span className="min-w-0 flex-1 text-[var(--text)]">{e.title}</span>
          </li>
        ))}
        <div ref={bottomRef} />
      </ol>
    </aside>
  );
}
