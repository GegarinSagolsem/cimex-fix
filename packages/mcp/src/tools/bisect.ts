import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as child_process from "node:child_process";
import { z } from "zod";
import { readActiveCaseId, resolveRepoPath, writeActiveCaseId } from "../session.js";
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

function run(cmd: string, args: string[], cwd: string): { stdout: string; stderr: string; status: number } {
  const result = child_process.spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    timeout: 120_000,
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}


function getRootCommit(repoPath: string): string {
  const r = run("git", ["rev-list", "--max-parents=0", "HEAD"], repoPath);
  return r.stdout.trim();
}

export async function bisect(cfg: Config, input: BisectInput) {
  const repoPath = resolveRepoPath(input.repoPath);
  const caseId = input.caseId ?? readActiveCaseId(repoPath);
  const bad = input.bad ?? "HEAD";

  // Read the test file contents into memory
  let testFileContent: string;
  try {
    testFileContent = fs.readFileSync(path.join(repoPath, input.testFile), "utf8");
  } catch (err) {
    return { ok: false, warning: `Cannot read testFile: ${String(err)}` };
  }

  // Create a temp directory for the git worktree
  const worktreeDir = path.join(os.tmpdir(), `bugproof-bisect-${Date.now()}`);
  let firstBadSha: string | undefined;
  let steps = 0;

  try {
    // Add the worktree at bad commit
    const wtResult = run("git", ["worktree", "add", "--detach", worktreeDir, bad], repoPath);
    if (wtResult.status !== 0) {
      return { ok: false, warning: `git worktree add failed: ${wtResult.stderr}` };
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
    // Exit codes for `git bisect run`: 0 = good (test passes), 1 = bad (assertion fails), 125 = skip.
    const runnerScript = path.join(os.tmpdir(), `bugproof-bisect-runner-${Date.now()}.mjs`);
    const vitestBin = path.join(repoPath, "node_modules", "vitest", "vitest.mjs");
    const testFileRel = input.testFile.replace(/\\/g, "/");
    fs.writeFileSync(
      runnerScript,
      `import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
const wt = ${JSON.stringify(worktreeDir)};
const rel = ${JSON.stringify(testFileRel)};
const file = join(wt, rel);
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, ${JSON.stringify(testFileContent)}, "utf8");
const r = spawnSync(process.execPath, [${JSON.stringify(vitestBin)}, "run", rel, "--reporter=dot", "--no-color"], { cwd: wt, encoding: "utf8", timeout: 90000 });
const out = (r.stdout ?? "") + (r.stderr ?? "");
if (r.status === 0) process.exit(0);
if (/SyntaxError|Cannot find module|ERR_MODULE_NOT_FOUND|Failed to load|does not provide an export/.test(out)) process.exit(125);
if (/AssertionError|expected /.test(out)) process.exit(1);
process.exit(125);
`,
      "utf8",
    );

    const goodCommit = input.good ?? getRootCommit(repoPath);
    run("git", ["bisect", "start", bad, goodCommit], worktreeDir);
    const bisectRun = child_process.spawnSync("git", ["bisect", "run", process.execPath, runnerScript], {
      cwd: worktreeDir,
      encoding: "utf8",
      timeout: 600_000,
    });
    const bisectOutput = (bisectRun.stdout ?? "") + (bisectRun.stderr ?? "");
    steps = (bisectOutput.match(/^running /gm) ?? []).length;
    const shaMatch = bisectOutput.match(/([0-9a-f]{7,40}) is the first '?bad'? commit/);
    if (shaMatch) firstBadSha = shaMatch[1];
    try { fs.unlinkSync(runnerScript); } catch { /* ignore */ }
  } finally {
    // Always reset bisect and remove worktree
    try { run("git", ["bisect", "reset"], worktreeDir); } catch { /* ignore */ }
    try { run("git", ["worktree", "remove", "--force", worktreeDir], repoPath); } catch { /* ignore */ }
    try { fs.rmSync(worktreeDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  if (!firstBadSha) {
    return { ok: false, warning: "bisect did not find a first-bad commit.", steps };
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
