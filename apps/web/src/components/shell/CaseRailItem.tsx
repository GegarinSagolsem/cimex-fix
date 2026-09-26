import Link from "next/link";
import type { Case } from "@bugproof/shared";
import { StatusChip } from "@/components/cases/StatusChip";
import { SourceIcon } from "@/components/cases/SourceIcon";
import { cn } from "@/lib/utils";

export function CaseRailItem({ case: c, active }: { case: Case; active?: boolean }) {
  return (
    <Link
      href={`/cases/${c.id}`}
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border px-3 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
        active
          ? "border-[var(--accent)] bg-[var(--surface)] shadow-sm"
          : "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-[var(--muted)]">{c.issue}</span>
        <SourceIcon source={c.source} showLabel />
      </div>
      <span className="line-clamp-2 text-sm font-medium text-[var(--text)]">{c.title}</span>
      <span className="self-start">
        <StatusChip status={c.status} />
      </span>
    </Link>
  );
}
