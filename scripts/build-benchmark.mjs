#!/usr/bin/env node
// Builds docs/benchmark.md and apps/web/src/data/benchmark.json from:
//   apps/web/data/cases/*.json      case events + evidence (scripts/export-cases.mjs)
//   docs/benchmark/bob-runs.json    per-run facts from IBM Bob's task log (coins, interventions, bisect)
//   docs/answer-key/bugs.md         the seeded culprit commits
//   docs/benchmark/model-baseline.json  one-shot watsonx.ai models and Bob's fixes, scored alike (scripts/model-baseline.mjs)
// Every number in the video, slides and README must come from this output.
//
// Usage: node scripts/export-cases.mjs && node scripts/build-benchmark.mjs

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
const bob = JSON.parse(read("docs/benchmark/bob-runs.json"));
const demoRepo = path.resolve(root, "..", "bugproof-demo-shoplite");
const previous = existsSync(path.join(root, "apps/web/src/data/benchmark.json"))
  ? JSON.parse(read("apps/web/src/data/benchmark.json"))
  : null;

// Which test files each committed fix touched: an added repro test is expected; a modified or deleted existing test
// would mean the fix passed by changing a test. Kept from the last build when the demo repo isn't checked out here.
function testGuard(caseId, fixCommit) {
  const r = fixCommit && existsSync(demoRepo)
    ? spawnSync("git", ["diff", "--name-status", `${fixCommit}~1`, fixCommit, "--", "tests"], { cwd: demoRepo, encoding: "utf8" })
    : null;
  if (!r || r.status !== 0) return previous?.cases.find((c) => c.caseId === caseId)?.testGuard ?? null;
  const rows = r.stdout.split(/\r?\n/).filter(Boolean).map((l) => l.split("\t"));
  return {
    testsAdded: rows.filter(([st]) => st === "A").map(([, f]) => f),
    existingTestsChanged: rows.filter(([st]) => st !== "A").map(([, ...f]) => f.join(" → ")),
  };
}

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
    testGuard: testGuard(run.caseId, run.fixCommit),
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
  culpritByLiveBisect: cases.filter((c) => c.culpritCorrect && c.finalCulpritMethod.includes("live")).length,
  culpritByFollowUpBisect: cases.filter((c) => c.culpritCorrect && c.finalCulpritMethod.includes("follow-up")).length,
  bugsPlanted: Object.keys(answerKey).length,
  bugsNotAttempted: notAttempted,
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
  fixesCheckedForTestChanges: cases.filter((c) => c.testGuard).length,
  fixesChangingExistingTests: cases.filter((c) => c.testGuard?.existingTestsChanged.length).length,
};
summary.coinsAllTasks = round2(summary.coinsRuns + summary.coinsFollowUps + summary.coinsSetup);
// The Lead hands off to the Reproducer, Fixer and Critic with start_subtask; count runs where all three hand-offs ran.
summary.fullHandoffBugs = bob.runs.filter((r) => r.startSubtask >= 3).map((r) => r.bug);
summary.handoffsByBug = Object.fromEntries(bob.runs.map((r) => [r.bug, { startSubtask: r.startSubtask, spawnSubagent: r.spawnSubagent }]));
// Time to re-check a proof from scratch (scripts/measure-recheck.mjs).
const recheckFile = path.join(root, "docs/benchmark/recheck.json");
summary.recheck = existsSync(recheckFile) ? JSON.parse(readFileSync(recheckFile, "utf8")) : null;

