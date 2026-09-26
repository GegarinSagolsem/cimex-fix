import Link from "next/link";
import type { Case } from "@bugproof/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/cases/StatusChip";
import { SourceIcon } from "@/components/cases/SourceIcon";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
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
      className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      <Card className="h-full transition-colors hover:border-[var(--accent)]/60">
        <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs text-[var(--muted)]">
              {c.issue} · {c.repo}
            </span>
            <CardTitle className="line-clamp-2 text-base">{c.title}</CardTitle>
          </div>
          <SourceIcon source={c.source} />
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2">
          <StatusChip status={c.status} />
          <span className="font-mono text-xs text-[var(--muted)]">
            {proofSec !== undefined ? `proof in ${formatDuration(proofSec)}` : "no proof yet"}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
