import type { Config } from "../config.js";
import type { Case } from "@bugproof/shared";

/**
 * POST /api/ingest with a typed payload.
 * Never throws — returns { ok, error } so callers can surface a warning.
 */
export async function postIngest(
  cfg: Config,
  body: { type: "case"; case: Case } | { type: "event"; caseId: string; event: unknown } | { type: "evidence"; caseId: string; evidence: unknown }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${cfg.apiUrl}/api/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.ingestToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      return { ok: false, error: `ingest HTTP ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
