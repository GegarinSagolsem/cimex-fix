import "server-only";
import fs from "node:fs";
import path from "node:path";
import { TriageExampleRecord, TriageResult } from "@bugproof/shared";

/**
 * Shared helpers for POST /api/triage (Plan.md §4.4): the system prompt
 * sent to Granite, robust JSON extraction from its reply, and the
 * "closest recorded example" fallback used once the IBM Cloud account
 * closes. scripts/record-triage-examples.mjs mirrors the system prompt
 * (it can't import this TS module directly).
 */

export const TRIAGE_SYSTEM_PROMPT = `You are a triage assistant for a software bug tracker. Given a raw bug report (an issue, a QA note, or a server log), extract a structured triage.

Respond with JSON only — no prose, no markdown code fences. The JSON object must have exactly these fields:
{
  "severity": "low" | "medium" | "high" | "critical",
  "component": string (short, e.g. "checkout/tax" or "catalog/search"),
  "expected": string (what should have happened),
  "actual": string (what actually happened),
  "stepsToReproduce": string[] (concise, numbered in order, no leading numbers),
  "missingInfo": string[] (what a developer would still need to ask for; [] if the report is complete),
  "suggestedIntake": "issue" | "log" | "screenshot" | "pdf" (the best way this bug should be filed)
}`;

/** Strips code fences and finds the first balanced {...} object in a string. */
export function extractJsonObject(raw: string): string | null {
  let text = raw.trim();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Parses + validates a Granite reply against TriageResult. Returns null on any failure. */
export function parseTriageResult(raw: string): TriageResult | null {
  const jsonText = extractJsonObject(raw);
  if (!jsonText) return null;
  try {
    const parsed: unknown = JSON.parse(jsonText);
    const result = TriageResult.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Picks the recorded example whose input text is closest to `text`. */
export function findClosestExample(
  text: string,
  examples: TriageExampleRecord[],
): TriageExampleRecord | null {
  if (examples.length === 0) return null;

  const inputTokens = tokenize(text);
  let best = examples[0];
  let bestScore = -1;
  for (const example of examples) {
    const score = jaccardSimilarity(inputTokens, tokenize(example.input));
    if (score > bestScore) {
      bestScore = score;
      best = example;
    }
  }
  return best;
}

let cachedExamples: TriageExampleRecord[] | null = null;

/** Loads apps/web/data/triage-examples.json (cached in memory). Never throws. */
export function loadTriageExamples(): TriageExampleRecord[] {
  if (cachedExamples) return cachedExamples;

  try {
    const filePath = path.join(process.cwd(), "data", "triage-examples.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedExamples = [];
      return cachedExamples;
    }
    cachedExamples = parsed
      .map((item) => TriageExampleRecord.safeParse(item))
      .filter((r): r is { success: true; data: TriageExampleRecord } => r.success)
      .map((r) => r.data);
  } catch {
    cachedExamples = [];
  }
  return cachedExamples;
}
