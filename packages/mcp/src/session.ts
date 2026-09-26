import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// Bob may start the MCP server from its own install folder, so never trust process.cwd() alone.
export function resolveRepoPath(repoPath?: string): string {
  const resolved = path.resolve(repoPath ?? process.env.BUGPROOF_REPO ?? process.cwd());
  // Bob passes "c:\...". Vitest then loads twice ("c:" and "C:") and every test errors with
  // "Cannot read properties of undefined (reading 'config')", so bisect skips every commit.
  return resolved.replace(/^[a-z]:/, (drive) => drive.toUpperCase());
}

const globalActiveCase = path.join(os.homedir(), ".bugproof", "active-case");

export function writeActiveCaseId(repoPath: string, id: string): string | undefined {
  let warning: string | undefined;
  for (const file of [path.join(repoPath, ".bugproof", "active-case"), globalActiveCase]) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, id, "utf8");
    } catch (err) {
      warning = `could not write ${file}: ${String(err)}`;
    }
  }
  return warning;
}

export function readActiveCaseId(repoPath: string): string | undefined {
  for (const file of [path.join(repoPath, ".bugproof", "active-case"), globalActiveCase]) {
    try {
      const id = fs.readFileSync(file, "utf8").trim();
      if (id) return id;
    } catch {
      /* try the next location */
    }
  }
  return undefined;
}
