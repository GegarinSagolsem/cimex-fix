#!/usr/bin/env node
// Generates apps/web/data/triage-examples.json by actually calling Granite
// (Plan.md §4.4) on 4 realistic bug reports from
// C:\dev\bugproof-demo-shoplite\intake\. Loads .env.local itself so it can
// run standalone: `node scripts/record-triage-examples.mjs`.
//
// Mirrors the parsing/prompt logic in apps/web/src/lib/triage.ts +
// apps/web/src/lib/watsonx.ts (duplicated here since this is a plain Node
// script, not compiled TypeScript).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function loadDotEnvLocal() {
  const envPath = path.join(REPO_ROOT, ".env.local");
  let raw;
  try {
    raw = fs.readFileSync(envPath, "utf-8");
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnvLocal();

const { WATSONX_API_KEY, WATSONX_PROJECT_ID, WATSONX_URL, WATSONX_MODEL_ID } = process.env;

if (!WATSONX_API_KEY || !WATSONX_PROJECT_ID || !WATSONX_URL || !WATSONX_MODEL_ID) {
  console.error(
    "Missing one of WATSONX_API_KEY / WATSONX_PROJECT_ID / WATSONX_URL / WATSONX_MODEL_ID in .env.local",
  );
  process.exit(1);
}

const TRIAGE_SYSTEM_PROMPT = `You are a triage assistant for a software bug tracker. Given a raw bug report (an issue, a QA note, or a server log), extract a structured triage.

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

const VALID_SEVERITIES = ["low", "medium", "high", "critical"];
const VALID_INTAKES = ["issue", "log", "screenshot", "pdf"];

function extractJsonObject(raw) {
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

function validateTriageResult(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (!VALID_SEVERITIES.includes(obj.severity)) return null;
  if (typeof obj.component !== "string") return null;
  if (typeof obj.expected !== "string") return null;
  if (typeof obj.actual !== "string") return null;
  if (!Array.isArray(obj.stepsToReproduce) || !obj.stepsToReproduce.every((s) => typeof s === "string"))
    return null;
  if (!Array.isArray(obj.missingInfo) || !obj.missingInfo.every((s) => typeof s === "string")) return null;
  if (!VALID_INTAKES.includes(obj.suggestedIntake)) return null;
  return {
    severity: obj.severity,
    component: obj.component,
    expected: obj.expected,
    actual: obj.actual,
    stepsToReproduce: obj.stepsToReproduce,
    missingInfo: obj.missingInfo,
    suggestedIntake: obj.suggestedIntake,
  };
}

function parseTriageResult(raw) {
  const jsonText = extractJsonObject(raw);
  if (!jsonText) return null;
  try {
    return validateTriageResult(JSON.parse(jsonText));
  } catch {
    return null;
  }
}

async function getAccessToken() {
  const res = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ibm:params:oauth:grant-type:apikey",
      apikey: WATSONX_API_KEY,
    }),
  });
  if (!res.ok) {
    throw new Error(`IAM token request failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function chat(token, messages) {
  const res = await fetch(`${WATSONX_URL}/ml/v1/text/chat?version=2024-10-08`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      model_id: WATSONX_MODEL_ID,
      project_id: WATSONX_PROJECT_ID,
      messages,
      max_tokens: 800,
    }),
  });
  if (!res.ok) {
    throw new Error(`watsonx chat request failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("watsonx response missing choices[0].message.content");
  return content;
}

async function triage(token, text) {
  const messages = [
    { role: "system", content: TRIAGE_SYSTEM_PROMPT },
    { role: "user", content: text },
  ];
  const first = await chat(token, messages);
  let result = parseTriageResult(first);
  if (!result) {
    console.warn("  first reply did not parse, retrying once...");
    const retry = await chat(token, [
      ...messages,
      { role: "assistant", content: first },
      { role: "user", content: "Respond with JSON only, matching the schema exactly." },
    ]);
    result = parseTriageResult(retry);
  }
  if (!result) throw new Error("Granite reply did not parse as valid TriageResult after retry");
  return result;
}

const INTAKE_DIR = path.resolve(REPO_ROOT, "..", "bugproof-demo-shoplite", "intake");

const SOURCE_FILES = ["bug-02-issue.md", "bug-04-issue.md", "bug-05-issue.md", "bug-06-server.log"];

async function main() {
  console.log(`Requesting IAM access token...`);
  const token = await getAccessToken();
  console.log(`Got token. Reading ${SOURCE_FILES.length} bug reports from ${INTAKE_DIR}...`);

  const examples = [];
  for (const fileName of SOURCE_FILES) {
    const filePath = path.join(INTAKE_DIR, fileName);
    const text = fs.readFileSync(filePath, "utf-8").trim();
    console.log(`  triaging ${fileName} (${text.length} chars)...`);
    const result = await triage(token, text);
    examples.push({
      input: text,
      result,
      model: WATSONX_MODEL_ID,
      recordedAt: new Date().toISOString(),
    });
    console.log(`    -> severity=${result.severity} component=${result.component}`);
  }

  const outPath = path.join(REPO_ROOT, "apps", "web", "data", "triage-examples.json");
  fs.writeFileSync(outPath, JSON.stringify(examples, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${examples.length} examples to ${outPath}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
