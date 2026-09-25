import { NextResponse, type NextRequest } from "next/server";
import { watsonxChat, isWatsonxConfigured, getWatsonxModelId } from "@/lib/watsonx";
import {
  TRIAGE_SYSTEM_PROMPT,
  parseTriageResult,
  findClosestExample,
  loadTriageExamples,
} from "@/lib/triage";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

/**
 * POST /api/triage — Plan.md §4.4. Turns a messy bug report into structured
 * JSON via Granite. Falls back to the closest recorded example once the IBM
 * Cloud account closes (or on any live failure), always labelled honestly.
 * Never returns a 500 for a well-formed request.
 */
export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 6000;
const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

const FALLBACK_NOTE =
  "Live Granite endpoint closed after the hackathon — showing a recorded result.";

function recordedFallback(text: string) {
  const examples = loadTriageExamples();
  const closest = findClosestExample(text, examples);
  if (!closest) {
    return NextResponse.json(
      { error: "Granite is unavailable and no recorded examples are available." },
      { status: 503 },
    );
  }
  return NextResponse.json({
    source: "recorded",
    note: FALLBACK_NOTE,
    model: closest.model,
    result: closest.result,
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!checkRateLimit("triage", ip, RATE_LIMIT, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json({ error: "Too many requests, try again in a minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const text = (body as { text?: unknown })?.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "'text' is required" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `'text' must be at most ${MAX_TEXT_LENGTH} characters` },
      { status: 400 },
    );
  }

  if (!isWatsonxConfigured()) {
    return recordedFallback(text);
  }

  const messages = [
    { role: "system" as const, content: TRIAGE_SYSTEM_PROMPT },
    { role: "user" as const, content: text },
  ];

  const first = await watsonxChat(messages, { maxTokens: 800 });
  let result = first ? parseTriageResult(first) : null;

  if (!result && first) {
    // One retry: reinforce the JSON-only instruction.
    const retry = await watsonxChat(
      [
        ...messages,
        { role: "assistant" as const, content: first },
        { role: "user" as const, content: "Respond with JSON only, matching the schema exactly." },
      ],
      { maxTokens: 800 },
    );
    result = retry ? parseTriageResult(retry) : null;
  }

  if (!result) {
    return recordedFallback(text);
  }

  return NextResponse.json({
    source: "granite-live",
    model: getWatsonxModelId(),
    result,
  });
}
