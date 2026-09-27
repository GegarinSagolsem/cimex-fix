import * as child_process from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// When the repro test goes RED, every file under tests/ and the Vitest config is hashed into a lock file.
// publish_proof re-hashes them and refuses "proven" if any changed or no lock exists, so a changed test blocks the
// proof even when it was edited through the shell (the Fixer and Critic modes have the execute group; only Bob's
// edit tool is limited by fileRegex). The lock lives in the OS temp folder, outside the repo and every mode's edit scope.
//
// A later RED run re-takes the lock (the Reproducer may refine its test), so two more checks don't depend on it:
// - the commit at the first RED run is kept, and publish_proof refuses if any test that existed in that commit was
//   modified or deleted since (in the working tree or in a new commit) — existing tests can't be weakened at all;
// - every re-lock is counted and the files that changed between locks are reported on the case, as evidence.

const LOCKED_PATHS = ["tests", "vitest.config.ts", "vitest.config.mts", "vitest.config.js", "vitest.config.mjs"];

const lockFile = (repoPath: string, caseId: string) =>
  path.join(
    os.tmpdir(),
    "cimex-fix-test-locks",
    `${crypto.createHash("sha256").update(`${repoPath}\n${caseId}`).digest("hex").slice(0, 16)}.json`,
  );

interface Lock {
  caseId: string;
  lockedAt: string;
  firstLockedAt: string;
  baseCommit?: string;
  relocks: number;
  relockChanged: string[];
  files: Record<string, string>;
}

export interface TestCheck {
  locked: boolean;
  lockedAt?: string;
  baseCommit?: string;
  files: number;
  changed: string[];
  removed: string[];
  added: string[];
  existingChanged: string[];
  relocks: number;
  relockChanged: string[];
}

const git = (repoPath: string, args: string[]) =>
  child_process.spawnSync("git", args, { cwd: repoPath, encoding: "utf8", windowsHide: true });

function testFiles(repoPath: string): string[] {
  const r = git(repoPath, ["ls-files", "-co", "--exclude-standard", "--", ...LOCKED_PATHS]);
  if (r.status !== 0) return [];
  return r.stdout
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => f && fs.existsSync(path.join(repoPath, f)))
    .sort();
}

const hash = (repoPath: string, file: string) =>
  crypto.createHash("sha256").update(fs.readFileSync(path.join(repoPath, file))).digest("hex");

function readLock(repoPath: string, caseId: string): Lock | undefined {
  try {
    const lock = JSON.parse(fs.readFileSync(lockFile(repoPath, caseId), "utf8")) as Lock;
    // A lock left over from another case says nothing about this one.
    return lock.caseId === caseId ? lock : undefined;
  } catch {
    return undefined;
  }
}

// Tests that existed in the base commit and were modified, renamed or deleted since (committed or not).
function existingTestsChanged(repoPath: string, baseCommit: string | undefined): string[] {
  if (!baseCommit) return [];
  const r = git(repoPath, ["diff", "--name-status", baseCommit, "--", ...LOCKED_PATHS]);
  if (r.status !== 0) return [];
  return r.stdout
    .split("\n")
    .map((l) => l.trim().split("\t"))
    .filter(([status, file]) => file && !status.startsWith("A"))
    .map(([, file]) => file);
}

export function lockTests(repoPath: string, caseId: string): number {
  const files = testFiles(repoPath);
  const hashes = Object.fromEntries(files.map((f) => [f, hash(repoPath, f)]));
  const prev = readLock(repoPath, caseId);
  const head = git(repoPath, ["rev-parse", "HEAD"]);
  const now = new Date().toISOString();
  const changedSincePrev = prev
    ? Object.keys(prev.files).filter((f) => hashes[f] !== prev.files[f])
    : [];
  const lock: Lock = {
    caseId,
    lockedAt: now,
    firstLockedAt: prev?.firstLockedAt ?? now,
    baseCommit: prev ? prev.baseCommit : head.status === 0 ? head.stdout.trim() : undefined,
    relocks: prev ? prev.relocks + 1 : 0,
    relockChanged: [...new Set([...(prev?.relockChanged ?? []), ...changedSincePrev])].sort(),
    files: hashes,
  };
  fs.mkdirSync(path.dirname(lockFile(repoPath, caseId)), { recursive: true });
  fs.writeFileSync(lockFile(repoPath, caseId), JSON.stringify(lock, null, 2));
  return files.length;
}

export function checkTests(repoPath: string, caseId: string): TestCheck {
  const lock = readLock(repoPath, caseId);
  if (!lock) {
    return { locked: false, files: 0, changed: [], removed: [], added: [], existingChanged: [], relocks: 0, relockChanged: [] };
  }

  const now = new Set(testFiles(repoPath));
  const locked = Object.keys(lock.files);
  const removed = locked.filter((f) => !now.has(f));
  const changed = locked.filter((f) => now.has(f) && hash(repoPath, f) !== lock.files[f]);
  const added = [...now].filter((f) => !(f in lock.files));
  return {
    locked: true,
    lockedAt: lock.lockedAt,
    baseCommit: lock.baseCommit,
    files: locked.length,
    changed,
    removed,
    added,
    existingChanged: existingTestsChanged(repoPath, lock.baseCommit),
    relocks: lock.relocks ?? 0,
    relockChanged: lock.relockChanged ?? [],
  };
}
