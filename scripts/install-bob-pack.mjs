#!/usr/bin/env node
// Copies bob/pack/** into <targetRepo>/.bob/, creating directories as
// needed and overwriting files. Never touches any other file already in
// <targetRepo>/.bob/. Plan.md §4.1/§5.
//
// Usage: node scripts/install-bob-pack.mjs <targetRepo>

import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const PACK_DIR = path.join(REPO_ROOT, "bob", "pack");

function listFilesRecursive(dir) {
  /** @type {string[]} */
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".gitkeep") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  const targetRepo = process.argv[2];
  if (!targetRepo) {
    console.error("Usage: node scripts/install-bob-pack.mjs <targetRepo>");
    process.exit(1);
  }

  const targetRoot = path.resolve(targetRepo);
  if (!existsSync(targetRoot) || !statSync(targetRoot).isDirectory()) {
    console.error(`Target repo does not exist or is not a directory: ${targetRoot}`);
    process.exit(1);
  }

  const bobDir = path.join(targetRoot, ".bob");
  mkdirSync(bobDir, { recursive: true });

  const files = listFilesRecursive(PACK_DIR);

  if (files.length === 0) {
    console.log(`bob/pack/ is empty (nothing to install yet). Ensured ${bobDir} exists.`);
    return;
  }

  console.log(`Installing bob pack into ${bobDir}:`);
  for (const src of files) {
    const rel = path.relative(PACK_DIR, src);
    const dest = path.join(bobDir, rel);
    mkdirSync(path.dirname(dest), { recursive: true });
    if (rel === "mcp.json") {
      // Point the MCP server at the target repo (Bob may start it from another folder).
      const repo = path.resolve(bobDir, "..").split(path.sep).join("/");
      writeFileSync(dest, readFileSync(src, "utf8").replaceAll("__TARGET_REPO__", repo), "utf8");
    } else {
      copyFileSync(src, dest);
    }
    console.log(`  ${rel}`);
  }
  console.log(`Done — copied ${files.length} file(s).`);
}

main();
