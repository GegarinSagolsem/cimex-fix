import { Camera, CircleDot, FileText, ScrollText, type LucideIcon } from "lucide-react";
import type { CaseSource } from "@bugproof/shared";
import { cn } from "@/lib/utils";

const SOURCE_CONFIG: Record<CaseSource, { label: string; icon: LucideIcon }> = {
  screenshot: { label: "Screenshot", icon: Camera },
  issue: { label: "Issue", icon: CircleDot },
  pdf: { label: "PDF", icon: FileText },
  log: { label: "Log", icon: ScrollText },
};

export function SourceIcon({ source, className }: { source: CaseSource; className?: string }) {
  const { label, icon: Icon } = SOURCE_CONFIG[source];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-[var(--muted)]", className)}
      title={label}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
