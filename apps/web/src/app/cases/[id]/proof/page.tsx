import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, CircleDashed, ShieldCheck, XCircle } from "lucide-react";
import { dataSource } from "@/lib/data";
import { buildProof, verifyCommands, type CheckState } from "@/lib/proof";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/cases/StatusChip";
import { DiffViewer } from "@/components/case-detail/DiffViewer";
import { CopyButton } from "@/components/proof/CopyButton";
import { mmss } from "@/components/impact/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const detail = await dataSource.getCase(id);
  if (!detail) return { title: "Proof of Fix · BugProof" };
  return {
    title: `Proof of Fix · ${detail.case.title}`,
    description: detail.case.plainSummary?.text ?? detail.case.summary,
  };
}

const CHECK_ICON: Record<CheckState, { Icon: typeof CheckCircle2; className: string; label: string }> = {
  pass: { Icon: CheckCircle2, className: "text-[var(--success)]", label: "Passed" },
  fail: { Icon: XCircle, className: "text-[var(--danger)]", label: "Failed" },
  missing: { Icon: CircleDashed, className: "text-[var(--muted)]", label: "Not recorded" },
};

export default async function ProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await dataSource.getCase(id);
  if (!detail) notFound();

  const c = detail.case;
  const { checks, fixDiff, culpritDiff, verify, bench } = buildProof(detail);
  const proven = c.status === "proven";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-[var(--muted)]">
            {c.repo} · {c.id}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Proof of Fix</h1>
          <p className="mt-1 text-[var(--text)]">{c.title}</p>
        </div>
        {proven ? (
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <span className="proven-stamp inline-flex items-center gap-2 rounded-md border-2 border-[var(--success)] px-4 py-2 font-mono text-lg font-semibold uppercase tracking-[0.2em] text-[var(--success)]">
              <ShieldCheck className="size-5" aria-hidden="true" />
              Proven
            </span>
            {c.provenAt && (
              <span className="font-mono text-xs text-[var(--muted)]">
                {c.provenAt.slice(0, 16).replace("T", " ")} UTC
              </span>
            )}
          </div>
        ) : (
          <StatusChip status={c.status} />
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <CopyButton label="Copy link" />
        <Link
          href={`/cases/${c.id}`}
          className="rounded-md px-2.5 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
        >
          Watch the full case timeline →
        </Link>
      </div>

      {c.plainSummary && (
        <Card>
          <CardHeader>
            <CardTitle>In plain English</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm leading-relaxed">{c.plainSummary.text}</p>
            <p className="text-xs text-[var(--muted)]">
              Written by IBM watsonx.ai <span className="font-mono">{c.plainSummary.model}</span> from the case evidence.
            </p>
          </CardContent>
        </Card>
      )}

      <section aria-label="The four checks" className="grid gap-4 sm:grid-cols-2">
        {checks.map((check) => {
          const { Icon, className, label } = CHECK_ICON[check.state];
          return (
            <Card key={check.id}>
              <CardContent className="flex gap-3 p-4">
                <Icon className={`mt-0.5 size-5 shrink-0 ${className}`} aria-label={label} />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className="text-xs text-[var(--muted)]">{check.detail}</p>
                  {check.code && (
                    <p className="break-words font-mono text-xs text-[var(--text)]">{check.code}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {bench && (
        <dl className="grid grid-cols-2 gap-4 rounded-lg border border-[var(--border)] p-4 sm:grid-cols-4">
          {[
            ["Failing test after", mmss(bench.minutesToRed)],
            ["Proven after", mmss(bench.minutesToProof)],
            ["Human prompts", String(bench.humanInterventions)],
            ["Bobcoins", bench.coins.toFixed(2)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-[var(--muted)]">{label}</dt>
              <dd className="mt-1 font-mono text-lg tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {fixDiff && (
        <Card>
          <CardHeader>
            <CardTitle>The fix</CardTitle>
            <p className="text-xs text-[var(--muted)]">
              Written by the Fixer, which may edit <span className="font-mono">src/</span> only — tests are read-only for it.
            </p>
          </CardHeader>
          <CardContent>
            <DiffViewer patch={fixDiff} />
          </CardContent>
        </Card>
      )}

      {verify && (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Verify it yourself</CardTitle>
              <p className="text-xs text-[var(--muted)]">
                The repro test fails on the code before the fix and passes on the fix.
              </p>
            </div>
            <CopyButton text={verifyCommands(verify)} label="Copy" />
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-xs leading-relaxed">
              {verifyCommands(verify)}
            </pre>
          </CardContent>
        </Card>
      )}

      {culpritDiff && (
        <details className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <summary className="cursor-pointer text-sm font-medium">The culprit commit (git show)</summary>
          <div className="mt-3">
            <DiffViewer patch={culpritDiff} />
          </div>
        </details>
      )}

      {c.summary && (
        <details className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <summary className="cursor-pointer text-sm font-medium">Technical summary from the Lead</summary>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{c.summary}</p>
        </details>
      )}
    </div>
  );
}
