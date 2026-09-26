import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Case } from "@bugproof/shared";
import { StatusChip } from "@/components/cases/StatusChip";
import { SourceIcon } from "@/components/cases/SourceIcon";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function secondsToProof(c: Case): number | undefined {
  if (c.metrics?.timeToProofSec !== undefined) return c.metrics.timeToProofSec;
  if (!c.provenAt) return undefined;
  const sec = Math.round((Date.parse(c.provenAt) - Date.parse(c.startedAt)) / 1000);
  return Number.isFinite(sec) && sec >= 0 ? sec : undefined;
}

export function CaseCard({ case: c }: { case: Case }) {
  const proofSec = secondsToProof(c);
  return (
    <Link
      href={`/cases/${c.id}`}
      className="group flex h-full flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgb(17_17_17/0.04),0_4px_16px_rgb(17_17_17/0.04)] transition-[translate,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgb(10_60_150/0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-[var(--highlight)] text-[var(--highlight-fg)]">
          <SourceIcon source={c.source} className="text-[var(--highlight-fg)] [&_svg]:size-4" />
        </span>
        <StatusChip status={c.status} />
      </div>
      <div className="min-w-0">
        <p className="truncate font-mono text-xs text-[var(--muted)]">
          {c.issue} · {c.repo}
        </p>
        <h2 className="mt-1 line-clamp-2 text-lg font-semibold leading-snug">{c.title}</h2>
      </div>
      <div className="mt-auto flex items-end justify-between gap-3 border-t border-[var(--border)] pt-4">
        <div>
          <p className="text-xs text-[var(--muted)]">{proofSec !== undefined ? "Time to proof" : "Status"}</p>
          <p className="text-2xl font-semibold tracking-tight">
            {proofSec !== undefined ? formatDuration(proofSec) : "In progress"}
          </p>
        </div>
        <span
          className="flex size-9 items-center justify-center rounded-full bg-[var(--text)] text-[var(--bg)] transition-colors group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-fg)]"
          aria-hidden="true"
        >
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}
