import * as child_process from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// When the repro test goes RED, every file under tests/ and the Vitest config is hashed into a lock file.
// publish_proof re-hashes them and refuses "proven" if any changed or no lock exists, so a changed test blocks the
// proof even when it was edited through the shell (the Fixer and Critic modes have the execute group; only Bob's
// edit tool is limited by fileRegex). The lock lives in the OS temp folder, outside the repo and every mode's edit scope.

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
  files: Record<string, string>;
}

export interface TestCheck {
  locked: boolean;
  lockedAt?: string;
  files: number;
  changed: string[];
  removed: string[];
  added: string[];
}

function testFiles(repoPath: string): string[] {
  const r = child_process.spawnSync("git", ["ls-files", "-co", "--exclude-standard", "--", ...LOCKED_PATHS], {
    cwd: repoPath,
    encoding: "utf8",
    windowsHide: true,
  });
  if (r.status !== 0) return [];
  return r.stdout
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => f && fs.existsSync(path.join(repoPath, f)))
    .sort();
}

const hash = (repoPath: string, file: string) =>
  crypto.createHash("sha256").update(fs.readFileSync(path.join(repoPath, file))).digest("hex");

export function lockTests(repoPath: string, caseId: string): number {
  const files = testFiles(repoPath);
  const lock: Lock = {
    caseId,
    lockedAt: new Date().toISOString(),
    files: Object.fromEntries(files.map((f) => [f, hash(repoPath, f)])),
  };
  fs.mkdirSync(path.dirname(lockFile(repoPath, caseId)), { recursive: true });
  fs.writeFileSync(lockFile(repoPath, caseId), JSON.stringify(lock, null, 2));
  return files.length;
}

export function checkTests(repoPath: string, caseId: string): TestCheck {
  let lock: Lock;
  try {
    lock = JSON.parse(fs.readFileSync(lockFile(repoPath, caseId), "utf8")) as Lock;
  } catch {
    return { locked: false, files: 0, changed: [], removed: [], added: [] };
  }
  // A lock left over from another case says nothing about this one.
  if (lock.caseId !== caseId) return { locked: false, files: 0, changed: [], removed: [], added: [] };

  const now = new Set(testFiles(repoPath));
  const locked = Object.keys(lock.files);
  const removed = locked.filter((f) => !now.has(f));
  const changed = locked.filter((f) => now.has(f) && hash(repoPath, f) !== lock.files[f]);
  const added = [...now].filter((f) => !(f in lock.files));
  return { locked: true, lockedAt: lock.lockedAt, files: locked.length, changed, removed, added };
}
