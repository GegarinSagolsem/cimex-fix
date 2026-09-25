import "server-only";
import type { Case, Evidence, PlainSummary } from "@bugproof/shared";
import { watsonxChat, getWatsonxModelId } from "@/lib/watsonx";

/**
 * Proof-page plain-English summaries (Plan.md §4.4): a 3-sentence
 * "what broke / why / what changed" written for a non-technical manager,
 * generated once per case from its title + evidence and cached on the
 * Case forever. Never throws — POST /api/cases/[id]/publish skips this
 * silently on any failure.
 */

const SYSTEM_PROMPT = `You write short plain-English summaries of software bug fixes for a non-technical manager who has never seen the code. Given a bug's title and the evidence gathered while diagnosing and fixing it, write EXACTLY three sentences, in this order: (1) what broke, in terms a manager understands, (2) why it broke (the root cause), (3) what changed to fix it. No jargon, no code, no file paths, no markdown, no bullet points, no sentence count mentioned — just three plain sentences of prose.`;

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function describeEvidence(evidence: Evidence[]): string[] {
  const lines: string[] = [];

  const red = evidence.find((e) => e.kind === "red");
  if (red) lines.push(`Failing test before the fix: ${truncate(JSON.stringify(red.data), 400)}`);

  const culprit = evidence.find((e) => e.kind === "culprit");
  if (culprit) lines.push(`Commit that introduced the bug: ${truncate(JSON.stringify(culprit.data), 400)}`);

  const diff = evidence.find((e) => e.kind === "diff");
  if (diff) lines.push(`Code change (diff): ${truncate(JSON.stringify(diff.data), 600)}`);

  const green = evidence.find((e) => e.kind === "green");
  if (green) lines.push(`Passing test after the fix: ${truncate(JSON.stringify(green.data), 400)}`);

  const suite = evidence.find((e) => e.kind === "suite");
  if (suite) lines.push(`Full test suite result: ${truncate(JSON.stringify(suite.data), 300)}`);

  return lines;
}

function buildUserPrompt(caseData: Case, evidence: Evidence[]): string {
  const parts: string[] = [
    `Bug title: ${caseData.title}`,
    `Severity: ${caseData.severity}`,
  ];

  if (caseData.culprit) {
    parts.push(
      `Culprit commit subject: "${caseData.culprit.message}" by ${caseData.culprit.author}`,
    );
    if (caseData.culprit.diff) {
      parts.push(`Diff stat:\n${truncate(caseData.culprit.diff, 1500)}`);
    }
  }

  parts.push(...describeEvidence(evidence));

  if (caseData.metrics?.testsRun !== undefined) {
    parts.push(`Tests after fix: ${caseData.metrics.testsPassed ?? "?"}/${caseData.metrics.testsRun} passing.`);
  }

  return parts.join("\n\n");
}

/** Generates the plain-English proof summary for a case. Returns null on any failure. */
export async function generatePlainSummary(
  caseData: Case,
  evidence: Evidence[],
): Promise<PlainSummary | null> {
  try {
    const userPrompt = buildUserPrompt(caseData, evidence);
    const reply = await watsonxChat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 300 },
    );
    if (!reply) return null;

    const text = reply.trim();
    if (!text) return null;

    return {
      text,
      model: getWatsonxModelId() ?? "unknown",
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
