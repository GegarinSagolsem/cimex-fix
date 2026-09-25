import { Inbox } from "lucide-react";
import { dataSource } from "@/lib/data";
import { CaseCard } from "@/components/cases/CaseCard";

export default async function CasesPage() {
  const cases = await dataSource.listCases();

  return (
    <div className="p-6">
      <h1 className="mb-6 text-lg font-semibold">Cases</h1>
      {cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--border)] py-24 text-center">
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
