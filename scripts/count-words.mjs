#!/usr/bin/env node
// Word counts for the length-limited sections of docs/submission.md.
// Usage: node scripts/count-words.mjs

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs", "submission.md");
const sections = readFileSync(file, "utf8").split(/^## /m).slice(1);
for (const section of sections) {
  const [title, ...body] = section.split("\n");
  const words = body.join(" ").replace(/[`*_>#|-]/g, " ").split(/\s+/).filter(Boolean).length;
  const limit = /Long description|Usage Statement/.test(title) ? 500 : null;
  console.log(`${title.padEnd(40)} ${String(words).padStart(4)} words${limit ? (words <= limit ? "  ✓ ≤ 500" : "  ✗ OVER 500") : ""}`);
}
