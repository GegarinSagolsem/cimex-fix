import { NextResponse, type NextRequest } from "next/server";
import { Case } from "@bugproof/shared";
import { store } from "@/lib/store";
import { getMergedCaseDetail } from "@/lib/data/merge";

/**
 * POST /api/cases/[id]/publish — Plan.md §4.2. Bearer-token-protected.
 * Body: {status: "proven" | "unproven", summary?: string}.
 * Sets status + provenAt (+ optional summary/notes on the case) and
 * returns the shareable Proof of Fix URL.
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const status = (body as { status?: unknown })?.status;
  if (status !== "proven" && status !== "unproven") {
    return NextResponse.json({ error: "status must be 'proven' or 'unproven'" }, { status: 400 });
  }
  const summary = (body as { summary?: unknown })?.summary;

  const detail = await getMergedCaseDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const provenAt = new Date().toISOString();
  const updated: Case = Case.parse({
    ...detail.case,
    status,
    provenAt,
    summary: typeof summary === "string" ? summary : detail.case.summary,
  });

  await store.upsertCase(updated);

  return NextResponse.json({ proofUrl: `/cases/${id}/proof` });
}
