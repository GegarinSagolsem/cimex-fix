import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { z } from "zod";
import { CaseSource, CaseSeverity } from "@bugproof/shared";
import type { Config } from "../config.js";
import { postIngest } from "../ingest.js";

export const openCaseInput = z.object({
  title: z.string().min(1),
  source: CaseSource,
  severity: CaseSeverity.optional(),
  repo: z.string().optional(),
  repoPath: z.string().optional(),
});

export type OpenCaseInput = z.infer<typeof openCaseInput>;

function makeId(): string {
  const now = new Date();
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = crypto.randomBytes(2).toString("hex").slice(0, 4);
  return `case_${yyyymmdd}_${rand}`;
}

export async function openCase(cfg: Config, input: OpenCaseInput) {
  const repoPath = input.repoPath ?? process.cwd();
  const id = makeId();
  const now = new Date().toISOString();

  const caseObj = {
    id,
    repo: input.repo ?? path.basename(repoPath),
    issue: id,
    title: input.title,
    severity: input.severity ?? "medium" as const,
    source: input.source,
    status: "investigating" as const,
    startedAt: now,
  };

  const result = await postIngest(cfg, { type: "case", case: caseObj });

  // Write active-case file
  const bugproofDir = path.join(repoPath, ".bugproof");
  let writeWarning: string | undefined;
  try {
    fs.mkdirSync(bugproofDir, { recursive: true });
    fs.writeFileSync(path.join(bugproofDir, "active-case"), id, "utf8");
  } catch (err) {
    writeWarning = `Warning: could not write .bugproof/active-case: ${String(err)}`;
  }

  return {
    caseId: id,
    url: `${cfg.apiUrl}/cases/${id}`,
    ...(result.ok ? {} : { warning: result.error }),
    ...(writeWarning ? { writeWarning } : {}),
  };
}
