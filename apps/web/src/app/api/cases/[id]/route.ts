import { NextResponse, type NextRequest } from "next/server";
import { getMergedCaseDetail, getMergedEventsSince } from "@/lib/data/merge";
import { store } from "@/lib/store";

/**
 * GET /api/cases/[id] — {case, events, evidence}.
 * ?after=<ISO ts> returns only events newer than that timestamp (used by
 * the live case page's 1s poll), keeping `case` and `evidence` in the
 * response so status/evidence changes are still picked up each poll.
 */
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getMergedCaseDetail(id);

  if (!detail) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const after = req.nextUrl.searchParams.get("after") ?? undefined;
  const events = after ? await getMergedEventsSince(id, after) : detail.events;

  return NextResponse.json({ case: detail.case, events, evidence: detail.evidence });
}

/** DELETE /api/cases/[id] — removes a stored (non-static) case. Bearer-token-protected. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const expected = process.env.BUGPROOF_INGEST_TOKEN;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await store.deleteCase(id);
  return NextResponse.json({ ok: true });
}