// One-shot models vs Bob's fixes, scored by the same checks, on the bugs Bob attempted.
const MODEL_LABELS = {
  "ibm/granite-4-h-small": "Granite 4 H Small",
  "meta-llama/llama-3-3-70b-instruct": "Llama 3.3 70B",
  "meta-llama/llama-4-maverick-17b-128e-instruct-fp8": "Llama 4 Maverick",
  "mistralai/mistral-small-3-1-24b-instruct-2503": "Mistral Small 3.1",
  "openai/gpt-oss-120b": "gpt-oss-120b",
  "google/gemini-3.1-pro-high": "Gemini 3.1 Pro (High)",
  "anthropic/claude-opus-4-6-thinking": "Claude Opus 4.6 (Thinking)",
};
const baselineFile = path.join(root, "docs/benchmark/model-baseline.json");
const baseline = existsSync(baselineFile) ? JSON.parse(readFileSync(baselineFile, "utf8")) : null;
let comparison = null;
if (baseline) {
  const bugs = cases.map((c) => c.bug).sort((a, b) => a - b);
  // watsonx.ai models are called by the script; manual ones (Gemini via the Antigravity CLI) are collected separately.
  const manualModels = baseline.setup.manualModels ?? {};
  const allModels = [...baseline.setup.models, ...Object.keys(manualModels)];
  const checks = (x) => ({
    fixed: Boolean(x?.probe),
    suiteGreen: Boolean(x?.suite?.ok),
    proofTest: Boolean(x?.red && x?.green),
    fixWithProof: Boolean(x?.probe && x?.suite?.ok && x?.red && x?.green),
  });
  const tally = (rows) => ({
    fixed: rows.filter((r) => r.fixed).length,
    suiteGreen: rows.filter((r) => r.suiteGreen).length,
    proofTest: rows.filter((r) => r.proofTest).length,
    fixWithProof: rows.filter((r) => r.fixWithProof).length,
    culpritCorrect: rows.filter((r) => r.culpritCorrect).length,
  });
  const perBug = bugs.map((bug) => {
    const c = cases.find((x) => x.bug === bug);
    const bobScore = baseline.bob.find((b) => b.bug === bug);
    return {
      bug,
      title: c.title,
      probeFailsAtBase: bobScore?.control.probeFailsAtBase ?? null,
      cimex: { ...checks(bobScore?.bob), culpritCorrect: c.culpritCorrect, culpritDuringRun: c.liveCulprit === "correct" },
      models: Object.fromEntries(
        allModels.map((m) => {
          const a = baseline.attempts.find((x) => x.bug === bug && x.model === m);
          return [m, a ? { ...checks(a), culpritCorrect: a.culpritCorrect, answered: true } : { ...checks(null), culpritCorrect: false, answered: false }];
        }),
      ),
    };
  });
  const attemptsOn = (m) => baseline.attempts.filter((a) => a.model === m && bugs.includes(a.bug));
  const oneShot = baseline.attempts.filter((a) => bugs.includes(a.bug)).map((a) => ({ ...a, ...checks(a) }));
  comparison = {
    oneShotTotals: {
      answers: oneShot.length,
      complete: oneShot.filter((a) => a.culprit && a.filesChanged.length > 0 && a.testWritten).length,
      fixed: oneShot.filter((a) => a.fixed).length,
      fixWithProof: oneShot.filter((a) => a.fixWithProof).length,
      culpritCorrect: oneShot.filter((a) => a.culpritCorrect).length,
      brokeTests: oneShot.filter((a) => a.suite && !a.suite.ok).length,
    },
    bugs,
    temperature: baseline.setup.temperature,
    askedOn: baseline.attempts.map((a) => a.askedAt).sort()[0]?.slice(0, 10) ?? null,
    manualVia: Object.values(manualModels)[0]?.via ?? null,
    region: (baseline.setup.region ?? "").replace(/^https:\/\//, "").split(".")[0],
    controlsOk: perBug.every((p) => p.probeFailsAtBase === true),
    contenders: [
      {
        id: "cimex",
        name: "Cimex Fix (IBM Bob)",
        kind: "pipeline",
        ...tally(perBug.map((p) => p.cimex)),
        culpritDuringRun: perBug.filter((p) => p.cimex.culpritDuringRun).length,
        cost: `${summary.coinsPerRunMedian} Bobcoins median per bug`,
        time: `${mmss(summary.medianMinutesToProof)} median to proof`,
      },
      ...allModels.map((m) => {
        const xs = attemptsOn(m);
        return {
          id: m,
          name: MODEL_LABELS[m] ?? m,
          kind: "one-shot",
          provider: manualModels[m] ? "Google Antigravity CLI" : "IBM watsonx.ai",
          answered: xs.length,
          ...tally(perBug.map((p) => p.models[m])),
          medianSeconds: round2(median(xs.map((x) => x.seconds))),
          medianTokens: Math.round(median(xs.map((x) => (x.promptTokens ?? 0) + (x.completionTokens ?? 0)))),
        };
      }),
    ],
    perBug,
  };
}

const generatedAt = new Date().toISOString();
mkdirSync(path.join(root, "apps/web/src/data"), { recursive: true });
writeFileSync(path.join(root, "apps/web/src/data/benchmark.json"), JSON.stringify({ generatedAt, summary, cases, comparison }, null, 2) + "\n");

const s = summary;
const row = (cells) => `| ${cells.join(" | ")} |`;

function comparisonMd(cmp) {
  const n = cmp.bugs.length;
  const mark = (ok) => (ok ? "✅" : "❌");
  const cell = (x) => (x.answered === false ? "no answer" : `${mark(x.fixWithProof)} fix with proof · ${mark(x.culpritCorrect)} culprit`);
  const models = cmp.contenders.filter((c) => c.kind === "one-shot");
  const cimex = cmp.contenders.find((c) => c.kind === "pipeline");
  const t = cmp.oneShotTotals;
  return [
    "## Compared with one-shot models",
    "",
    `Each model got **one** answer per bug (from ${cmp.askedOn}). ${models.filter((m) => m.provider === "IBM watsonx.ai").length} models ran on IBM watsonx.ai (${cmp.region}, temperature ${cmp.temperature});`,
    `${models.filter((m) => m.provider !== "IBM watsonx.ai").map((m) => m.name).join(" and ")} ran through the Google Antigravity CLI 1.2.11 in headless mode (\`agy -p\`).`,
    "Each received the bug report,",
    "every file under `src/` at the commit Bob's fix was applied to, and the git history with the `src/` files each commit changed, and",
    "had to name the culprit commit, return the fixed files and write a regression test. Bob's committed fixes and the models' answers",
    "are scored by the same script (`scripts/model-baseline.mjs`) in a clean worktree of the demo repo:",
    "",
    "- **Fixed**: the answer key's independent probe for that bug passes (`docs/answer-key/bug-probes.test.ts`; neither Bob nor any model wrote it).",
    "- **Nothing broken**: every existing test still passes.",
    "- **Own test RED→GREEN**: the contender's own test fails on the unfixed code and passes with its fix.",
    "- **Fix with proof**: all three of the above.",
    "- **Culprit**: the named commit has the answer key's commit subject.",
    "",
    `**Across all ${t.answers} one-shot answers:** ${t.complete} named a culprit and returned a fix and a test. ${t.fixed} of the fixes`,
    `fixed the bug, ${t.fixWithProof} came with a test that proves it, ${t.brokeTests} broke existing tests, and ${t.culpritCorrect} named the right culprit.`,
    "",
    row(["Contender", "Fixed", "Nothing broken", "Own test RED→GREEN", "Fix with proof", "Culprit correct", "Cost / time"]),
    row(Array(7).fill("---")),
    ...cmp.contenders.map((c) =>
      row([
        c.kind === "pipeline" ? `**${c.name}**` : `${c.name} (one shot)`,
        `${c.fixed}/${n}`,
        `${c.suiteGreen}/${n}`,
        `${c.proofTest}/${n}`,
        `**${c.fixWithProof}/${n}**`,
        c.kind === "pipeline" ? `${c.culpritCorrect}/${n} (${c.culpritDuringRun}/${n} during the run)` : `${c.culpritCorrect}/${n}`,
        c.kind === "pipeline" ? `${c.cost}; ${c.time}` : `${c.medianTokens.toLocaleString("en-US")} tokens, ${c.medianSeconds} s per answer (median)`,
      ]),
    ),
    "",
    row(["Bug", "Cimex Fix", ...models.map((m) => m.name)]),
    row(Array(models.length + 2).fill("---")),
    ...cmp.perBug.map((p) => row([`#${p.bug} ${p.title}`, cell(p.cimex), ...models.map((m) => cell(p.models[m.id]))])),
    "",
    "**Read this fairly**",
    "",
    "- The models were handed every file under `src/` up front; Bob started from the report alone and had to find the code.",
    "- Bob read the two screenshots as images; the models got their visible text, transcribed without interpretation",
    "  (`SCREENSHOT_TEXT` in the script). For bug #3 the models got the Markdown source of the QA report PDF.",
    "- Gemini and Claude Opus ran through Google's Antigravity CLI, not watsonx.ai: same prompt file, one fresh session per bug, in a folder",
    "  that held only the 8 prompts; commands were auto-denied and no run was refused a tool. Temperature can't be set there, and both are",
    "  thinking models. A first Opus batch run 8-at-once ended with \"stream was interrupted\" errors, so it was discarded unscored and every bug",
    "  was asked again one at a time (all 8 completed).",
    "- One answer per model is a single sample, not an average over tries. Exact prompts and raw answers are in",
    "  `docs/benchmark/model-baseline/`.",
    "- The models could not run code; Bob ran tests and `git bisect`. The comparison shows what one answer gets right without that loop.",
    `- Bob's culprit count is the final result; ${cimex.culpritDuringRun}/${n} were named during the runs themselves (see the bisect caveat below).`,
    cmp.controlsOk
      ? "- Control: every bug's probe fails on the unfixed code, so a passing probe means the bug was fixed."
      : "- ⚠️ Control failed: at least one probe passed on the unfixed code; its bug's results are not meaningful.",
    "",
  ];
}
const md = [
  "# Benchmark — Cimex Fix on the ShopLite demo repo",
  "",
  `_Generated ${generatedAt.slice(0, 16).replace("T", " ")} UTC by \`scripts/build-benchmark.mjs\` from the exported case events`,
  "(`apps/web/data/cases/*.json`), IBM Bob's task log (`docs/benchmark/bob-runs.json`) and the answer key",
  "(`docs/answer-key/bugs.md`). Do not edit by hand: re-run `node scripts/export-cases.mjs && node scripts/build-benchmark.mjs`._",
  "",
  "## Headline numbers",
  "",
  `- **Bugs attempted:** ${s.bugsAttempted} · **proven:** ${s.proven} · **unproven:** ${s.unproven}`,
  `- **Culprit commit matches the answer key:** ${s.culpritCorrect}/${s.bugsAttempted} (${s.culpritCorrectByBisect} established by \`git bisect\`, ${s.culpritCorrect - s.culpritCorrectByBisect} named by the Historian from git history)`,
  `- **Culprit named correctly during the run itself:** ${s.liveCulpritCorrect}/${s.bugsAttempted} — bisect found it live in ${s.culpritByLiveBisect} run${s.culpritByLiveBisect === 1 ? "" : "s"}; earlier runs hit a bisect bug (see caveats) and were re-bisected afterwards`,
  `- **Median time to a failing (RED) reproduction test:** ${mmss(s.medianMinutesToRed)}`,
  `- **Median time to proof:** ${mmss(s.medianMinutesToProof)} (fastest ${mmss(s.fastestMinutesToProof)}; includes time runs waited on a human)`,
  s.liveBisectRun
    ? `- **Run after the pipeline fixes (bug #${s.liveBisectRun.bug}):** culprit by bisect at ${mmss(s.liveBisectRun.minutesToCulprit)}, proven at ${mmss(s.liveBisectRun.minutesToProof)}, ${s.liveBisectRun.humanInterventions} human interventions, ${s.liveBisectRun.coins} Bobcoins`
    : "",
  `- **Runs with zero human interventions:** ${s.runsWithoutHumanIntervention}/${s.bugsAttempted}`,
  `- **Runs where the Lead handed off to the Reproducer, Fixer and Critic as Bob subtasks:** ${s.fullHandoffBugs.length}/${s.bugsAttempted} (${s.fullHandoffBugs.map((b) => `#${b}`).join(", ")}); ` +
    Object.entries(s.handoffsByBug).filter(([, h]) => h.startSubtask < 3).map(([b, h]) => `#${b}: ${h.startSubtask} subtask${h.startSubtask === 1 ? "" : "s"}, ${h.spawnSubagent} subagents`).join(" · ") +
    " — in those early runs the remaining steps ran in one chat or as generic subagents, because the worker modes could not hand back until the pack was fixed",
  s.recheck
    ? `- **Re-checking a proof from scratch (bug #${s.recheck.bug}, the "verify it yourself" commands):** ${s.recheck.seconds.total} s — fresh clone ${s.recheck.seconds.clone} s, \`npm ci\` ${s.recheck.seconds.npmCi} s, repro test on the code before the fix ${s.recheck.seconds.redRun} s (${s.recheck.redFailed} failed), on the fix ${s.recheck.seconds.greenRun} s (${s.recheck.greenPassed} passed); measured ${s.recheck.measuredAt.slice(0, 10)} on ${s.recheck.machine} by \`scripts/measure-recheck.mjs\``
    : "",
  `- **Bobcoins per run:** median ${s.coinsPerRunMedian} (range ${s.coinsPerRunMin}–${s.coinsPerRunMax}) · all ${s.bugsAttempted} runs ${s.coinsRuns} · follow-up re-bisects ${s.coinsFollowUps} · building the Bob pack ${s.coinsSetup} · every Bob task ${s.coinsAllTasks}`,
  `- **Largest suite in a run's GREEN evidence:** ${s.testsInSuiteAtEnd} tests, all passing (each proven bug added its repro test)`,
  `- **Fixes that changed an existing test:** ${s.fixesChangingExistingTests}/${s.fixesCheckedForTestChanges} (\`git diff --name-status <fix>~1 <fix> -- tests\` in the demo repo${s.fixesChangingExistingTests === 0 ? ": each fix commit only adds its repro test" : ""})`,
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
  ...(comparison ? comparisonMd(comparison) : []),
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
  "- Bug #8 arrived as a screenshot, but the Lead opened its case with source \"issue\", so the live site labels that case Issue.",
  "- Bug #8's RED/GREEN evidence recorded 0 tests (`run_tests` hit the same bug); its tests-after comes from the FIX_GREEN milestone.",
  "  Bug #4's early run attached no RED/GREEN evidence (early MCP version); same fallback.",
  "- **Manual baseline: not measured yet** — no human-vs-Bob time comparison is claimed.",
  notAttempted.length
    ? `- ${notAttempted.map((n) => `Bug #${n}`).join(" and ")} ${notAttempted.length === 1 ? "was" : "were"} not attempted (Bobcoin budget).`
    : "- Every bug in the answer key was attempted.",
  "",
].filter((l) => l !== null).join("\n");
writeFileSync(path.join(root, "docs/benchmark.md"), md);
console.log(`docs/benchmark.md and apps/web/src/data/benchmark.json written — ${s.proven}/${s.bugsAttempted} proven, culprits ${s.culpritCorrect}/${s.bugsAttempted}`);
