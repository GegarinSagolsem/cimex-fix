import { NextResponse } from "next/server";
import { listMergedCases } from "@/lib/data/merge";

/** GET /api/cases — list cases, newest first. */
export const runtime = "nodejs";

export async function GET() {
  const cases = await listMergedCases();
  return NextResponse.json({ cases });
}
