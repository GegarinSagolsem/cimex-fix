import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { AgentName, EventKind } from "@bugproof/shared";
import type { Config } from "../config.js";
import { postIngest } from "../ingest.js";

export const recordInput = z.object({
  agent: AgentName,
  kind: EventKind,
  title: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
  caseId: z.string().optional(),
  repoPath: z.string().optional(),
});

export type RecordInput = z.infer<typeof recordInput>;

function readActiveCaseId(repoPath: string): string | undefined {
  try {
    return fs.readFileSync(path.join(repoPath, ".bugproof", "active-case"), "utf8").trim();
  } catch {
    return undefined;
  }
}

export async function record(cfg: Config, input: RecordInput) {
  const repoPath = input.repoPath ?? process.cwd();
  const caseId = input.caseId ?? readActiveCaseId(repoPath);

  if (!caseId) {
    return { ok: false, warning: "No caseId provided and no active-case file found." };
  }

  const event = {
    caseId,
    ts: new Date().toISOString(),
    agent: input.agent,
    kind: input.kind,
    title: input.title,
    ...(input.data ? { data: input.data } : {}),
  };

  const result = await postIngest(cfg, { type: "event", caseId, event });

  return {
    ok: result.ok,
    caseId,
    ...(result.ok ? {} : { warning: result.error }),
  };
}
