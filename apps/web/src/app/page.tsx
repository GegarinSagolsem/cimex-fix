import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import benchmark from "@/data/benchmark.json";
import { dataSource } from "@/lib/data";
import { mmss } from "@/components/impact/format";

const REPO_URL = "https://github.com/GegarinSagolsem/bugproof";

const STEPS = [
  ["Report in", "A customer screenshot, a QA PDF, a server log or an issue. Bob reads images and PDFs directly."],
  ["Investigate in parallel", "The Lead spawns Triage, Locator and Historian subagents at the same time."],
  ["Reproduce — RED", "The Reproducer may only write tests. Its test must fail on an assertion, not a crash."],
  ["Pinpoint", "git bisect, run through the BugProof MCP server, finds the exact culprit commit."],
  ["Fix — GREEN", "The Fixer may only edit src/. Tests are read-only for it, so it can't cheat."],
  ["Challenge", "The read-only Critic reviews the fix and can send it back once."],
  ["Proof", "The case is published with its evidence, and IBM watsonx.ai Granite explains it in plain English."],
] as const;

const BOB_FEATURES = [
  "4 custom modes with file-level edit permissions",
  "3 skills: repro-test, root-cause, proof-of-fix",
  "An MCP server with 6 tools, including git bisect",
  "Parallel subagents and hand-off subtasks",
  "Screenshot and PDF intake",
  "watsonx.ai Granite summaries and live triage",
];

// First occurrence of each milestone, in the order the pipeline reaches them.
const REPLAY_MILESTONES = [
  ["TRIAGE_COMPLETE", "Lead", "Triage, Locator and Historian report back"],
  ["REPRO_READY", "Reproducer", "Failing test written — the bug is reproduced"],
  ["BISECT_DONE", "Lead", "git bisect pins the culprit commit"],
  ["FIX_GREEN", "Fixer", "Fix applied — every test passes"],
  ["APPROVED", "Critic", "Fix reviewed and approved"],
] as const;

export default async function Home() {
  const s = benchmark.summary;
  const showcase = benchmark.cases.find((c) => c.bug === s.liveBisectRun?.bug) ?? benchmark.cases.at(-1)!;
  const detail = await dataSource.getCase(showcase.caseId);
  const startedAt = detail ? Date.parse(detail.case.startedAt) : 0;
  const offset = (ts: string) => (Date.parse(ts) - startedAt) / 60000;
  const replay = detail
    ? [
        ...REPLAY_MILESTONES.flatMap(([title, agent, text]) => {
          const e = detail.events.find((ev) => ev.kind === "milestone" && ev.title.startsWith(title));
          return e ? [{ at: offset(e.ts), agent, text }] : [];
        }),
        ...(detail.case.provenAt ? [{ at: offset(detail.case.provenAt), agent: "Lead", text: "Proof of Fix published" }] : []),
      ]
    : [];

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
          BugProof
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          {[
            ["/cases", "Cases"],
            ["/impact", "Impact"],
            ["/triage", "Triage"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-md px-2 py-1.5 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] sm:px-2.5">
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-16 px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
        <section className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />
            Powered by IBM Bob 2.0
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">No fix without proof.</h1>
          <p className="max-w-2xl text-lg text-[var(--muted)]">
            BugProof turns a bug report into a Proof of Fix. IBM Bob reproduces the bug with a failing test, pins the
            culprit commit with <span className="font-mono text-[var(--text)]">git bisect</span>, fixes it under
            file-level permissions, and a Critic signs off — live on Mission Control.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/cases/${showcase.caseId}/proof`}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--bg)] hover:opacity-90"
            >
              <ShieldCheck className="size-4" aria-hidden="true" />
              See a real proof
            </Link>
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface)]"
            >
              Browse all cases
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section aria-label="Results so far" className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              [`${s.culpritCorrect}/${s.bugsAttempted}`, "culprit commits match the answer key"],
              [`${s.proven}/${s.bugsAttempted}`, "real bugs proven: failing test, fix, all tests green"],
              [mmss(s.medianMinutesToRed), "median time to a failing test"],
              [mmss(s.liveBisectRun?.minutesToProof ?? s.fastestMinutesToProof), `latest run, report to proof (bug #${showcase.bug})`],
            ].map(([value, label]) => (
              <div key={label} className="flex flex-col-reverse justify-end gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                <dt className="text-sm text-[var(--muted)]">{label}</dt>
                <dd className="text-3xl font-semibold tracking-tight">{value}</dd>
              </div>
            ))}
          </dl>
          <Link href="/impact" className="self-start text-sm text-[var(--accent)] underline-offset-2 hover:underline">
            How we measured this →
          </Link>
        </section>

        {replay.length > 0 && (
          <section aria-labelledby="replay-title" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start">
            <div className="flex flex-col gap-3">
              <h2 id="replay-title" className="text-2xl font-semibold tracking-tight">
                A real run, start to proof
              </h2>
              <p className="text-[var(--muted)]">
                Bug #{showcase.bug}: &ldquo;{showcase.title}&rdquo;, reported as a customer issue. These are the real
                milestone times from the case, with no human prompts along the way.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/cases/${showcase.caseId}`} className="text-sm text-[var(--accent)] underline-offset-2 hover:underline">
                  Open the case timeline →
                </Link>
              </div>
            </div>
            <ol className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
              {replay.map((step, i) => (
                <li
                  key={step.text}
                  className="reveal-step grid grid-cols-[4.5rem_1fr] items-baseline gap-3 rounded-md px-3 py-2.5"
                  style={{ ["--i" as string]: i }}
                >
                  <span className="font-mono text-sm tabular-nums text-[var(--accent)]">{mmss(step.at)}</span>
                  <span className="text-sm">
                    <span className="font-medium">{step.agent}</span>
                    <span className="text-[var(--muted)]"> — {step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section aria-labelledby="how-title" className="flex flex-col gap-6">
          <h2 id="how-title" className="text-2xl font-semibold tracking-tight">
            How it works
          </h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="rounded-lg border border-[var(--border)] p-4">
                <p className="font-mono text-xs text-[var(--muted)]">{String(i + 1).padStart(2, "0")}</p>
                <p className="mt-1 font-medium">{title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="bob-title" className="flex flex-col gap-4">
          <h2 id="bob-title" className="text-2xl font-semibold tracking-tight">
            Built on IBM Bob 2.0
          </h2>
          <ul className="flex flex-wrap gap-2">
            {BOB_FEATURES.map((f) => (
              <li key={f} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm">
                {f}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-[var(--muted)] sm:px-6">
          <span>Every number on this site is computed from real case data — see docs/benchmark.md.</span>
          <a href={REPO_URL} className="hover:text-[var(--text)]">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
