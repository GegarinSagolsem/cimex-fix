import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as child_process from "node:child_process";
import { z } from "zod";
import { readActiveCaseId, resolveRepoPath } from "../session.js";
import type { Config } from "../config.js";
import { postIngest } from "../ingest.js";

export const bisectInput = z.object({
  testFile: z.string(),
  good: z.string().optional(),
  bad: z.string().optional().default("HEAD"),
  caseId: z.string().optional(),
  repoPath: z.string().optional(),
});

export type BisectInput = z.infer<typeof bisectInput>;

// Bob abandons an MCP call after roughly a minute, so bisect must finish well inside that.
const BISECT_BUDGET_MS = 45_000;
const MAX_SKIPS = 8;
const STALE_WORKTREE_MS = 10 * 60_000;

function run(cmd: string, args: string[], cwd: string): { stdout: string; stderr: string; status: number } {
  const result = child_process.spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    timeout: 120_000,
    windowsHide: true,
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}

// Async so the MCP server keeps answering other calls while tests run.
function runAsync(cmd: string, args: string[], cwd: string, timeoutMs: number): Promise<{ status: number | null; out: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = child_process.spawn(cmd, args, { cwd, windowsHide: true });
    let out = "";
    let timedOut = false;
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    const timer = setTimeout(() => {
      timedOut = true;
      // child.kill() on Windows leaves the runner and Vitest running; kill the whole tree.
      if (process.platform === "win32" && child.pid) run("taskkill", ["/pid", String(child.pid), "/T", "/F"], cwd);
      else child.kill("SIGKILL");
    }, timeoutMs);
    child.on("close", (status) => {
      clearTimeout(timer);
      resolve({ status, out, timedOut });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ status: null, out: out + String(err), timedOut });
    });
  });
}

function getRootCommit(repoPath: string): string {
  const r = run("git", ["rev-list", "--max-parents=0", "HEAD"], repoPath);
  return r.stdout.trim();
}

// A killed MCP server never reaches the finally block below, so earlier runs can leave worktrees behind.
// fs.rmSync unlinks the node_modules junction without following it.
function removeStaleWorktrees(repoPath: string) {
  const tmp = os.tmpdir();
  for (const name of fs.readdirSync(tmp)) {
    const match = name.match(/^bugproof-bisect-(?:runner-)?(\d+)(?:\.mjs|\.log)?$/);
    if (match && Date.now() - Number(match[1]) > STALE_WORKTREE_MS) {
      try { fs.rmSync(path.join(tmp, name), { recursive: true, force: true }); } catch { /* still in use */ }
    }
  }
  run("git", ["worktree", "prune"], repoPath);
}

function readSkipReasons(logFile: string): string[] {
  try {
    return fs
      .readFileSync(logFile, "utf8")
      .split("\n")
      .filter((l) => l.startsWith("skip\t"))
      .map((l) => l.slice(5));
  } catch {
    return [];
  }
}

