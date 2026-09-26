import type { Case, Evidence, Event } from "./schemas.js";

/**
 * Fixture for UI development: the hero bug (#1).
 * "Empty coupon field -> total shows NaN" on the demo shop, worked end-to-end
 * by the Bob pack in ~6 minutes. Used by apps/web until the real API is live.
 */

const CASE_ID = "case_hero_001";
const REPO = "bugproof-demo-shoplite";
const START = new Date("2026-09-26T07:12:00+05:30"); // IST

function at(offsetSec: number): string {
  return new Date(START.getTime() + offsetSec * 1000).toISOString();
}

export const mockCase: Case = {
  id: CASE_ID,
  repo: REPO,
  issue: "#1",
  title: "Empty coupon field → total shows ₹NaN",
  severity: "high",
  source: "screenshot",
  status: "proven",
  startedAt: at(0),
  provenAt: at(358),
  culprit: {
    sha: "8f2a1c9e4b6d7a3f0e5c1d2b9a8f7e6d5c4b3a29",
    shortSha: "8f2a1c9",
    message: "feat(cart): apply coupon discount before tax",
    author: "shoplite-bot",
    file: "src/cart/applyCoupon.ts",
    diff:
      "@@ -12,7 +12,7 @@ export function applyCoupon(total: number, code: string): number {\n" +
      "-  const pct = COUPONS[code].percent;\n" +
      "+  const pct = COUPONS[code]?.percent ?? 0;\n" +
      "   return total - total * (pct / 100);\n",
  },
  metrics: {
    timeToProofSec: 358,
    testsRun: 104,
    testsPassed: 104,
    bobcoins: 2.1,
  },
};

export const mockEvents: Event[] = [
  { caseId: CASE_ID, ts: at(0), agent: "lead", kind: "status", title: "Case opened from screenshot intake" },
  { caseId: CASE_ID, ts: at(3), agent: "lead", kind: "tool", title: "MCP open_case" },
  { caseId: CASE_ID, ts: at(6), agent: "lead", kind: "spawn", title: "Spawned Triage (explore)" },
  { caseId: CASE_ID, ts: at(6), agent: "lead", kind: "spawn", title: "Spawned Locator (explore)" },
  { caseId: CASE_ID, ts: at(6), agent: "lead", kind: "spawn", title: "Spawned Historian (general)" },
  { caseId: CASE_ID, ts: at(9), agent: "triage", kind: "tool", title: "Reading screenshot via document understanding" },
  { caseId: CASE_ID, ts: at(24), agent: "triage", kind: "evidence", title: "Triage report ready" },
  { caseId: CASE_ID, ts: at(26), agent: "locator", kind: "tool", title: "grep applyCoupon across src/cart" },
  { caseId: CASE_ID, ts: at(41), agent: "locator", kind: "milestone", title: "Located src/cart/applyCoupon.ts:12" },
  { caseId: CASE_ID, ts: at(28), agent: "historian", kind: "tool", title: "git log -- src/cart/applyCoupon.ts" },
  { caseId: CASE_ID, ts: at(60), agent: "lead", kind: "status", title: "Status → investigating" },
  { caseId: CASE_ID, ts: at(65), agent: "lead", kind: "spawn", title: "Switched to Reproducer mode" },
  { caseId: CASE_ID, ts: at(70), agent: "reproducer", kind: "tool", title: "Writing tests/bugproof/case-hero-001.test.ts" },
  { caseId: CASE_ID, ts: at(118), agent: "reproducer", kind: "tool", title: "MCP run_tests (expect: red)" },
  { caseId: CASE_ID, ts: at(132), agent: "reproducer", kind: "evidence", title: "RED: assertion failure confirmed" },
  { caseId: CASE_ID, ts: at(134), agent: "lead", kind: "status", title: "Status → reproduced" },
  { caseId: CASE_ID, ts: at(140), agent: "historian", kind: "tool", title: "MCP bisect (git bisect run)" },
  { caseId: CASE_ID, ts: at(196), agent: "historian", kind: "evidence", title: "Culprit commit found: 8f2a1c9" },
  { caseId: CASE_ID, ts: at(200), agent: "lead", kind: "spawn", title: "Switched to Fixer mode" },
  { caseId: CASE_ID, ts: at(205), agent: "fixer", kind: "tool", title: "Reading src/cart/applyCoupon.ts" },
  { caseId: CASE_ID, ts: at(240), agent: "fixer", kind: "tool", title: "Editing src/cart/applyCoupon.ts (nullish fallback)" },
  { caseId: CASE_ID, ts: at(255), agent: "fixer", kind: "evidence", title: "Fix diff ready" },
  { caseId: CASE_ID, ts: at(260), agent: "fixer", kind: "tool", title: "MCP run_tests (expect: green)" },
  { caseId: CASE_ID, ts: at(270), agent: "fixer", kind: "evidence", title: "GREEN: repro test passes" },
  { caseId: CASE_ID, ts: at(272), agent: "fixer", kind: "tool", title: "MCP run_tests (full suite)" },
  { caseId: CASE_ID, ts: at(310), agent: "fixer", kind: "evidence", title: "Full suite: 104/104 passing" },
  { caseId: CASE_ID, ts: at(312), agent: "lead", kind: "status", title: "Status → fixing complete, handing to Critic" },
  { caseId: CASE_ID, ts: at(315), agent: "lead", kind: "spawn", title: "Switched to Critic mode" },
  { caseId: CASE_ID, ts: at(320), agent: "critic", kind: "tool", title: "Adversarial review of the diff" },
  { caseId: CASE_ID, ts: at(345), agent: "critic", kind: "evidence", title: "Critic: approved, no blast radius concerns" },
  { caseId: CASE_ID, ts: at(352), agent: "lead", kind: "tool", title: "MCP publish_proof" },
  { caseId: CASE_ID, ts: at(358), agent: "lead", kind: "status", title: "Status → proven" },
];

