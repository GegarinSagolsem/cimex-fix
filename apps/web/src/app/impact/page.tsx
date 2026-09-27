import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";
import benchmark from "@/data/benchmark.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeToProofChart } from "@/components/impact/TimeToProofChart";
import { ModelComparison, type Comparison } from "@/components/impact/ModelComparison";
import { mmss } from "@/components/impact/format";
import { PageHero } from "@/components/shell/PageHero";

export const metadata: Metadata = { title: "Impact · Cimex Fix" };

const BENCHMARK_DOC = "https://github.com/GegarinSagolsem/cimex-fix/blob/main/docs/benchmark.md";

function StatTile({ label, value, detail, highlight }: { label: string; value: string; detail: string; highlight?: boolean }) {
  const sub = highlight ? "" : "text-[var(--muted)]";
  return (
    <Card className={highlight ? "border-transparent bg-[var(--highlight)] text-[var(--highlight-fg)]" : undefined}>
      <CardContent className="flex h-full flex-col gap-1 p-5">
        <p className={`text-xs ${sub}`}>{label}</p>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        <p className={`text-xs ${sub}`}>{detail}</p>
      </CardContent>
    </Card>
  );
}

export default function ImpactPage() {
  const { summary: s, cases, generatedAt } = benchmark;
  const live = s.liveBisectRun;
  const comparison = (benchmark as { comparison?: unknown }).comparison as Comparison | null | undefined;
  const cimex = comparison?.contenders.find((c) => c.kind === "pipeline");
  const bestModel = comparison?.contenders
    .filter((c) => c.kind === "one-shot")
    .sort((a, b) => b.fixWithProof - a.fixWithProof || b.fixed - a.fixed)[0];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHero
        label="Impact"
        title="Measured, not claimed"
        description={
          <>
            {s.bugsPlanted} bugs were planted in the ShopLite demo repo; IBM Bob worked {s.bugsAttempted} of them from the
            customer&apos;s report to a failing test, a culprit commit and a verified fix
            {s.bugsNotAttempted.length > 0 && <> (bug {s.bugsNotAttempted.map((n) => `#${n}`).join(", ")} skipped for Bobcoin budget)</>}.
            Every number is computed from the case events and Bob&apos;s task log —{" "}
            <a href={BENCHMARK_DOC} className="underline underline-offset-2 hover:no-underline">
              docs/benchmark.md
            </a>
            .
          </>
        }
      />

      <section aria-label="Headline numbers" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card className="border-transparent bg-[var(--text)] text-[var(--bg)]">
          <CardContent className="flex h-full flex-col justify-center gap-2 p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em]">Culprit commit matches the answer key</p>
            <p className="text-7xl font-semibold tracking-tight">
              {s.culpritCorrect}/{s.bugsAttempted}
            </p>
            <ul className="flex flex-col gap-1 text-sm">
              <li>
                {s.culpritByLiveBisect} found by <span className="font-mono">git bisect</span> live, during the run
              </li>
              <li>
                {s.culpritByFollowUpBisect} found by <span className="font-mono">git bisect</span> in a follow-up Bob task
              </li>
              <li>{s.culpritCorrect - s.culpritCorrectByBisect} named by the Historian from git history</li>
            </ul>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatTile highlight label="Bugs proven" value={`${s.proven}/${s.bugsAttempted}`} detail={`${s.unproven} unproven · RED test → fix → all tests green`} />
          <StatTile label="Median time to a failing test" value={mmss(s.medianMinutesToRed)} detail="from the customer's report to a RED reproduction" />
          {live && (
            <StatTile
              label={`Fully live run (bug #${live.bug}), start to proof`}
              value={mmss(live.minutesToProof)}
              detail={`culprit by bisect at ${mmss(live.minutesToCulprit)} · ${live.humanInterventions} human prompts`}
            />
          )}
          <StatTile
            label="Bobcoins per fix"
            value={s.coinsPerRunMedian.toFixed(2)}
            detail={`median · range ${s.coinsPerRunMin.toFixed(2)}–${s.coinsPerRunMax.toFixed(2)}`}
          />
        </div>
      </section>

      {comparison && cimex && bestModel && (
        <Card>
          <CardHeader>
            <CardTitle>Compared with one-shot models</CardTitle>
            <p className="max-w-3xl text-sm text-[var(--muted)]">
              Bob started from the report alone and produced a proof anyone can re-run.{" "}
              {comparison.contenders.length - 1} models (five on IBM watsonx.ai, plus Gemini 3.1 Pro and Claude Opus 4.6)
              each answered every bug once, with all the source code handed to them. Every answer came with a fix and a
              test, yet {comparison.oneShotTotals.answers - comparison.oneShotTotals.fixed} of{" "}
              {comparison.oneShotTotals.answers} did not fix the bug, and nothing in an answer shows which ones. The best
              model, {bestModel.name}, got {bestModel.fixWithProof}/{comparison.bugs.length} fixes with proof,{" "}
              {bestModel.fixWithProof >= cimex.fixWithProof ? "matching" : "against"} Cimex Fix&apos;s {cimex.fixWithProof}/
              {comparison.bugs.length}. Gemini&apos;s and Opus&apos;s one miss (#1) didn&apos;t restore the old behaviour:
              an empty coupon field now shows an error instead of meaning &ldquo;no coupon&rdquo;. Their own tests passed
              because they asserted their own fix design, which the Reproducer&apos;s symptom-only rule forbids. One script
              scores every answer, Bob&apos;s included, and the answer key&apos;s independent probe decides whether a bug is
              fixed.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ModelComparison data={comparison} />
            <ul className="list-disc space-y-1.5 pl-5 text-xs text-[var(--muted)]">
              <li>
                The models got every file under <span className="font-mono">src/</span> and the git history up front; Bob
                started from the report and found the code itself. Bob read the screenshots as images; the models got their
                visible text.
              </li>
              <li>
                One answer per model, asked on {comparison.askedOn}: a single sample, not an average. watsonx.ai models ran
                at temperature {comparison.temperature} ({comparison.region}); Gemini and Claude Opus ran through
                Google&apos;s Antigravity CLI (headless, one fresh session per bug, default temperature, no commands run). Prompts and raw answers are in
                the repo.
              </li>
              <li>
                Bob&apos;s culprit count is the final result, including follow-up bisects; {cimex.culpritDuringRun}/
                {comparison.bugs.length} were named during the runs.
              </li>
              {comparison.controlsOk && <li>Control: every probe fails on the unfixed code.</li>}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Time to proof, per bug</CardTitle>
          <p className="text-xs text-[var(--muted)]">
            In run order. Runs #3 and #8 include time spent waiting on a human while a pipeline bug was being
            fixed; bug #5 ran after the fixes. Hover or focus a bar for details.
          </p>
        </CardHeader>
        <CardContent>
          <TimeToProofChart
            rows={cases.map((c) => ({
              bug: c.bug,
              title: c.title,
              minutesToRed: c.minutesToRed,
              minutesToProof: c.minutesToProof,
              humanInterventions: c.humanInterventions,
              coins: c.coins,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Every run</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs text-[var(--muted)]">
              <tr className="border-b border-[var(--border)]">
                <th className="py-2 pr-4 font-medium">Bug</th>
                <th className="py-2 pr-4 font-medium">Intake</th>
                <th className="py-2 pr-4 font-medium">RED test</th>
                <th className="py-2 pr-4 font-medium">Proven</th>
                <th className="py-2 pr-4 font-medium">Human prompts</th>
                <th className="py-2 pr-4 font-medium">Bobcoins</th>
                <th className="py-2 pr-4 font-medium">Culprit commit</th>
                <th className="py-2 pr-4 font-medium">Answer key</th>
                <th className="py-2 font-medium">How it was found</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.caseId} className="border-b border-[var(--border)] align-top last:border-0">
                  <td className="py-2.5 pr-4">
                    <Link href={`/cases/${c.caseId}`} className="hover:text-[var(--accent)]">
                      #{c.bug} {c.title}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-[var(--muted)]">{c.intake}</td>
                  <td className="whitespace-nowrap py-2.5 pr-4 font-mono tabular-nums">{mmss(c.minutesToRed)}</td>
                  <td className="whitespace-nowrap py-2.5 pr-4 font-mono tabular-nums">{mmss(c.minutesToProof)}</td>
                  <td className="whitespace-nowrap py-2.5 pr-4 font-mono tabular-nums">{c.humanInterventions}</td>
                  <td className="whitespace-nowrap py-2.5 pr-4 font-mono tabular-nums">{c.coins.toFixed(2)}</td>
                  <td className="py-2.5 pr-4">
                    {c.culprit ? (
                      <>
                        <span className="font-mono text-[var(--accent)]">{c.culprit.sha}</span>{" "}
                        <span className="text-[var(--muted)]">{c.culprit.subject}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    {c.culpritCorrect ? (
                      <span className="inline-flex items-center gap-1.5 text-[var(--success)]">
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        <span className="text-[var(--text)]">Match</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[var(--danger)]">
                        <XCircle className="size-4" aria-hidden="true" />
                        <span className="text-[var(--text)]">No match</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-[var(--muted)]">{c.finalCulpritMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to read these numbers</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--muted)]">
            <li>Times run from the moment the Lead opens the case; &ldquo;proven&rdquo; is the last publish of the Proof of Fix.</li>
            <li>
              Early runs hit a bisect bug: Bob passed the repo path with a lowercase drive letter, so Vitest loaded twice
              and every commit was skipped. After the fix, a follow-up bisect confirmed those culprits; bug #5 found its
              culprit live.
            </li>
            <li>
              Human prompts are messages typed after the first one. Bobcoins come from IBM Bob&apos;s task log; building
              the Bob pack cost {s.coinsSetup.toFixed(2)} more, and all Bob work so far totals {s.coinsAllTasks.toFixed(2)}.
            </li>
            <li>There is no manual baseline, so no human-versus-Bob time comparison is claimed.</li>
          </ul>
          <p className="mt-3 text-xs text-[var(--muted)]">Generated {generatedAt.slice(0, 16).replace("T", " ")} UTC.</p>
        </CardContent>
      </Card>
    </div>
  );
}