export async function bisect(cfg: Config, input: BisectInput) {
  const repoPath = resolveRepoPath(input.repoPath);
  const caseId = input.caseId ?? readActiveCaseId(repoPath);
  // `good` is always the root commit: agents passing their own good refs produced wrong culprits.
  // `bad` may be given (e.g. the parent of an already-committed fix) but must fail the test (pre-flight).
  const bad = input.bad ?? "HEAD";

  // Read the test file contents into memory
  let testFileContent: string;
  try {
    testFileContent = fs.readFileSync(path.join(repoPath, input.testFile), "utf8");
  } catch (err) {
    return { ok: false, warning: `Cannot read testFile: ${String(err)}` };
  }

  removeStaleWorktrees(repoPath);

  const stamp = Date.now();
  const worktreeDir = path.join(os.tmpdir(), `bugproof-bisect-${stamp}`);
  const runnerScript = path.join(os.tmpdir(), `bugproof-bisect-runner-${stamp}.mjs`);
  const logFile = path.join(os.tmpdir(), `bugproof-bisect-${stamp}.log`);
  let firstBadSha: string | undefined;
  let steps = 0;

  try {
    const wtResult = run("git", ["worktree", "add", "--detach", worktreeDir, bad], repoPath);
    if (wtResult.status !== 0) {
      return { ok: false, warning: `git worktree add failed for bad=${bad}: ${wtResult.stderr.trim()}` };
    }

    // Link node_modules from repoPath into the worktree
    const srcNodeModules = path.join(repoPath, "node_modules");
    const dstNodeModules = path.join(worktreeDir, "node_modules");
    if (fs.existsSync(srcNodeModules) && !fs.existsSync(dstNodeModules)) {
      try {
        fs.symlinkSync(srcNodeModules, dstNodeModules, "junction");
      } catch {
        // non-fatal: vitest may still work
      }
    }

    // Runner script: write the repro test into the checked-out commit and run Vitest directly.
    // Exit codes for `git bisect run`: 0 = good (test passes), 1 = bad (assertion fails),
    // 125 = skip (cannot test this commit), 128 = abort (too many skips: the harness itself is broken).
    const vitestBin = path.join(repoPath, "node_modules", "vitest", "vitest.mjs");
    const testFileRel = input.testFile.replace(/\\/g, "/");
    fs.writeFileSync(
      runnerScript,
      `import { writeFileSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
const wt = ${JSON.stringify(worktreeDir)};
const rel = ${JSON.stringify(testFileRel)};
const log = ${JSON.stringify(logFile)};
const file = join(wt, rel);
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, ${JSON.stringify(testFileContent)}, "utf8");
const r = spawnSync(process.execPath, [${JSON.stringify(vitestBin)}, "run", rel, "--reporter=dot", "--no-color"], { cwd: wt, encoding: "utf8", timeout: 30000, windowsHide: true });
const out = (r.stdout ?? "") + (r.stderr ?? "");
const lines = out.split("\\n");
const reason = (lines.find((l) => /Error/.test(l)) ?? lines.find((l) => /No test files|FAIL/.test(l)) ?? out.trim().split("\\n")[0] ?? "").trim().slice(0, 200);
let verdict = 125;
if (r.status === 0) verdict = 0;
else if (/SyntaxError|Cannot find module|ERR_MODULE_NOT_FOUND|Failed to load|does not provide an export/.test(out)) verdict = 125;
else if (/AssertionError|expected /.test(out)) verdict = 1;
if (verdict === 125) {
  appendFileSync(log, "skip\\t" + reason + "\\n");
  let skips = 0;
  try { skips = readFileSync(log, "utf8").split("\\n").filter((l) => l.startsWith("skip\\t")).length; } catch {}
  if (skips > ${MAX_SKIPS}) process.exit(128);
}
process.exit(verdict);
`,
      "utf8",
    );

    // Pre-flight: the test must fail on an assertion at `bad`, or bisect has nothing valid to search.
    const preflight = await runAsync(process.execPath, [runnerScript], worktreeDir, 40_000);
    if (preflight.status !== 1) {
      const reason = readSkipReasons(logFile)[0] ?? "";
      return {
        ok: false,
        steps,
        warning:
          preflight.status === 0
            ? `The test passes at bad=${bad}, so there is no regression to bisect. If the fix is already committed, pass bad=<fix commit>^.`
            : `The test cannot run in the bisect worktree at bad=${bad}${reason ? `: ${reason}` : ""}`,
      };
    }
    try { fs.unlinkSync(logFile); } catch { /* ignore */ }

    const goodCommit = getRootCommit(repoPath);
    run("git", ["bisect", "start", bad, goodCommit], worktreeDir);
    const bisectRun = await runAsync("git", ["bisect", "run", process.execPath, runnerScript], worktreeDir, BISECT_BUDGET_MS);
    steps = (bisectRun.out.match(/^running /gm) ?? []).length;
    const shaMatch = bisectRun.out.match(/([0-9a-f]{7,40}) is the first '?bad'? commit/);
    if (shaMatch) firstBadSha = shaMatch[1];

    if (!firstBadSha) {
      const skipReasons = readSkipReasons(logFile);
      const why = bisectRun.timedOut
        ? `bisect exceeded its ${BISECT_BUDGET_MS / 1000}s budget`
        : skipReasons.length > MAX_SKIPS
          ? `aborted after ${skipReasons.length} untestable commits`
          : "bisect did not find a first-bad commit";
      return {
        ok: false,
        steps,
        skipped: skipReasons.length,
        warning: skipReasons.length ? `${why}; first skip reason: ${skipReasons[0]}` : why,
      };
    }
  } finally {
    // Always reset bisect and remove worktree
    try { run("git", ["bisect", "reset"], worktreeDir); } catch { /* ignore */ }
    try { run("git", ["worktree", "remove", "--force", worktreeDir], repoPath); } catch { /* ignore */ }
    try { fs.rmSync(worktreeDir, { recursive: true, force: true }); } catch { /* ignore */ }
    try { fs.unlinkSync(runnerScript); } catch { /* ignore */ }
    try { fs.unlinkSync(logFile); } catch { /* ignore */ }
  }

  if (!firstBadSha) return { ok: false, steps, warning: "bisect did not find a first-bad commit." };
  if (getRootCommit(repoPath).startsWith(firstBadSha.slice(0, 7))) {
    // the root commit is the assumed-good baseline, never a real culprit
    return { ok: false, steps, warning: "bisect blamed the root commit, which is the assumed-good baseline." };
  }

  // Get commit info
  const logResult = run(
    "git",
    ["log", "-1", "--format=%H%n%s%n%an%n%ai", firstBadSha],
    repoPath
  );
  const [sha = firstBadSha, subject = "", author = "", date = ""] = logResult.stdout.trim().split("\n");

  // Get diff (stat + patch, trimmed to 6000 chars)
  const diffResult = run("git", ["show", "--stat", "-p", sha], repoPath);
  const diff = (diffResult.stdout + diffResult.stderr).slice(0, 6000);

  // Record evidence
  if (caseId) {
    await postIngest(cfg, {
      type: "evidence",
      caseId,
      evidence: {
        caseId,
        kind: "culprit",
        data: { sha, subject, author, date, diff, steps },
      },
    });
  }

  return {
    ok: true,
    sha,
    subject,
    author,
    date,
    diff,
    steps,
    ...(caseId ? { caseId } : {}),
  };
}
