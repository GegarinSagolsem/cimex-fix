import { NextResponse, type NextRequest } from "next/server";
import { AgentName, Case, Evidence, Event } from "@bugproof/shared";
import { store } from "@/lib/store";

/**
 * POST /api/ingest. Bearer-token-protected sink for the
 * Bob pack (hooks + MCP). Batch-friendly: body may be a single message or
 * an array of messages. Always returns {ok:true} once authorized; a bad or
 * unrecognized individual item is stored best-effort / skipped, never a 500.
 */
export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function detectAgent(payload: Record<string, unknown>): AgentName {
  const candidates = [payload.agent, payload.mode, payload.subagent, payload.role];
  for (const c of candidates) {
    if (typeof c === "string") {
      const lower = c.toLowerCase() as AgentName;
      if ((AgentName.options as string[]).includes(lower)) return lower;
    }
  }
  return "lead";
}

function detectTitle(payload: Record<string, unknown>): string {
  if (typeof payload.title === "string") return payload.title;
  if (typeof payload.tool === "string") return `Tool: ${payload.tool}`;
  if (typeof payload.name === "string") return String(payload.name);
  if (typeof payload.event === "string") return String(payload.event);
  if (typeof payload.hook === "string") return String(payload.hook);
  return "Bob hook event";
}

/** Raw/unrecognized payload -> best-effort Event with kind "tool". Never throws. */
async function storeAsHookEvent(payload: unknown, headerCaseId: string | null): Promise<void> {
  const p = isRecord(payload) ? payload : {};
  const caseId =
    (typeof p.caseId === "string" && p.caseId) || (headerCaseId ?? "") || "case_unassigned";
  const ts = typeof p.ts === "string" ? p.ts : new Date().toISOString();

  const event = Event.safeParse({
    caseId,
    ts,
    agent: detectAgent(p),
    kind: "tool",
    title: detectTitle(p),
    data: { payload },
  });

  if (event.success) {
    await store.appendEvents(caseId, [event.data]);
  }
}

async function handleItem(item: unknown, headerCaseId: string | null): Promise<void> {
  if (!isRecord(item)) return;
  const type = item.type;

  try {
    switch (type) {
      case "event": {
        const caseId = typeof item.caseId === "string" ? item.caseId : "";
        if (!caseId || !isRecord(item.event)) return;
        const event = Event.parse({ ...item.event, caseId: item.event.caseId ?? caseId });
        await store.appendEvents(caseId, [event]);
        return;
      }
      case "events": {
        const caseId = typeof item.caseId === "string" ? item.caseId : "";
        if (!caseId || !Array.isArray(item.events)) return;
        const events: Event[] = [];
        for (const raw of item.events) {
          if (!isRecord(raw)) continue;
          const parsed = Event.safeParse({ ...raw, caseId: raw.caseId ?? caseId });
          if (parsed.success) events.push(parsed.data);
        }
        if (events.length) await store.appendEvents(caseId, events);
        return;
      }
      case "case": {
        if (!isRecord(item.case)) return;
        const c: Case = Case.parse(item.case);
        await store.upsertCase(c);
        return;
      }
      case "evidence": {
        const caseId = typeof item.caseId === "string" ? item.caseId : "";
        if (!caseId || !isRecord(item.evidence)) return;
        const evidence = Evidence.parse({ ...item.evidence, caseId: item.evidence.caseId ?? caseId });
        await store.putEvidence(caseId, evidence);
        return;
      }
      case "hook": {
        await storeAsHookEvent(item.payload, headerCaseId);
        return;
      }
      default: {
        // Unrecognized shape: never 500, store raw payload best-effort.
        await storeAsHookEvent(item, headerCaseId);
        return;
      }
    }
  } catch {
    // Swallow per-item errors so one bad message never fails the whole batch.
  }
}

export async function POST(req: NextRequest) {
  const expected = process.env.BUGPROOF_INGEST_TOKEN;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const headerCaseId = req.headers.get("x-bugproof-case");
  const items = Array.isArray(body) ? body : [body];

  for (const item of items) {
    await handleItem(item, headerCaseId);
  }

  return NextResponse.json({ ok: true });
}
