import { NextResponse, type NextRequest } from "next/server";
import { Case } from "@bugproof/shared";
import { store } from "@/lib/store";
import { getMergedCaseDetail } from "@/lib/data/merge";
import { generatePlainSummary } from "@/lib/proofSummary";

/**
 * POST /api/cases/[id]/summary — regenerates the Granite plain-English summary. Bearer-token-protected.
 * Unlike /publish it leaves status and provenAt untouched, so time-to-proof numbers stay correct.
 */
export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const expected = process.env.BUGPROOF_INGEST_TOKEN;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const detail = await getMergedCaseDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const plainSummary = await generatePlainSummary(detail.case, detail.evidence);
  if (!plainSummary) {
    return NextResponse.json({ error: "Granite did not return a summary" }, { status: 502 });
  }

  await store.upsertCase(Case.parse({ ...detail.case, plainSummary }));
  return NextResponse.json({ plainSummary });
}
