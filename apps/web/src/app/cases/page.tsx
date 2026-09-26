import { Inbox } from "lucide-react";
import { dataSource } from "@/lib/data";
import { CaseCard } from "@/components/cases/CaseCard";
import { HeroStat, PageHero } from "@/components/shell/PageHero";
import { mmss } from "@/components/impact/format";

export default async function CasesPage() {
  const cases = await dataSource.listCases();
  const proven = cases.filter((c) => c.status === "proven");
  // Unrounded minutes, so the median matches docs/benchmark.md to the second.
  const proofMinutes = proven
    .map((c) => (c.provenAt ? (Date.parse(c.provenAt) - Date.parse(c.startedAt)) / 60000 : NaN))
    .filter((m) => Number.isFinite(m) && m >= 0)
    .sort((a, b) => a - b);
  const mid = Math.floor(proofMinutes.length / 2);
  const median = proofMinutes.length
    ? proofMinutes.length % 2
      ? proofMinutes[mid]
      : (proofMinutes[mid - 1] + proofMinutes[mid]) / 2
    : undefined;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHero
        label="Mission Control"
        title="Cases"
        description="Every bug IBM Bob has worked, live. Open a case to watch the agents, or go straight to its Proof of Fix."
      >
        <HeroStat value={String(cases.length)} label="cases" />
        <HeroStat highlight value={`${proven.length}/${cases.length}`} label="proven" />
        {median !== undefined && <HeroStat value={mmss(median)} label="median time to proof" />}
        {proofMinutes.length > 0 && <HeroStat value={mmss(proofMinutes[0])} label="fastest proof" />}
      </PageHero>

      {cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[var(--border)] py-24 text-center">
          <Inbox className="size-8 text-[var(--muted)]" aria-hidden="true" />
          <p className="text-sm font-medium">No cases yet</p>
          <p className="max-w-sm text-sm text-[var(--muted)]">
            Cases opened from a screenshot, issue, PDF or log will show up here once Bob starts
            working them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cases.map((c) => (
            <CaseCard key={c.id} case={c} />
          ))}
        </div>
      )}
    </div>
  );
}
