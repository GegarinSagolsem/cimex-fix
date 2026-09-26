#!/usr/bin/env node
// One-shot model baseline for docs/benchmark.md. Each IBM watsonx.ai model gets, once, the bug report, every
// file under src/ at the commit Bob's fix was applied to, and the git history, and must return a culprit
// commit, a fix and a regression test. Every answer — and Bob's own fix — is scored by the same checks:
//   probe    the answer key's independent probe for that bug passes (docs/answer-key/bug-probes.test.ts)
//   suite    every existing test still passes
//   red/green the contender's own test fails before its fix and passes after it
//   culprit  the named commit has the answer key's commit subject
// Raw answers are cached in docs/benchmark/model-baseline/, so re-scoring never calls a model again.
//
// Usage: node scripts/model-baseline.mjs [--models id,id] [--bugs 1,4] [--fresh] [--no-bob]

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Upper-case drive letter: a lower-case one makes Vitest load twice (see packages/mcp/src/session.ts).
const DEMO = "C:\\dev\\bugproof-demo-shoplite";
const OUT_DIR = path.join(ROOT, "docs", "benchmark", "model-baseline");
const RESULTS = path.join(ROOT, "docs", "benchmark", "model-baseline.json");
const VITEST = path.join(DEMO, "node_modules", "vitest", "vitest.mjs");
const MODEL_TEST = "tests/bugproof/model-repro.test.ts";

export const MODELS = [
  "ibm/granite-4-h-small",
  "meta-llama/llama-3-3-70b-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct-fp8",
  "mistralai/mistral-small-3-1-24b-instruct-2503",
  "openai/gpt-oss-120b",
];
// Models we can't call from here: their answers are pasted in by hand (one fresh chat per bug, no tools), saved as
// docs/benchmark/model-baseline/<id>/bug-0N.md, and then scored like the rest.
export const MANUAL_MODELS = {
  "google/gemini-3.1-pro-high": { via: "Antigravity CLI 1.2.11 headless (agy -p), one fresh session per bug in a folder holding only the prompts, commands auto-denied, default temperature" },
  "anthropic/claude-opus-4-6-thinking": { via: "Antigravity CLI 1.2.11 headless (agy -p), one fresh session per bug, run one after another, in a folder holding only the prompts, commands auto-denied, default temperature" },
};
const ALL_MODELS = [...MODELS, ...Object.keys(MANUAL_MODELS)];
const TEMPERATURE = 0;
const MAX_TOKENS = 16384;

// Bob read the two screenshots as images; text models get their visible text, transcribed without interpretation.
const SCREENSHOT_TEXT = {
  1: `Customer screenshot of the ShopLite cart panel (visible text transcribed):
Your cart
  Ceramic Coffee Mug   qty 1   ₹349.00   (₹349.00 each)
  Steel Water Bottle 1L   qty 1   ₹599.00   (₹599.00 each)
[COUPON CODE input: empty]  [Apply]
(an empty coupon chip with no text)  Remove all
Subtotal (2 items)   ₹948.00
Discount (NaN% off)   −₹NaN
GST (18%)   ₹170.64
Shipping   ₹49.00
Total   ₹NaN
Estimated delivery: Wed, 30 Sept. Orders after 8 PM IST ship the next day.
[Place order]`,
  8: `Customer screenshot of the ShopLite cart panel (visible text transcribed):
Your cart
  Bluetooth Speaker   qty 1   ₹2,499.00   (₹2,499.00 each)
[COUPON CODE input]  [Apply]
Applied coupon chips: DIWALI60  DIWALI60   Remove all
Subtotal (1 items)   ₹2,499.00
Discount (120% off)   −₹2,998.80
GST (18%)   ₹449.82
Shipping   Free
Total   -₹49.98
[Place order]`,
};
const INTAKE_FILE = {
  2: "intake/bug-02-issue.md",
  3: "intake/bug-03-qa-report.md", // the source of the PDF Bob received
  4: "intake/bug-04-issue.md",
  5: "intake/bug-05-issue.md",
  6: "intake/bug-06-server.log",
  7: "intake/bug-07-issue.md",
};
// Bug #2's fix is not committed yet; its base is the demo repo's HEAD when Bob started.
const BASE_FALLBACK = { 2: "f2a3033" };

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1]?.split(",");
};

