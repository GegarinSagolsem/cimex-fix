import { notFound } from "next/navigation";
import { dataSource } from "@/lib/data";
import { CaseHeader } from "@/components/case-detail/CaseHeader";
import { AgentSwimlanes } from "@/components/case-detail/AgentSwimlanes";
import { EvidenceTabs } from "@/components/case-detail/EvidenceTabs";
import { ReplayPlayer } from "@/components/case-detail/ReplayPlayer";
import { ActivityFeed } from "@/components/case-detail/ActivityFeed";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await dataSource.getCase(id);

  if (!detail) notFound();

  const { case: c, events, evidence } = detail;

  return (
    <div className="flex min-h-full">
      <div className="min-w-0 flex-1">
        <CaseHeader case={c} />

        <div className="flex flex-col gap-8 p-6">
          {events.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No activity recorded for this case yet.
            </p>
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
