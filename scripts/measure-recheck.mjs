#!/usr/bin/env node
// Times how long a reviewer needs to re-check a Proof of Fix from scratch, using the exact "verify it yourself"
// commands for bug #5: fresh clone of the public demo repo, npm ci, the repro test on the code before the fix (must
// fail), then on the fix (must pass). Writes docs/benchmark/recheck.json, which scripts/build-benchmark.mjs reports.
//
// Usage: node scripts/measure-recheck.mjs

import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "https://github.com/GegarinSagolsem/bugproof-demo-shoplite";
const FIX = "6ff3e78";
const TEST = "tests/bugproof/bug-05-search-case.test.ts";

const dir = mkdtempSync(path.join(os.tmpdir(), "cimex-recheck-"));
const work = path.join(dir, "shoplite");
const run = (cmd, cwd = work) => execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const timed = (fn) => {
  const t = performance.now();
  const out = fn();
  return { seconds: Math.round((performance.now() - t) / 100) / 10, out };
};
const vitest = () => {
  try {
    return run(`npx vitest run ${TEST}`);
  } catch (e) {
    return `${e.stdout ?? ""}${e.stderr ?? ""}`; // a failing test exits non-zero; that's the RED step
  }
};
const count = (out, word) => Number(out.match(new RegExp(`Tests\\s+.*?(\\d+) ${word}`))?.[1] ?? 0);

try {
  const clone = timed(() => run(`git clone -q ${REPO} shoplite`, dir));
  const install = timed(() => run("npm ci --no-audit --no-fund --loglevel=error"));
  run(`git checkout -q ${FIX}~1`);
  run(`git checkout ${FIX} -- ${TEST}`);
  const red = timed(vitest);
  run(`git checkout -q -f ${FIX}`);
  const green = timed(vitest);

  const result = {
    measuredAt: new Date().toISOString(),
    bug: 5,
    fixCommit: FIX,
    commands: "README → Verify it yourself",
    machine: `${os.type()} ${os.release()}, ${os.cpus()[0]?.model?.trim()}, Node ${process.version}`,
    seconds: {
      clone: clone.seconds,
      npmCi: install.seconds,
      redRun: red.seconds,
      greenRun: green.seconds,
      total: Math.round((clone.seconds + install.seconds + red.seconds + green.seconds) * 10) / 10,
    },
    redFailed: count(red.out, "failed"),
    greenPassed: count(green.out, "passed"),
  };
  writeFileSync(path.join(root, "docs/benchmark/recheck.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
