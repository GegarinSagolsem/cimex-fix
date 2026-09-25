import { z } from "zod";
import { EvidenceKind } from "@bugproof/shared";
import type { Config } from "../config.js";
import { postIngest } from "../ingest.js";
import { readActiveCaseId, resolveRepoPath } from "../session.js";

export const evidenceInput = z.object({
  kind: EvidenceKind,
  data: z.record(z.string(), z.unknown()),
  caseId: z.string().optional(),
  repoPath: z.string().optional(),
});

export type EvidenceInput = z.infer<typeof evidenceInput>;

export async function evidence(cfg: Config, input: EvidenceInput) {
  const repoPath = resolveRepoPath(input.repoPath);
  const caseId = input.caseId ?? readActiveCaseId(repoPath);
  if (!caseId) return { ok: false, warning: "No caseId given and no active case found. Call open_case first." };
  const res = await postIngest(cfg, { type: "evidence", caseId, evidence: { caseId, kind: input.kind, data: input.data } });
  return { ok: true, caseId, kind: input.kind, ...(res && typeof res === "object" ? { ingest: res } : {}) };
}
