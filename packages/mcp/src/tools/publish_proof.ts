import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { readActiveCaseId, resolveRepoPath, writeActiveCaseId } from "../session.js";
import type { Config } from "../config.js";

export const publishProofInput = z.object({
  summary: z.string().min(1),
  status: z.enum(["proven", "unproven"]),
  caseId: z.string().optional(),
  repoPath: z.string().optional(),
});

export type PublishProofInput = z.infer<typeof publishProofInput>;


export async function publishProof(cfg: Config, input: PublishProofInput) {
  const repoPath = resolveRepoPath(input.repoPath);
  const caseId = input.caseId ?? readActiveCaseId(repoPath);

  if (!caseId) {
    return { ok: false, warning: "No caseId provided and no active-case file found." };
  }

  try {
    const res = await fetch(`${cfg.apiUrl}/api/cases/${caseId}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.ingestToken}`,
      },
      body: JSON.stringify({ summary: input.summary, status: input.status }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      return {
        ok: false,
        warning: `publish HTTP ${res.status}: ${text}`,
        proofUrl: `${cfg.apiUrl}/cases/${caseId}`,
      };
    }

    return {
      ok: true,
      proofUrl: `${cfg.apiUrl}/cases/${caseId}`,
      caseId,
    };
  } catch (err) {
    return {
      ok: false,
      warning: `Network error during publish: ${String(err)}`,
      proofUrl: `${cfg.apiUrl}/cases/${caseId}`,
    };
  }
}
