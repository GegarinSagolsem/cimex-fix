#!/usr/bin/env node
// Posts a fake case + a handful of events to POST /api/ingest, for smoke
// testing the backend end to end. Plan.md §4.2 / §5.
//
// Usage: BUGPROOF_INGEST_TOKEN=xxx node scripts/send-test-events.mjs
// Env:
//   BUGPROOF_API_URL       default http://localhost:3000
//   BUGPROOF_INGEST_TOKEN  required — must match the server's env var

const API_URL = process.env.BUGPROOF_API_URL || "http://localhost:3000";
const TOKEN = process.env.BUGPROOF_INGEST_TOKEN;

if (!TOKEN) {
  console.error("Set BUGPROOF_INGEST_TOKEN to the same value the server uses.");
  process.exit(1);
}

const CASE_ID = `case_smoketest_${Date.now()}`;
const START = new Date();

function at(offsetSec) {
  return new Date(START.getTime() + offsetSec * 1000).toISOString();
}

async function post(body) {
  const res = await fetch(`${API_URL}/api/ingest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`POST /api/ingest -> ${res.status}: ${text}`);
  }
  return text;
}

async function main() {
  console.log(`Sending smoke-test case ${CASE_ID} to ${API_URL} ...`);

  await post({
    type: "case",
    case: {
      id: CASE_ID,
      repo: "bugproof-demo-shoplite",
      issue: "#smoke",
      title: "Smoke test: fake case from send-test-events.mjs",
      severity: "low",
      source: "issue",
      status: "investigating",
      startedAt: at(0),
    },
  });
  console.log("  case created");

  const events = [
    { caseId: CASE_ID, ts: at(1), agent: "lead", kind: "status", title: "Case opened" },
    { caseId: CASE_ID, ts: at(2), agent: "lead", kind: "spawn", title: "Spawned Triage" },
    { caseId: CASE_ID, ts: at(3), agent: "triage", kind: "tool", title: "Reading report" },
    { caseId: CASE_ID, ts: at(4), agent: "triage", kind: "evidence", title: "Triage report ready" },
    { caseId: CASE_ID, ts: at(5), agent: "lead", kind: "status", title: "Status -> investigating" },
  ];

  await post({ type: "events", caseId: CASE_ID, events });
  console.log(`  ${events.length} events appended`);

  console.log(`Done. GET ${API_URL}/api/cases/${CASE_ID} to inspect.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
