#!/usr/bin/env node
// Saves every finished case (proven / unproven) from the live API as a static replay file,
// apps/web/data/cases/<id>.json with shape {case, events, evidence}. The site merges these with
// the live store, so finished cases keep working if Redis is empty or unreachable.
//
// Usage: node scripts/export-cases.mjs [baseUrl]

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = process.argv[2] ?? "https://bugproof-web.vercel.app";
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "apps", "web", "data", "cases");

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

const { cases } = await getJson(`${base}/api/cases`);
mkdirSync(outDir, { recursive: true });
for (const c of cases.filter((c) => c.status === "proven" || c.status === "unproven")) {
  const detail = await getJson(`${base}/api/cases/${c.id}`);
  writeFileSync(path.join(outDir, `${c.id}.json`), JSON.stringify(detail, null, 2) + "\n", "utf8");
  console.log(`${c.id}  ${detail.case.status}  events=${detail.events.length}  evidence=${detail.evidence.length}`);
}
