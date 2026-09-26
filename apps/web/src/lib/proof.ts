import type { Case, Event, Evidence } from "@bugproof/shared";
import benchmark from "@/data/benchmark.json";
import { isApproved, verdictLabel } from "@/lib/display";

export const REPO_URLS: Record<string, string> = {
  "bugproof-demo-shoplite": "https://github.com/GegarinSagolsem/bugproof-demo-shoplite",
};

export type CheckState = "pass" | "fail" | "missing";

export interface ProofCheck {
  id: "red" | "culprit" | "green" | "critic" | "tests";
  label: string;
  state: CheckState;
  detail: string;
  code?: string;
}

interface Detail {
  case: Case;
  events: Event[];
  evidence: Evidence[];
}

const text = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);
const firstLine = (s: string | undefined) => s?.split("\n")[0].trim();

export function benchmarkEntry(caseId: string) {
  return benchmark.cases.find((c) => c.caseId === caseId) ?? null;
}

// Evidence shapes vary across runs (early MCP versions, Bob-written evidence), so every check has a
// fallback to the matching milestone event.
export function buildProof(d: Detail) {
  const last = (kind: Evidence["kind"], ok: (e: Evidence) => boolean = () => true) =>
    d.evidence.filter((e) => e.kind === kind && ok(e)).at(-1);
  const milestone = (name: string) => d.events.find((e) => e.kind === "milestone" && e.title.startsWith(name));
  const bench = benchmarkEntry(d.case.id);

  const red = last("red", (e) => Number(e.data.failed) > 0);
  const reproReady = milestone("REPRO_READY");
  const redFailure = Array.isArray(red?.data.failures) ? (red.data.failures[0] as { message?: unknown }) : undefined;
  const assertion = firstLine(text(redFailure?.message) ?? text(reproReady?.data?.assertionFailure));

  const culprit = last("culprit");
  const culpritSha = text(culprit?.data.sha) ?? text(culprit?.data.commit);
  const bisectSteps = typeof culprit?.data.steps === "number" ? culprit.data.steps : undefined;

  // A run can record GREEN for the repro file alone and for the full suite; show the full suite (the larger).
  const green = d.evidence
    .filter((e) => e.kind === "green" && Number(e.data.total) > 0)
    .sort((a, b) => Number(b.data.total) - Number(a.data.total))[0];
  const fixGreen = milestone("FIX_GREEN")?.title.match(/(\d+)\/(\d+)/);
  const greenPassed = green ? Number(green.data.passed) : fixGreen ? Number(fixGreen[1]) : undefined;
  const greenTotal = green ? Number(green.data.total) : fixGreen ? Number(fixGreen[2]) : undefined;

  const critic = last("critic");
  const verdict = text(critic?.data.verdict) ?? (milestone("APPROVED") ? "APPROVED" : undefined);
  const reasons = critic && Array.isArray(critic.data.reasons) ? (critic.data.reasons as unknown[]).filter((r): r is string => typeof r === "string") : [];
  const approved = isApproved(verdict);

  // Runs since the test lock was added record the MCP server's check at publish time; for earlier runs, the
  // committed fix is checked in git instead (scripts/build-benchmark.mjs).
  const testsEvent = d.events.filter((e) => e.kind === "milestone" && /^TESTS_(UNCHANGED|CHANGED)/.test(e.title)).at(-1);
  const testsOk = testsEvent ? testsEvent.title.startsWith("TESTS_UNCHANGED") : undefined;
  const guard = bench?.testGuard;

  const checks: ProofCheck[] = [
    {
      id: "red",
      label: "Reproduced — a new test failed before the fix",
      state: red || reproReady ? "pass" : "missing",
      detail: red ? `${red.data.failed} of ${red.data.total} repro test${Number(red.data.total) === 1 ? "" : "s"} failed on the unfixed code` : reproReady ? "The Reproducer confirmed a failing test" : "No failing test recorded",
      code: assertion,
    },
    {
      id: "culprit",
      label: "Culprit commit identified",
      state: culprit ? "pass" : "missing",
      detail: culprit
        ? bisectSteps !== undefined
          ? `Pinned by git bisect in ${bisectSteps} steps${bench?.culpritCorrect ? " · matches the seeded answer key" : ""}`
          : `Named from git history${bench?.culpritCorrect ? " · matches the seeded answer key" : ""}`
        : "No culprit commit recorded",
      code: culprit ? `${culpritSha?.slice(0, 7) ?? ""} ${text(culprit.data.subject) ?? ""}`.trim() : undefined,
    },
    {
      id: "green",
      label: "Fixed — the repro test and the full suite pass",
      state: greenTotal !== undefined ? (greenPassed === greenTotal ? "pass" : "fail") : "missing",
      detail: greenTotal !== undefined ? `${greenPassed} of ${greenTotal} tests pass after the fix` : "No passing run recorded",
    },
    {
      id: "critic",
      label: "Reviewed — the Critic approved",
      state: verdict === undefined ? "missing" : approved ? "pass" : "fail",
      detail: verdict === undefined ? "No review recorded" : reasons[0] ?? `Verdict: ${verdict}`,
      code: verdict && verdictLabel(verdict),
    },
    {
      id: "tests",
      label: "Tests untouched — the fix changed no existing test",
      state: testsEvent ? (testsOk ? "pass" : "fail") : guard ? (guard.existingTestsChanged.length ? "fail" : "pass") : "missing",
      detail: testsEvent
        ? testsOk
          ? `Every test file matched the RED run when the proof was published (checked by the MCP server, ${Number(testsEvent.data?.files ?? 0)} files)`
          : testsEvent.title
        : guard
          ? guard.existingTestsChanged.length
            ? `The fix commit changed existing tests: ${guard.existingTestsChanged.join(", ")}`
            : "The fix commit only adds the repro test; no existing test was modified or deleted (git diff of the fix commit)"
          : "No test check recorded",
      code: !testsEvent && guard ? guard.testsAdded.map((f) => `+ ${f}`).join(", ") || undefined : undefined,
    },
  ];

  // A culprit attached by a follow-up bisect after publishing: the Lead's summary predates it.
  const provenAt = d.case.provenAt;
  const followUpBisect = provenAt
    ? d.events.filter((e) => e.kind === "milestone" && e.title.startsWith("BISECT_DONE") && e.ts > provenAt).at(-1)
    : undefined;
  const followUp = followUpBisect && culprit ? { at: followUpBisect.ts, sha: culpritSha?.slice(0, 7) ?? "" } : null;

  const fixDiff = text(last("diff")?.data.patch) ?? text(last("diff")?.data.diff);
  const repoUrl = REPO_URLS[d.case.repo];
  const verify =
    bench?.fixCommit && bench.reproTest && repoUrl
      ? { repoUrl, fixCommit: bench.fixCommit, test: bench.reproTest }
      : null;

  if (followUp) {
    const culpritCheck = checks.find((c) => c.id === "culprit");
    if (culpritCheck) culpritCheck.detail += " · found by a follow-up bisect after publishing";
  }

  return { checks, fixDiff, culpritDiff: text(culprit?.data.diff), verify, bench, followUp };
}

export function verifyCommands(v: { repoUrl: string; fixCommit: string; test: string }): string {
  const dir = v.repoUrl.split("/").pop();
  return [
    `git clone ${v.repoUrl} && cd ${dir} && npm ci`,
    `git checkout ${v.fixCommit}~1  # the code before the fix`,
    `git checkout ${v.fixCommit} -- ${v.test}  # add the repro test`,
    `npx vitest run ${v.test}  # fails: the bug is reproduced`,
    `git checkout ${v.fixCommit}  # the fix`,
    `npx vitest run ${v.test}  # passes`,
  ].join("\n");
}
