#!/usr/bin/env node
// Builds docs/benchmark.md and apps/web/src/data/benchmark.json from:
//   apps/web/data/cases/*.json      case events + evidence (scripts/export-cases.mjs)
//   docs/benchmark/bob-runs.json    per-run facts from IBM Bob's task log (coins, interventions, bisect)
//   docs/answer-key/bugs.md         the seeded culprit commits
// Every number in the video, slides and README must come from this output (Plan.md §9).
//
// Usage: node scripts/export-cases.mjs && node scripts/build-benchmark.mjs

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
const bob = JSON.parse(read("docs/benchmark/bob-runs.json"));

// "## 3. Delivery date …" followed by "- **Commit:** `eb3a92e` — `perf(delivery): …`"
const answerKey = {};
let bugNo;
for (const line of read("docs/answer-key/bugs.md").split(/\r?\n/)) {
  const heading = line.match(/^## (\d+)\. (.+)$/);
  if (heading) {
    bugNo = Number(heading[1]);
    answerKey[bugNo] = { title: heading[2].replace(/`/g, "").replace(/\s*\(hero\)$/, "") };
    continue;
  }
  const commit = line.match(/\*\*Commit:\*\* `([0-9a-f]+)` — `([^`]+)`/);
  if (commit && bugNo) Object.assign(answerKey[bugNo], { keyHash: commit[1], subject: commit[2] });
}

const minutes = (from, to) => (Date.parse(to) - Date.parse(from)) / 60000;
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const round2 = (n) => Math.round(n * 100) / 100;
const mmss = (m) => {
  if (m == null) return "—";
  const sec = Math.round(m * 60);
  return `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s`;
};
const utc = (ts) => (ts ? ts.slice(0, 19).replace("T", " ") : "—");

const cases = bob.runs.map((run) => {
  const d = JSON.parse(read(`apps/web/data/cases/${run.caseId}.json`));
  const milestone = (name) => d.events.find((e) => e.kind === "milestone" && e.title.startsWith(name));
  const last = (kind, ok = () => true) => d.evidence.filter((e) => e.kind === kind && ok(e)).pop();
  const red = milestone("REPRO_READY");
  const live = run.finalCulpritMethod.includes("live");
  const bisectDone = live ? milestone("BISECT_DONE") : undefined;
  const culprit = last("culprit");
  // Some runs recorded 0-test RED/GREEN evidence (see caveats); fall back to the FIX_GREEN milestone.
  // A run can record GREEN for the repro file alone and for the full suite; the full suite is the larger one.
  const green = d.evidence.filter((e) => e.kind === "green" && e.data.total > 0).sort((a, b) => b.data.total - a.data.total)[0];
  const fixGreen = milestone("FIX_GREEN")?.title.match(/(\d+)\/(\d+)/);
  const key = answerKey[run.bug];
  const found = culprit && { sha: String(culprit.data.sha ?? culprit.data.commit).slice(0, 7), subject: String(culprit.data.subject) };
  // Most REPRO_READY milestones carry data.file; bug #1's only names the file in its title.
  const testPath = /tests\/bugproof\/[\w.-]+\.test\.ts/;
  const reproTest =
    d.events.filter((e) => e.title.startsWith("REPRO_READY")).map((e) => e.data?.file ?? e.data?.testFile ?? e.data?.path).find(Boolean) ??
    d.events.filter((e) => e.title.startsWith("REPRO_READY")).map((e) => e.title.match(testPath)?.[0]).find(Boolean) ??
    null;
  return {
    bug: run.bug,
    title: key.title,
    caseId: run.caseId,
    intake: run.intake,
    status: d.case.status,
    startedAt: d.case.startedAt,
    redAt: red?.ts ?? null,
    liveCulpritAt: bisectDone?.ts ?? null,
    provenAt: d.case.provenAt ?? null,
    minutesToRed: red ? minutes(d.case.startedAt, red.ts) : null,
    minutesToLiveCulprit: bisectDone ? minutes(d.case.startedAt, bisectDone.ts) : null,
    minutesToProof: d.case.provenAt ? minutes(d.case.startedAt, d.case.provenAt) : null,
    testsAfter: green ? green.data.total : fixGreen ? Number(fixGreen[2]) : null,
    testsAfterSource: green ? "GREEN evidence" : fixGreen ? "FIX_GREEN milestone" : "—",
    culprit: found ?? null,
    answerKeySubject: key.subject,
    culpritCorrect: found?.subject === key.subject,
    liveCulprit: run.liveCulprit,
    liveCulpritNote: run.liveCulpritNote,
    finalCulpritMethod: run.finalCulpritMethod,
    finalCulpritNote: run.finalCulpritNote ?? null,
    coins: run.coins,
    humanInterventions: run.humanInterventions,
    bisectCalls: run.bisectCalls,
    bisectTimeouts: run.bisectTimeouts,
    fixCommit: run.fixCommit,
    reproTest,
  };
});

const sum = (xs) => round2(xs.reduce((a, b) => a + b, 0));
const notAttempted = Object.keys(answerKey).map(Number).filter((n) => !cases.some((c) => c.bug === n));
const liveRun = cases.find((c) => c.finalCulpritMethod.includes("live"));
const summary = {
  bugsAttempted: cases.length,
  proven: cases.filter((c) => c.status === "proven").length,
  unproven: cases.filter((c) => c.status === "unproven").length,
  culpritCorrect: cases.filter((c) => c.culpritCorrect).length,
  culpritCorrectByBisect: cases.filter((c) => c.culpritCorrect && c.finalCulpritMethod.startsWith("bisect")).length,
  liveCulpritCorrect: cases.filter((c) => c.liveCulprit === "correct").length,
  medianMinutesToRed: round2(median(cases.map((c) => c.minutesToRed))),
  medianMinutesToProof: round2(median(cases.map((c) => c.minutesToProof))),
  fastestMinutesToProof: round2(Math.min(...cases.map((c) => c.minutesToProof))),
  liveBisectRun: liveRun ? { bug: liveRun.bug, minutesToProof: round2(liveRun.minutesToProof), minutesToCulprit: round2(liveRun.minutesToLiveCulprit), humanInterventions: liveRun.humanInterventions, coins: liveRun.coins } : null,
  runsWithoutHumanIntervention: cases.filter((c) => c.humanInterventions === 0).length,
  coinsPerRunMedian: round2(median(cases.map((c) => c.coins))),
  coinsPerRunMin: Math.min(...cases.map((c) => c.coins)),
  coinsPerRunMax: Math.max(...cases.map((c) => c.coins)),
  coinsRuns: sum(cases.map((c) => c.coins)),
  coinsFollowUps: sum(bob.followUps.map((f) => f.coins)),
  coinsSetup: sum(bob.setup.map((s) => s.coins)),
  testsInSuiteAtEnd: Math.max(...cases.map((c) => c.testsAfter ?? 0)),
};
summary.coinsAllTasks = round2(summary.coinsRuns + summary.coinsFollowUps + summary.coinsSetup);

const generatedAt = new Date().toISOString();
mkdirSync(path.join(root, "apps/web/src/data"), { recursive: true });
writeFileSync(path.join(root, "apps/web/src/data/benchmark.json"), JSON.stringify({ generatedAt, summary, cases }, null, 2) + "\n");

const s = summary;
const row = (cells) => `| ${cells.join(" | ")} |`;
const md = [
  "# Benchmark — BugProof on the ShopLite demo repo",
  "",
  `_Generated ${generatedAt.slice(0, 16).replace("T", " ")} UTC by \`scripts/build-benchmark.mjs\` from the exported case events`,
  "(`apps/web/data/cases/*.json`), IBM Bob's task log (`docs/benchmark/bob-runs.json`) and the answer key",
  "(`docs/answer-key/bugs.md`). Do not edit by hand: re-run `node scripts/export-cases.mjs && node scripts/build-benchmark.mjs`._",
  "",
  "## Headline numbers",
  "",
  `- **Bugs attempted:** ${s.bugsAttempted} · **proven:** ${s.proven} · **unproven:** ${s.unproven}`,
  `- **Culprit commit matches the answer key:** ${s.culpritCorrect}/${s.bugsAttempted} (${s.culpritCorrectByBisect} established by \`git bisect\`, ${s.culpritCorrect - s.culpritCorrectByBisect} named by the Historian from git history)`,
  `- **Culprit named correctly during the run itself:** ${s.liveCulpritCorrect}/${s.bugsAttempted} — bisect found it live in ${cases.filter((c) => c.finalCulpritMethod.includes("live")).length} run; earlier runs hit a bisect bug (see caveats) and were re-bisected afterwards`,
  `- **Median time to a failing (RED) reproduction test:** ${mmss(s.medianMinutesToRed)}`,
  `- **Median time to proof:** ${mmss(s.medianMinutesToProof)} (fastest ${mmss(s.fastestMinutesToProof)}; includes time runs waited on a human)`,
  s.liveBisectRun
    ? `- **Run after the pipeline fixes (bug #${s.liveBisectRun.bug}):** culprit by bisect at ${mmss(s.liveBisectRun.minutesToCulprit)}, proven at ${mmss(s.liveBisectRun.minutesToProof)}, ${s.liveBisectRun.humanInterventions} human interventions, ${s.liveBisectRun.coins} Bobcoins`
    : "",
  `- **Runs with zero human interventions:** ${s.runsWithoutHumanIntervention}/${s.bugsAttempted}`,
  `- **Bobcoins per run:** median ${s.coinsPerRunMedian} (range ${s.coinsPerRunMin}–${s.coinsPerRunMax}) · all ${s.bugsAttempted} runs ${s.coinsRuns} · follow-up re-bisects ${s.coinsFollowUps} · building the Bob pack ${s.coinsSetup} · every Bob task ${s.coinsAllTasks}`,
  `- **Largest suite in a run's GREEN evidence:** ${s.testsInSuiteAtEnd} tests, all passing (each proven bug added its repro test)`,
  "",
  "## Per case",
  "",
  row(["Bug", "Intake", "Case", "Time to RED", "Time to proof", "Tests after", "Human interventions", "Bobcoins", "Culprit", "Matches key", "How the culprit was established"]),
  row(Array(11).fill("---")),
  ...cases.map((c) =>
    row([`#${c.bug} ${c.title}`, c.intake, `\`${c.caseId}\``, mmss(c.minutesToRed), mmss(c.minutesToProof), String(c.testsAfter ?? "—"), String(c.humanInterventions), c.coins.toFixed(2),
      c.culprit ? `\`${c.culprit.sha}\` ${c.culprit.subject}` : "—", c.culpritCorrect ? "✅" : "❌", c.finalCulpritMethod])),
  "",
  "## Raw timestamps (UTC, from the case events)",
  "",
  row(["Bug", "Case opened", "REPRO_READY (RED)", "BISECT_DONE (live bisect)", "Proven (last publish)"]),
  row(Array(5).fill("---")),
  ...cases.map((c) => row([`#${c.bug}`, utc(c.startedAt), utc(c.redAt), utc(c.liveCulpritAt), utc(c.provenAt)])),
  "",
  "## Culprit vs answer key",
  "",
  row(["Bug", "Answer key (commit subject)", "Found", "During the run", "Final method", "Note"]),
  row(Array(6).fill("---")),
  ...cases.map((c) => row([`#${c.bug}`, c.answerKeySubject, c.culprit ? `\`${c.culprit.sha}\`` : "—", `${c.liveCulprit} — ${c.liveCulpritNote}`, c.finalCulpritMethod, c.finalCulpritNote ?? ""])),
  "",
  "## Bobcoins (IBM Bob task log)",
  "",
  row(["Bob task", "What", "Bobcoins"]),
  row(Array(3).fill("---")),
  ...cases.map((c) => row([`\`${bob.runs.find((r) => r.caseId === c.caseId).bobTask}\``, `Run bug #${c.bug}`, c.coins.toFixed(2)])),
  ...bob.followUps.map((f) => row([`\`${f.bobTask}\``, f.what, f.coins.toFixed(2)])),
  ...bob.setup.map((f) => row([`\`${f.bobTask}\``, `Setup: ${f.what}`, f.coins.toFixed(2)])),
  row(["", "**Total**", `**${s.coinsAllTasks.toFixed(2)}**`]),
  "",
  "## Definitions and caveats",
  "",
  "- **Time to X** = event timestamp − the case's `startedAt` (when the Lead opened the case). **Time to proof** uses `provenAt`",
  "  (the last `publish_proof`) and includes any time the run waited on a human.",
  "- **Human interventions** = messages typed by the human after the first prompt. Automatic Lead→subtask hand-offs are not counted.",
  "- **Bobcoins** = the root task's recorded cost (it includes its subagents and every subtask that handed back) plus subtasks that",
  "  never handed back. Source: `~/.bob/db/bob.db`; it matches the in-app coin balance.",
  "- The answer key's commit hashes predate a history rewrite of the demo repo, so culprits are matched by **commit subject**.",
  `- ${bob.rootCauseOfEarlyBisectFailures} This is why bisect timed out in runs #4, #1, #3 and #8, why #3 and #8 needed human prompts,`,
  "  and why their culprits were attached by a follow-up bisect task.",
  "- Bug #8's RED/GREEN evidence recorded 0 tests (`run_tests` hit the same bug); its tests-after comes from the FIX_GREEN milestone.",
  "  Bug #4's early run attached no RED/GREEN evidence (early MCP version); same fallback.",
  "- **Manual baseline: not measured yet** (Plan.md §9) — no human-vs-Bob time comparison is claimed.",
  notAttempted.length
    ? `- ${notAttempted.map((n) => `Bug #${n}`).join(" and ")} ${notAttempted.length === 1 ? "was" : "were"} not attempted (Bobcoin budget).`
    : "- Every bug in the answer key was attempted.",
  "",
].filter((l) => l !== null).join("\n");
writeFileSync(path.join(root, "docs/benchmark.md"), md);
console.log(`docs/benchmark.md and apps/web/src/data/benchmark.json written — ${s.proven}/${s.bugsAttempted} proven, culprits ${s.culpritCorrect}/${s.bugsAttempted}`);
