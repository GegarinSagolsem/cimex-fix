import { NextResponse, type NextRequest } from "next/server";
import { getMergedCaseDetail, getMergedEventsSince } from "@/lib/data/merge";

/**
 * GET /api/cases/[id] — {case, events, evidence}. Plan.md §4.2.
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
