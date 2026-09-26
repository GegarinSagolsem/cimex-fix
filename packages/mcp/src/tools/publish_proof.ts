import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { readActiveCaseId, resolveRepoPath, writeActiveCaseId } from "../session.js";
import type { Config } from "../config.js";
import { postIngest } from "../ingest.js";
import { checkTests, type TestCheck } from "../testLock.js";

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

  let testIntegrity: TestCheck | undefined;
  if (input.status === "proven") {
    testIntegrity = checkTests(repoPath, caseId);
    const tampered = [...testIntegrity.changed, ...testIntegrity.removed];
    const title = !testIntegrity.locked
      ? "TESTS_UNCHECKED: no RED run was recorded by run_tests for this case"
      : tampered.length
        ? `TESTS_CHANGED: ${tampered.join(", ")} changed after the RED run; proof refused`
        : `TESTS_UNCHANGED: all ${testIntegrity.files} test files match the RED run`;
    await postIngest(cfg, {
      type: "event",
      caseId,
      event: { caseId, ts: new Date().toISOString(), agent: "lead", kind: "milestone", title, data: { ...testIntegrity } },
    });
    if (tampered.length) {
      return {
        ok: false,
        warning: `Refused to publish as proven: ${tampered.join(", ")} changed after the RED run. Restore the tests or publish as unproven.`,
        testIntegrity,
      };
    }
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
      ...(testIntegrity ? { testIntegrity } : {}),
    };
  } catch (err) {
    return {
      ok: false,
      warning: `Network error during publish: ${String(err)}`,
      proofUrl: `${cfg.apiUrl}/cases/${caseId}`,
    };
  }
}