function loadDotEnvLocal() {
  let raw;
  try {
    raw = fs.readFileSync(path.join(ROOT, ".env.local"), "utf-8");
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

function git(argv, cwd = DEMO) {
  const r = spawnSync("git", argv, { cwd, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git ${argv.join(" ")}: ${r.stderr.trim()}`);
  return r.stdout;
}

function answerKey() {
  const key = {};
  let bug;
  for (const line of fs.readFileSync(path.join(ROOT, "docs", "answer-key", "bugs.md"), "utf8").split(/\r?\n/)) {
    const heading = line.match(/^## (\d+)\. (.+)$/);
    if (heading) {
      bug = Number(heading[1]);
      key[bug] = { title: heading[2].replace(/`/g, "").replace(/\s*\(hero\)$/, "") };
    }
    const commit = line.match(/\*\*Commit:\*\* `([0-9a-f]+)` — `([^`]+)`/);
    if (commit && bug) key[bug].subject = commit[2];
  }
  return key;
}

function bugList() {
  const benchmark = JSON.parse(fs.readFileSync(path.join(ROOT, "apps", "web", "src", "data", "benchmark.json"), "utf8"));
  const key = answerKey();
  return Object.keys(key)
    .map(Number)
    .map((bug) => {
      const run = benchmark.cases.find((c) => c.bug === bug);
      const base = run?.fixCommit ? git(["rev-parse", "--short", `${run.fixCommit}~1`]).trim() : BASE_FALLBACK[bug];
      return { bug, title: key[bug].title, subject: key[bug].subject, base, fixCommit: run?.fixCommit ?? null, reproTest: run?.reproTest ?? null };
    })
    .filter((b) => b.base);
}

// --- the prompt -------------------------------------------------------------------------------------------

function buildPrompt(b) {
  const report = SCREENSHOT_TEXT[b.bug] ?? git(["show", `${b.base}:${INTAKE_FILE[b.bug]}`]);
  const files = git(["ls-tree", "-r", "--name-only", b.base, "--", "src"]).split("\n").filter((f) => f.endsWith(".ts"));
  const source = files.map((f) => `### ${f}\n\`\`\`ts\n${git(["show", `${b.base}:${f}`]).trimEnd()}\n\`\`\``).join("\n\n");
  const history = git(["log", "--date=short", "--format=@@%h %ad %s", "--name-only", b.base])
    .split("\n")
    .filter((l) => l.startsWith("@@") || l.startsWith("src/"))
    .map((l) => (l.startsWith("@@") ? l.slice(2) : `    ${l}`))
    .join("\n");

  const system =
    "You are an expert TypeScript engineer. You are fixing a reported bug in a repository. You cannot run code and you get exactly one answer.";
  const user = `Repository: ShopLite, a small TypeScript shop library (Node, ES modules, tested with Vitest).

## Bug report
${report.trim()}

## Source code (every file under src/)
${source}

## Git history (newest first; files changed under src/ are listed under each commit)
${history}

## Your task
1. Find the root cause of the reported bug.
2. Name the commit from the history above that introduced it.
3. Fix it with the smallest correct change to files under src/. Keep exported names and signatures unchanged.
4. Write a Vitest regression test that fails on the current code and passes after your fix. It will be saved as
   ${MODEL_TEST}; import from "vitest" and from "../../src/...".

Reply in exactly this format and nothing else:
CULPRIT: <short commit hash from the history>
ROOT CAUSE: <one or two sentences>
=== FILE src/path/to/file.ts ===
<the complete new content of the file>
=== END FILE ===
(one FILE block per source file you change; leave out unchanged files)
=== TEST ===
<the complete test file>
=== END TEST ===`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

// --- watsonx.ai -------------------------------------------------------------------------------------------

let token;
async function iamToken() {
  if (token) return token;
  const res = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ibm:params:oauth:grant-type:apikey", apikey: process.env.WATSONX_API_KEY }),
  });
  if (!res.ok) throw new Error(`IAM token: HTTP ${res.status}`);
  token = (await res.json()).access_token;
  return token;
}

