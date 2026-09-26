import Link from "next/link";
import { ArrowRight, FileSearch, Network, Plug, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import benchmark from "@/data/benchmark.json";
import { dataSource } from "@/lib/data";
import { buildProof } from "@/lib/proof";
import { mmss } from "@/components/impact/format";

const REPO_URL = "https://github.com/GegarinSagolsem/bugproof";

const LABEL = "font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--muted)]";
const HERO_LABEL = "font-mono text-[11px] uppercase tracking-[0.25em] text-white";

const STEPS = [
  ["Report in", "A customer screenshot, a QA PDF, a server log or an issue. Bob reads images and PDFs directly.", "Lead"],
  ["Investigate in parallel", "Three subagents work at once: what broke, where the code path runs, what changed recently.", "Triage · Locator · Historian"],
  ["Reproduce — RED", "The smallest test that fails on an assertion, not a crash or a typo.", "Reproducer · tests only"],
  ["Pinpoint", "git bisect runs that test through history and names the exact culprit commit.", "MCP · git bisect"],
  ["Fix — GREEN", "The smallest change that turns the test green without breaking any other test.", "Fixer · src/ only"],
  ["Challenge", "An adversarial review hunts for edge cases and can send the fix back once.", "Critic · read-only"],
  ["Proof", "A shareable Proof of Fix with every piece of evidence, explained in plain English.", "watsonx.ai Granite"],
] as const;

const BOB_FEATURES = [
  [ShieldCheck, "Custom modes", "4 modes, each with file-level edit permissions — the Fixer physically can't touch tests."],
  [Wand2, "Skills", "repro-test, root-cause and proof-of-fix guide each step."],
  [Plug, "MCP server", "6 tools: open_case, record, evidence, run_tests, bisect, publish_proof."],
  [Network, "Subagents & subtasks", "Parallel investigation, then hand-offs between permission-scoped modes."],
  [FileSearch, "Any intake", "Screenshots, PDFs, logs and issue text go straight into the case."],
  [Sparkles, "watsonx.ai Granite", "Plain-English proof summaries and live triage on /triage."],
] as const;

const REPLAY_MILESTONES = [
  ["TRIAGE_COMPLETE", "Lead", "Triage, Locator and Historian report back", "var(--accent)"],
  ["REPRO_READY", "Reproducer", "Failing test written — the bug is reproduced", "var(--danger)"],
  ["BISECT_DONE", "Lead", "git bisect pins the culprit commit", "var(--accent)"],
  ["FIX_GREEN", "Fixer", "Fix applied — every test passes", "var(--success)"],
  ["APPROVED", "Critic", "Fix reviewed and approved", "var(--agent)"],
] as const;

export default async function Home() {
  const s = benchmark.summary;
  const showcase = benchmark.cases.find((c) => c.bug === s.liveBisectRun?.bug) ?? benchmark.cases.at(-1)!;
  const detail = await dataSource.getCase(showcase.caseId);

  const startedAt = detail ? Date.parse(detail.case.startedAt) : 0;
  const offset = (ts: string) => (Date.parse(ts) - startedAt) / 60000;
  const replay = detail
    ? [
        ...REPLAY_MILESTONES.flatMap(([title, agent, text, color]) => {
          const e = detail.events.find((ev) => ev.kind === "milestone" && ev.title.startsWith(title));
          return e ? [{ at: offset(e.ts), agent, text, color }] : [];
        }),
        ...(detail.case.provenAt
          ? [{ at: offset(detail.case.provenAt), agent: "Lead", text: "Proof of Fix published", color: "var(--success)" }]
          : []),
      ]
    : [];
  const checks = detail ? buildProof(detail).checks : [];
  const check = (id: string) => checks.find((c) => c.id === id);

  const heroStats = [
    [`${s.culpritCorrect}/${s.bugsAttempted}`, "culprit commits correct"],
    [mmss(s.liveBisectRun?.minutesToProof ?? s.fastestMinutesToProof), "report to proof, latest run"],
    [String(s.testsInSuiteAtEnd), "tests green at the end"],
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="px-2 pt-2 sm:px-4 sm:pt-4">
        <section className="hero-sky relative isolate overflow-hidden rounded-[28px] text-white">
          <div aria-hidden="true" className="hero-clouds absolute inset-0 -z-10" />

          <header className="flex items-center justify-between gap-3 p-4 sm:px-8 sm:py-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="h-2 w-2 rounded-full bg-[var(--highlight)]" aria-hidden="true" />
              BugProof
            </Link>
            <nav
              aria-label="Main"
              className="flex items-center gap-0.5 rounded-full border border-white/25 bg-white/10 p-1 font-mono text-xs uppercase tracking-[0.12em] backdrop-blur-md"
            >
              {[
                ["/cases", "Cases"],
                ["/impact", "Impact"],
                ["/triage", "Triage"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="rounded-full px-3 py-1.5 text-white hover:bg-white/20">
                  {label}
                </Link>
              ))}
            </nav>
            <Link
              href="/cases"
              className="hidden items-center gap-1.5 rounded-full bg-[var(--highlight)] px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-[var(--highlight-fg)] hover:brightness-95 md:inline-flex"
            >
              Mission Control
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </header>

          <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-8 sm:px-10 sm:pb-14 sm:pt-14">
            <p className={HERO_LABEL}>Powered by IBM Bob 2.0 · watsonx.ai</p>
            <h1 className="mt-5 max-w-4xl text-[clamp(2.75rem,8vw,6rem)] font-semibold leading-[0.92] tracking-[-0.04em]">
              No fix
              <br />
              without proof.
            </h1>

            <ul className="mt-8 grid grid-cols-3 gap-4 xl:absolute xl:right-10 xl:top-12 xl:mt-0 xl:flex xl:flex-col xl:gap-9">
              {heroStats.map(([value, label]) => (
                <li key={label} className="flex items-center gap-4">
                  <span className="hidden h-px w-20 bg-[linear-gradient(to_right,transparent,white)] xl:block" aria-hidden="true" />
                  <p className="flex flex-col">
                    <span className="text-2xl font-semibold tracking-tight sm:text-3xl">{value}</span>
                    <span className="text-xs text-white">{label}</span>
                  </p>
                </li>
              ))}
            </ul>

            <p className="mt-8 max-w-xl text-base text-white sm:text-lg">
              BugProof turns a bug report into a Proof of Fix. IBM Bob reproduces the bug with a failing test, pins the culprit
              commit with <span className="font-mono">git bisect</span>, fixes it under file-level permissions, and a Critic
              signs off — live on Mission Control.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={`/cases/${showcase.caseId}/proof`}
                className="inline-flex items-center gap-3 rounded-full bg-[var(--highlight)] py-1.5 pl-5 pr-1.5 font-mono text-xs font-medium uppercase tracking-[0.12em] text-[var(--highlight-fg)] hover:brightness-95"
              >
                See a real proof
                <span className="flex size-8 items-center justify-center rounded-full bg-[#111111] text-white">
                  <ArrowRight className="size-4 -rotate-45" aria-hidden="true" />
                </span>
              </Link>
              <Link
                href="/cases"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.12em] text-white backdrop-blur hover:bg-white/20"
              >
                Browse all cases
              </Link>
            </div>

            {checks.length > 0 && (
              <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-4" aria-label={`Evidence from bug #${showcase.bug}`}>
                <EvidenceCard i={0} tilt="lg:-rotate-3 lg:mt-3" dot="var(--danger)" label="RED · reproduced">
                  <p className="break-words font-mono text-xs leading-relaxed">{check("red")?.code ?? check("red")?.detail}</p>
                </EvidenceCard>
                <EvidenceCard i={1} tilt="lg:-rotate-1" dot="var(--accent)" label="Culprit · git bisect">
                  <p className="font-mono text-sm text-[var(--accent)]">{check("culprit")?.code?.split(" ")[0]}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{check("culprit")?.code?.split(" ").slice(1).join(" ")}</p>
                </EvidenceCard>
                <EvidenceCard i={2} tilt="lg:rotate-1" dot="var(--success)" label="GREEN · fixed">
                  <p className="text-3xl font-semibold tracking-tight">{showcase.testsAfter}/{showcase.testsAfter}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">tests pass after the fix</p>
                </EvidenceCard>
                <EvidenceCard i={3} tilt="lg:rotate-3 lg:mt-3" dot="var(--agent)" label="Critic · approved">
                  <span className="inline-flex -rotate-3 items-center gap-1.5 rounded-md border-2 border-[var(--success)] px-2.5 py-1 font-mono text-sm font-semibold uppercase tracking-[0.2em] text-[var(--success)]">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    Proven
                  </span>
                  <p className="mt-2 text-xs text-[var(--muted)]">Bug #{showcase.bug} · {mmss(showcase.minutesToProof)}</p>
                </EvidenceCard>
              </div>
            )}
          </div>
        </section>
      </div>

      <main className="mx-auto flex max-w-6xl flex-col gap-20 px-4 py-16 sm:gap-24 sm:px-6 sm:py-24">
        <section aria-labelledby="results-title" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={LABEL}>Measured, not claimed</p>
              <h2 id="results-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {s.bugsAttempted} real bugs. {s.proven} proven.
              </h2>
            </div>
            <Link href="/impact" className="text-sm text-[var(--accent)] underline-offset-2 hover:underline">
              How we measured this →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
            <div className="flex flex-col justify-between gap-6 rounded-3xl bg-[var(--accent)] p-6 text-[var(--accent-fg)] sm:col-span-2 lg:row-span-2 lg:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] opacity-80">Headline</p>
              <p className="flex flex-col gap-2">
                <span className="text-7xl font-semibold tracking-tight sm:text-8xl">
                  {s.culpritCorrect}/{s.bugsAttempted}
                </span>
                <span className="max-w-sm text-base font-medium">
                  culprit commits match the seeded answer key — {s.culpritCorrectByBisect} pinned by git bisect in Bob
                </span>
              </p>
            </div>
            <BentoTile value={`${s.proven}/${s.bugsAttempted}`} label="bugs proven: failing test → fix → all tests green" />
            <BentoTile value={mmss(s.medianMinutesToRed)} label="median time to a failing test" tone="highlight" />
            <BentoTile value={s.coinsPerRunMedian.toFixed(2)} label="Bobcoins per fix (median)" tone="ink" />
            <BentoTile value={String(s.runsWithoutHumanIntervention)} label={`runs with zero human prompts, of ${s.bugsAttempted}`} />
          </div>
        </section>

        {replay.length > 0 && (
          <section aria-labelledby="replay-title" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-center">
            <div className="flex flex-col gap-4">
              <p className={LABEL}>A real run</p>
              <h2 id="replay-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
                From customer issue to proof in {mmss(showcase.minutesToProof)}.
              </h2>
              <p className="text-[var(--muted)]">
                Bug #{showcase.bug}, &ldquo;{showcase.title}&rdquo;. These are the real milestone times from the case — no human
                prompts along the way.
              </p>
              <Link href={`/cases/${showcase.caseId}`} className="text-sm text-[var(--accent)] underline-offset-2 hover:underline">
                Open the case timeline →
              </Link>
            </div>
            <ol className="relative rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
              <span aria-hidden="true" className="absolute bottom-10 left-[calc(1rem+4.5rem+0.75rem+5px)] top-10 w-px bg-[var(--border)] sm:left-[calc(1.5rem+4.5rem+0.75rem+5px)]" />
              {replay.map((step, i) => (
                <li
                  key={step.text}
                  className="reveal-step relative grid grid-cols-[4.5rem_auto_1fr] items-center gap-3 py-3"
                  style={{ ["--i" as string]: i }}
                >
                  <span className="font-mono text-sm tabular-nums text-[var(--muted)]">{mmss(step.at)}</span>
                  <span className="size-2.5 rounded-full ring-4 ring-[var(--surface)]" style={{ background: step.color }} aria-hidden="true" />
                  <span className="text-sm">
                    <span className="font-medium">{step.agent}</span>
                    <span className="text-[var(--muted)]"> — {step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>

      <section aria-labelledby="how-title" className="border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-24">
          <div>
            <p className={LABEL}>How it works</p>
            <h2 id="how-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Seven steps. One proof.
            </h2>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([title, text, who], i) => (
              <li key={title} className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
                <span className="font-mono text-3xl font-semibold tracking-tight text-[var(--border)]">{String(i + 1).padStart(2, "0")}</span>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-[var(--muted)]">{text}</p>
                <span className="mt-auto self-start rounded-full border border-[var(--border)] px-2.5 py-1 font-mono text-[11px] text-[var(--muted)]">{who}</span>
              </li>
            ))}
            <li className="flex flex-col justify-between gap-3 rounded-2xl bg-[var(--text)] p-5 text-[var(--bg)]">
              <p className="text-lg font-semibold leading-snug">Every step is recorded as evidence on the case — nothing is taken on trust.</p>
              <Link href={`/cases/${showcase.caseId}/proof`} className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-2 hover:underline">
                See the evidence
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </li>
          </ol>
        </div>
      </section>

      <section aria-labelledby="bob-title" className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-24">
        <div>
          <p className={LABEL}>Built on IBM Bob 2.0</p>
          <h2 id="bob-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Bob does the work. The permissions keep it honest.
          </h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BOB_FEATURES.map(([Icon, title, text]) => (
            <li key={title} className="flex gap-4 rounded-2xl border border-[var(--border)] p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="overflow-hidden border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pt-8 text-xs text-[var(--muted)] sm:px-6">
          <span>Every number on this site is computed from real case data — see docs/benchmark.md.</span>
          <a href={REPO_URL} className="hover:text-[var(--text)]">
            GitHub
          </a>
        </div>
        <p
          aria-hidden="true"
          className="select-none px-2 text-center text-[clamp(4rem,19vw,16rem)] font-semibold leading-[0.8] tracking-[-0.06em] text-[var(--border)]"
        >
          BugProof
        </p>
      </footer>
    </div>
  );
}

function EvidenceCard({
  i,
  tilt,
  dot,
  label,
  children,
}: {
  i: number;
  tilt: string;
  dot: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`float-card rounded-2xl bg-[var(--surface)] p-4 text-[var(--text)] shadow-[0_12px_32px_rgb(10_60_150/0.25)] ${tilt}`}
      style={{ ["--i" as string]: i }}
    >
      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
        <span className="size-2 rounded-full" style={{ background: dot }} aria-hidden="true" />
        {label}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function BentoTile({ value, label, tone }: { value: string; label: string; tone?: "highlight" | "ink" }) {
  const toneClass =
    tone === "highlight"
      ? "bg-[var(--highlight)] text-[var(--highlight-fg)]"
      : tone === "ink"
        ? "bg-[var(--text)] text-[var(--bg)]"
        : "bg-[var(--surface)] border border-[var(--border)]";
  const labelClass = tone ? "" : "text-[var(--muted)]";
  return (
    <p className={`flex flex-col gap-2 rounded-3xl p-6 ${toneClass}`}>
      <span className="text-4xl font-semibold tracking-tight">{value}</span>
      <span className={`text-sm ${labelClass}`}>{label}</span>
    </p>
  );
}