export const mockEvidence: Evidence[] = [
  {
    caseId: CASE_ID,
    kind: "triage",
    data: {
      severity: "high",
      component: "cart/coupon",
      expected: "Applying an empty coupon code should be a no-op.",
      actual: "Total renders as ₹NaN when the coupon field is submitted empty.",
      steps: [
        "Add an item to the cart",
        "Open the coupon field",
        "Submit with the field empty",
      ],
      missingInfo: [],
    },
  },
  {
    caseId: CASE_ID,
    kind: "red",
    data: {
      file: "tests/bugproof/case-hero-001.test.ts",
      command: "vitest run tests/bugproof/case-hero-001.test.ts",
      summary: "1 failed | 0 passed",
      failure:
        "AssertionError: expected 'NaN' to be '0' // total unchanged when coupon code is empty",
    },
  },
  {
    caseId: CASE_ID,
    kind: "culprit",
    data: {
      sha: "8f2a1c9e4b6d7a3f0e5c1d2b9a8f7e6d5c4b3a29",
      shortSha: "8f2a1c9",
      message: "feat(cart): apply coupon discount before tax",
      author: "shoplite-bot",
      date: at(-86400 * 12),
      file: "src/cart/applyCoupon.ts",
    },
  },
  {
    caseId: CASE_ID,
    kind: "diff",
    data: {
      file: "src/cart/applyCoupon.ts",
      language: "typescript",
      patch:
        "@@ -12,7 +12,7 @@ export function applyCoupon(total: number, code: string): number {\n" +
        "-  const pct = COUPONS[code].percent;\n" +
        "+  const pct = COUPONS[code]?.percent ?? 0;\n" +
        "   return total - total * (pct / 100);\n",
    },
  },
  {
    caseId: CASE_ID,
    kind: "green",
    data: {
      file: "tests/bugproof/case-hero-001.test.ts",
      command: "vitest run tests/bugproof/case-hero-001.test.ts",
      summary: "0 failed | 1 passed",
    },
  },
  {
    caseId: CASE_ID,
    kind: "suite",
    data: {
      command: "vitest run",
      summary: "0 failed | 104 passed",
      durationMs: 4210,
    },
  },
  {
    caseId: CASE_ID,
    kind: "critic",
    data: {
      verdict: "approved",
      notes: [
        "Fix is minimal (1 line) and scoped to src/cart/applyCoupon.ts",
        "No other callers of applyCoupon rely on the throwing behavior",
        "Repro test was not modified by the Fixer",
      ],
    },
  },
];