async function ask(model, messages) {
  const started = Date.now();
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${process.env.WATSONX_URL}/ml/v1/text/chat?version=2024-10-08`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${await iamToken()}` },
      body: JSON.stringify({ model_id: model, project_id: process.env.WATSONX_PROJECT_ID, messages, max_tokens: MAX_TOKENS, temperature: TEMPERATURE }),
      signal: AbortSignal.timeout(600_000),
    });
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 15_000 * attempt));
      continue;
    }
    if (!res.ok) throw new Error(`watsonx ${model}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? "",
      finishReason: data.choices?.[0]?.finish_reason ?? null,
      promptTokens: data.usage?.prompt_tokens ?? null,
      completionTokens: data.usage?.completion_tokens ?? null,
      seconds: Math.round((Date.now() - started) / 100) / 10,
    };
  }
}

const stripFence = (s) => `${s.replace(/^\s*```[\w-]*\s*\n/, "").replace(/\n\s*```\s*$/, "").trimEnd()}\n`;

export function parseAnswer(raw) {
  const text = raw.replace(/\r\n/g, "\n");
  const files = [...text.matchAll(/^=== FILE:?\s*`?([^\s`]+?)`?\s*===\n([\s\S]*?)\n=== END FILE ===/gm)].map((m) => ({
    path: m[1].replace(/^\.?\//, ""),
    content: stripFence(m[2]),
  }));
  // An answer cut off by the token limit has no END TEST line; take the rest of the text.
  const test = text.match(/(?:^|\n)=== TEST ===\n([\s\S]*?)(?:\n=== END TEST ===|(?![\s\S]))/)?.[1];
  return {
    culprit: text.match(/CULPRIT:\s*\**`?([0-9a-f]{7,40})\b/i)?.[1]?.toLowerCase() ?? null,
    rootCause: text.match(/ROOT CAUSE:\s*\**\s*(.+)/i)?.[1]?.trim() ?? null,
    files,
    test: test?.trim() ? stripFence(test) : null,
  };
}

// --- scoring ----------------------------------------------------------------------------------------------

function worktree(bug) {
  const dir = path.join(os.tmpdir(), `cimex-baseline-${bug}`).replace(/^[a-z]:/, (d) => d.toUpperCase());
  if (!fs.existsSync(dir)) {
    git(["worktree", "add", "--detach", dir, "HEAD"]);
    fs.symlinkSync(path.join(DEMO, "node_modules"), path.join(dir, "node_modules"), "junction");
  }
  return dir;
}

function reset(dir, commit) {
  git(["checkout", "-f", "--detach", commit], dir);
  git(["clean", "-fdq"], dir);
}

function vitest(dir, argv) {
  const out = path.join(os.tmpdir(), `cimex-baseline-${process.pid}.json`);
  fs.rmSync(out, { force: true });
  spawnSync(process.execPath, [VITEST, "run", ...argv, "--reporter=json", `--outputFile=${out}`], {
    cwd: dir,
    encoding: "utf8",
    windowsHide: true,
    timeout: 180_000,
  });
  if (!fs.existsSync(out)) return { passed: 0, failed: 0, total: 0, loadErrors: 1 };
  const j = JSON.parse(fs.readFileSync(out, "utf8"));
  const loadErrors = j.testResults.filter((t) => t.status === "failed" && t.assertionResults.length === 0).length;
  return { passed: j.numPassedTests, failed: j.numFailedTests, total: j.numPassedTests + j.numFailedTests, loadErrors };
}

const red = (r) => r.failed > 0 && r.loadErrors === 0;
const green = (r) => r.total > 0 && r.failed === 0 && r.loadErrors === 0;

function runProbe(dir, bug) {
  fs.mkdirSync(path.join(dir, "docs"), { recursive: true });
  for (const f of ["bug-probes.test.ts", "vitest.probes.config.ts"]) fs.copyFileSync(path.join(ROOT, "docs", "answer-key", f), path.join(dir, "docs", f));
  const r = vitest(dir, ["--config", "docs/vitest.probes.config.ts", "-t", `#${bug} `]);
  fs.rmSync(path.join(dir, "docs", "bug-probes.test.ts"));
  fs.rmSync(path.join(dir, "docs", "vitest.probes.config.ts"));
  return r.passed === 1 && r.failed === 0 && r.loadErrors === 0;
}

function runSuite(dir) {
  const r = vitest(dir, []);
  return { ...r, ok: green(r) };
}

function commitSubject(sha) {
  const r = spawnSync("git", ["log", "-1", "--format=%s", `${sha}^{commit}`], { cwd: DEMO, encoding: "utf8", windowsHide: true });
  return r.status === 0 ? r.stdout.trim() : null;
}

function scoreAnswer(b, answer) {
  const dir = worktree(b.bug);
  reset(dir, b.base);
  const result = { red: false, green: false, probe: false, suite: null, filesChanged: [], rejectedFiles: [] };
  if (answer.test) {
    fs.mkdirSync(path.join(dir, "tests", "bugproof"), { recursive: true });
    fs.writeFileSync(path.join(dir, MODEL_TEST), answer.test);
    result.red = red(vitest(dir, [MODEL_TEST]));
  }
  for (const f of answer.files) {
    if (/^src\/[\w./-]+\.ts$/.test(f.path) && !f.path.includes("..")) {
      fs.mkdirSync(path.dirname(path.join(dir, f.path)), { recursive: true });
      fs.writeFileSync(path.join(dir, f.path), f.content);
      result.filesChanged.push(f.path);
    } else result.rejectedFiles.push(f.path);
  }
  if (result.filesChanged.length === 0) return result;
  if (answer.test) result.green = green(vitest(dir, [MODEL_TEST]));
  result.probe = runProbe(dir, b.bug);
  fs.rmSync(path.join(dir, MODEL_TEST), { force: true });
  result.suite = runSuite(dir);
  return result;
}

// The same checks on Bob's committed fix: its repro test at the base (RED) and at the fix (GREEN).
function scoreBob(b) {
  const dir = worktree(b.bug);
  reset(dir, b.base);
  const control = { probeFailsAtBase: !runProbe(dir, b.bug), suiteAtBase: runSuite(dir) };
  if (!b.fixCommit) return { control, bob: null };
  git(["checkout", b.fixCommit, "--", b.reproTest], dir);
  const bobRed = red(vitest(dir, [b.reproTest]));
  reset(dir, b.fixCommit);
  return {
    control,
    bob: { fixCommit: b.fixCommit, reproTest: b.reproTest, red: bobRed, green: green(vitest(dir, [b.reproTest])), probe: runProbe(dir, b.bug), suite: runSuite(dir) },
  };
}

// --- main -------------------------------------------------------------------------------------------------

async function main() {
  loadDotEnvLocal();
  const models = option("models") ?? ALL_MODELS;
  const bugs = bugList().filter((b) => !option("bugs") || option("bugs").includes(String(b.bug)));
  const results = fs.existsSync(RESULTS) ? JSON.parse(fs.readFileSync(RESULTS, "utf8")) : { attempts: [], bob: [] };
  fs.mkdirSync(path.join(OUT_DIR, "prompts"), { recursive: true });

  for (const b of bugs) {
    const messages = buildPrompt(b);
    fs.writeFileSync(path.join(OUT_DIR, "prompts", `bug-0${b.bug}.md`), messages.map((m) => `<!-- ${m.role} -->\n${m.content}`).join("\n\n"));

    if (!flag("no-bob")) {
      const s = scoreBob(b);
      results.bob = [...results.bob.filter((x) => x.bug !== b.bug), { bug: b.bug, base: b.base, ...s }];
      console.log(`#${b.bug} base ${b.base}: probe fails ${s.control.probeFailsAtBase}, suite ${s.control.suiteAtBase.passed}/${s.control.suiteAtBase.total}` + (s.bob ? ` | Bob: probe ${s.bob.probe}, red ${s.bob.red}, green ${s.bob.green}, suite ${s.bob.suite.passed}/${s.bob.suite.total}` : ""));
    }

    for (const model of models) {
      const rawFile = path.join(OUT_DIR, model.replace(/[/:]/g, "_"), `bug-0${b.bug}.md`);
      const metaFile = rawFile.replace(/\.md$/, ".meta.json");
      let meta;
      if (MANUAL_MODELS[model]) {
        if (!fs.existsSync(rawFile)) {
          console.log(`#${b.bug} ${model}: no answer yet — paste prompts/bug-0${b.bug}.md into a fresh chat and save the reply as ${path.relative(ROOT, rawFile)}`);
          continue;
        }
        if (!fs.existsSync(metaFile)) {
          fs.writeFileSync(metaFile, JSON.stringify({ via: MANUAL_MODELS[model].via, askedAt: fs.statSync(rawFile).mtime.toISOString() }, null, 2));
        }
        meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
      } else if (fs.existsSync(rawFile) && !flag("fresh")) {
        meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
      } else {
        try {
          const r = await ask(model, messages);
          fs.mkdirSync(path.dirname(rawFile), { recursive: true });
          fs.writeFileSync(rawFile, r.content);
          meta = { finishReason: r.finishReason, promptTokens: r.promptTokens, completionTokens: r.completionTokens, seconds: r.seconds, askedAt: new Date().toISOString() };
          fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
        } catch (err) {
          console.log(`#${b.bug} ${model}: ${err.message}`);
          continue;
        }
      }
      const answer = parseAnswer(fs.readFileSync(rawFile, "utf8"));
      const subject = answer.culprit ? commitSubject(answer.culprit) : null;
      const score = scoreAnswer(b, answer);
      const attempt = {
        bug: b.bug,
        model,
        base: b.base,
        ...meta,
        culprit: answer.culprit,
        culpritSubject: subject,
        culpritCorrect: subject === b.subject,
        rootCause: answer.rootCause,
        testWritten: Boolean(answer.test),
        ...score,
        rawFile: path.relative(ROOT, rawFile).replace(/\\/g, "/"),
      };
      results.attempts = [...results.attempts.filter((a) => !(a.bug === b.bug && a.model === model)), attempt];
      console.log(
        `#${b.bug} ${model.padEnd(50)} probe ${attempt.probe ? "PASS" : "fail"} · suite ${attempt.suite ? `${attempt.suite.passed}/${attempt.suite.total}` : "—"} · test red ${attempt.red} green ${attempt.green} · culprit ${attempt.culpritCorrect ? "correct" : answer.culprit ?? "none"} · ${meta.seconds}s ${meta.completionTokens ?? "?"} tok`,
      );
    }
    results.attempts.sort((a, b2) => a.bug - b2.bug || ALL_MODELS.indexOf(a.model) - ALL_MODELS.indexOf(b2.model));
    results.bob.sort((a, b2) => a.bug - b2.bug);
    fs.writeFileSync(RESULTS, `${JSON.stringify({ ...results, setup: { models: MODELS, manualModels: Object.fromEntries(Object.entries(MANUAL_MODELS).filter(([m]) => results.attempts.some((a) => a.model === m))), temperature: TEMPERATURE, maxTokens: MAX_TOKENS, region: process.env.WATSONX_URL } }, null, 2)}\n`);
  }

  for (const b of bugs) {
    const dir = path.join(os.tmpdir(), `cimex-baseline-${b.bug}`).replace(/^[a-z]:/, (d) => d.toUpperCase());
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  git(["worktree", "prune"]);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
