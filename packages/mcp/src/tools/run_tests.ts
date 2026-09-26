import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as child_process from "node:child_process";
import { z } from "zod";
import { readActiveCaseId, resolveRepoPath, writeActiveCaseId } from "../session.js";
import type { Config } from "../config.js";
import { postIngest } from "../ingest.js";
import { lockTests } from "../testLock.js";

export const runTestsInput = z.object({
  file: z.string().optional(),
  expect: z.enum(["red", "green", "any"]).optional(),
  caseId: z.string().optional(),
  repoPath: z.string().optional(),
});

export type RunTestsInput = z.infer<typeof runTestsInput>;

interface VitestFailure {
  name: string;
  message: string;
}

interface VitestJsonReport {
  testResults?: Array<{
    assertionResults?: Array<{
      fullName?: string;
      title?: string;
      status: string;
      failureMessages?: string[];
      duration?: number;
    }>;
    status?: string;
    testFilePath?: string;
  }>;
  numPassedTests?: number;
  numFailedTests?: number;
  numTotalTests?: number;
  startTime?: number;
  success?: boolean;
}


function isAssertionFailure(msg: string): boolean {
  return msg.includes("AssertionError") || msg.includes("expected");
}

export async function runTests(cfg: Config, input: RunTestsInput) {
  const repoPath = resolveRepoPath(input.repoPath);
  const caseId = input.caseId ?? readActiveCaseId(repoPath);
  const tmpFile = path.join(os.tmpdir(), `bugproof-vitest-${Date.now()}.json`);

  let stdout = "";
  let stderr = "";
  let exitCode = 0;
  const startMs = Date.now();

  try {
    const args = ["vitest", "run"];
    if (input.file) args.push(input.file);
    args.push("--reporter=json", `--outputFile=${tmpFile}`);

    const result = child_process.spawnSync("npx", args, {
      cwd: repoPath,
      encoding: "utf8",
      timeout: 120_000,
      shell: true,
    });
    stdout = result.stdout ?? "";
    stderr = result.stderr ?? "";
    exitCode = result.status ?? 1;
  } catch (err) {
    return { ok: false, warning: `Failed to spawn vitest: ${String(err)}` };
  }

  const durationMs = Date.now() - startMs;

  // Parse JSON report
  let report: VitestJsonReport = {};
  try {
    const raw = fs.readFileSync(tmpFile, "utf8");
    report = JSON.parse(raw) as VitestJsonReport;
  } catch {
    // vitest may not have written the file on a hard failure
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }

  const passed = report.numPassedTests ?? 0;
  const failed = report.numFailedTests ?? 0;
  const total = report.numTotalTests ?? passed + failed;

  // Collect failures (max 5, messages trimmed to 400 chars)
  const failures: VitestFailure[] = [];
  if (report.testResults) {
    outer:
    for (const suite of report.testResults) {
      for (const t of suite.assertionResults ?? []) {
        if (t.status === "failed") {
          const raw = (t.failureMessages ?? []).join("\n");
          failures.push({
            name: t.fullName ?? t.title ?? "unknown",
            message: raw.slice(0, 400),
          });
          if (failures.length >= 5) break outer;
        }
      }
    }
  }

  // Determine ok based on expect
  let ok = true;
  let reason: string | undefined;

  if (input.expect === "red") {
    if (failed === 0) {
      ok = false;
      reason = "Expected at least one failure but all tests passed.";
    } else {
      // Check for import/syntax/module errors
      const hasNonAssertionFailure = failures.some(
        (f) => !isAssertionFailure(f.message)
      );
      // Also check stderr for module resolution errors
      const hasSyntaxError =
        stderr.includes("SyntaxError") ||
        stderr.includes("Cannot find module") ||
        stderr.includes("ERR_MODULE_NOT_FOUND") ||
        stdout.includes("SyntaxError") ||
        stdout.includes("Cannot find module");

      if (hasNonAssertionFailure || hasSyntaxError) {
        ok = false;
        reason = "Test failure is not an assertion error (possible import/syntax/module error).";
      } else {
        ok = true;
      }
    }
  } else if (input.expect === "green") {
    ok = failed === 0;
    if (!ok) reason = `${failed} test(s) failed.`;
  }

  // A confirmed RED run locks the test files; publish_proof checks them against this snapshot.
  const testsLocked = input.expect === "red" && ok && caseId ? lockTests(repoPath, caseId) : undefined;

  // Record evidence when caseId is known
  if (caseId) {
    const evidenceKind =
      input.expect === "red" ? "red" :
      input.expect === "green" ? "green" :
      "suite";

    await postIngest(cfg, {
      type: "evidence",
      caseId,
      evidence: {
        caseId,
        kind: evidenceKind,
        data: { passed, failed, total, durationMs, failures, ...(testsLocked !== undefined ? { testsLocked } : {}) },
      },
    });
  }

  return {
    ok,
    passed,
    failed,
    total,
    durationMs,
    failures,
    ...(reason ? { reason } : {}),
    ...(testsLocked !== undefined ? { testsLocked } : {}),
    ...(caseId ? { caseId } : {}),
  };
}
