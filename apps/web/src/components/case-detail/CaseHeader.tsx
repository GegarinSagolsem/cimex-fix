import type { Case } from "@bugproof/shared";
import { StatusChip } from "@/components/cases/StatusChip";
import { SourceIcon } from "@/components/cases/SourceIcon";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/timeline";

export function CaseHeader({ case: c }: { case: Case }) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border)] p-6">
      <div className="flex items-center gap-2 font-mono text-xs text-[var(--muted)]">
        <span>{c.repo}</span>
        <span aria-hidden="true">·</span>
        <span>{c.issue}</span>
        <SourceIcon source={c.source} />
      </div>
      <h1 className="text-xl font-semibold">{c.title}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={c.status} />
        <Badge>{c.severity} severity</Badge>
        {c.metrics?.timeToProofSec !== undefined && (
          <Badge variant="success">proof in {formatDuration(c.metrics.timeToProofSec)}</Badge>
        )}
        {c.metrics?.testsPassed !== undefined && c.metrics.testsRun !== undefined && (
          <Badge variant={c.metrics.testsPassed === c.metrics.testsRun ? "success" : "warning"}>
            {c.metrics.testsPassed}/{c.metrics.testsRun} tests passing
          </Badge>
        )}
        {c.culprit && (
          <Badge variant="accent" title={c.culprit.message}>
            culprit {c.culprit.shortSha}
          </Badge>
        )}
      </div>
    </div>
  );
}
