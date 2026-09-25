#!/usr/bin/env node
// (Re)generates the Granite plain-English proof summary for a case and
// writes it into its static replay file: apps/web/data/cases/<caseId>.json
// (Plan.md §4.4). Deliberately simple — only works against local static
// case files, not the deployed API / live store.
//
// Usage: node scripts/summarize-case.mjs case_hero_001

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

const caseId = process.argv[2];
if (!caseId) {
  console.error("Usage: node scripts/summarize-case.mjs <caseId>");
  process.exit(1);
}

if (!WATSONX_API_KEY || !WATSONX_PROJECT_ID || !WATSONX_URL || !WATSONX_MODEL_ID) {
  console.error(
    "Missing one of WATSONX_API_KEY / WATSONX_PROJECT_ID / WATSONX_URL / WATSONX_MODEL_ID in .env.local",
  );
  process.exit(1);
}

const SYSTEM_PROMPT = `You write short plain-English summaries of software bug fixes for a non-technical manager who has never seen the code. Given a bug's title and the evidence gathered while diagnosing and fixing it, write EXACTLY three sentences, in this order: (1) what broke, in terms a manager understands, (2) why it broke (the root cause), (3) what changed to fix it. No jargon, no code, no file paths, no markdown, no bullet points, no sentence count mentioned — just three plain sentences of prose.`;

function truncate(value, max) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function describeEvidence(evidence) {
  const lines = [];
  const find = (kind) => evidence.find((e) => e.kind === kind);

  const red = find("red");
  if (red) lines.push(`Failing test before the fix: ${truncate(JSON.stringify(red.data), 400)}`);

  const culprit = find("culprit");
  if (culprit) lines.push(`Commit that introduced the bug: ${truncate(JSON.stringify(culprit.data), 400)}`);

  const diff = find("diff");
  if (diff) lines.push(`Code change (diff): ${truncate(JSON.stringify(diff.data), 600)}`);

  const green = find("green");
  if (green) lines.push(`Passing test after the fix: ${truncate(JSON.stringify(green.data), 400)}`);

  const suite = find("suite");
  if (suite) lines.push(`Full test suite result: ${truncate(JSON.stringify(suite.data), 300)}`);

  return lines;
}

function buildUserPrompt(caseData, evidence) {
  const parts = [`Bug title: ${caseData.title}`, `Severity: ${caseData.severity}`];

  if (caseData.culprit) {
    parts.push(`Culprit commit subject: "${caseData.culprit.message}" by ${caseData.culprit.author}`);
    if (caseData.culprit.diff) parts.push(`Diff stat:\n${truncate(caseData.culprit.diff, 1500)}`);
  }

  parts.push(...describeEvidence(evidence));

  if (caseData.metrics?.testsRun !== undefined) {
    parts.push(
      `Tests after fix: ${caseData.metrics.testsPassed ?? "?"}/${caseData.metrics.testsRun} passing.`,
    );
  }

  return parts.join("\n\n");
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
  if (!res.ok) throw new Error(`IAM token request failed: ${res.status} ${await res.text()}`);
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
      max_tokens: 300,
    }),
  });
  if (!res.ok) throw new Error(`watsonx chat request failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("watsonx response missing choices[0].message.content");
  return content;
}

async function main() {
  const filePath = path.join(REPO_ROOT, "apps", "web", "data", "cases", `${caseId}.json`);
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const caseData = raw.case;
  const evidence = Array.isArray(raw.evidence) ? raw.evidence : [];

  console.log(`Requesting IAM access token...`);
  const token = await getAccessToken();

  console.log(`Summarizing "${caseData.title}"...`);
  const userPrompt = buildUserPrompt(caseData, evidence);
  const text = (
    await chat(token, [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ])
  ).trim();

  raw.case.plainSummary = {
    text,
    model: WATSONX_MODEL_ID,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(filePath, JSON.stringify(raw, null, 2) + "\n", "utf-8");
  console.log(`Wrote plainSummary to ${filePath}:\n\n${text}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
