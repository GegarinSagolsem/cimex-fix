import fs from "node:fs";
import path from "node:path";
import { Case, Evidence, Event } from "@bugproof/shared";

/**
 * Static replay files: apps/web/data/cases/<id>.json, shape
 * {case, events, evidence}. These are a safety net so finished cases keep
 * working even if the live store (Redis) is empty/unreachable — the data
 * source merges store + static, and this module never writes to disk.
 */
export interface CaseDetail {
  case: Case;
  events: Event[];
  evidence: Evidence[];
}

const DATA_DIR = path.join(process.cwd(), "data", "cases");

function readJsonFile(filePath: string): unknown | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseDetail(raw: unknown): CaseDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const caseParsed = Case.safeParse(obj.case);
  if (!caseParsed.success) return null;
  const events = Array.isArray(obj.events)
    ? obj.events.map((e) => Event.safeParse(e)).filter((r) => r.success).map((r) => r.data)
    : [];
  const evidence = Array.isArray(obj.evidence)
    ? obj.evidence.map((e) => Evidence.safeParse(e)).filter((r) => r.success).map((r) => r.data)
    : [];
  return { case: caseParsed.data, events, evidence };
}

let cache: Map<string, CaseDetail> | null = null;

function loadAll(): Map<string, CaseDetail> {
  if (cache) return cache;
  const map = new Map<string, CaseDetail>();
  let files: string[] = [];
  try {
    files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    files = [];
  }
  for (const file of files) {
    const raw = readJsonFile(path.join(DATA_DIR, file));
    const detail = parseDetail(raw);
    if (detail) map.set(detail.case.id, detail);
  }
  cache = map;
  return map;
}

export function listStaticCases(): CaseDetail[] {
  return Array.from(loadAll().values());
}

export function getStaticCase(id: string): CaseDetail | null {
  return loadAll().get(id) ?? null;
}
