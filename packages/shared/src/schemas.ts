import { z } from "zod";

/**
 * Shared zod schemas + types for BugProof Cloud.
 * These are the contract between the Bob pack (bugproof-mcp / hooks),
 * the API routes (apps/web) and the UI (Mission Control).
 */

export const AgentName = z.enum([
  "lead",
  "triage",
  "locator",
  "historian",
  "reproducer",
  "fixer",
  "critic",
]);
export type AgentName = z.infer<typeof AgentName>;

export const CaseStatus = z.enum([
  "open",
  "investigating",
  "reproduced",
  "fixing",
  "proven",
  "unproven",
]);
export type CaseStatus = z.infer<typeof CaseStatus>;

export const CaseSeverity = z.enum(["low", "medium", "high", "critical"]);
export type CaseSeverity = z.infer<typeof CaseSeverity>;

export const CaseSource = z.enum(["screenshot", "issue", "pdf", "log"]);
export type CaseSource = z.infer<typeof CaseSource>;

export const EventKind = z.enum(["spawn", "tool", "milestone", "evidence", "status"]);
export type EventKind = z.infer<typeof EventKind>;

export const EvidenceKind = z.enum([
  "triage",
  "red",
  "culprit",
  "diff",
  "green",
  "suite",
  "blast",
  "critic",
]);
export type EvidenceKind = z.infer<typeof EvidenceKind>;

export const CaseMetrics = z.object({
  timeToProofSec: z.number().nonnegative().optional(),
  testsRun: z.number().int().nonnegative().optional(),
  testsPassed: z.number().int().nonnegative().optional(),
  bobcoins: z.number().nonnegative().optional(),
});
export type CaseMetrics = z.infer<typeof CaseMetrics>;

export const CaseCulprit = z.object({
  sha: z.string(),
  shortSha: z.string(),
  message: z.string(),
  author: z.string(),
  file: z.string(),
  diff: z.string().optional(),
});
export type CaseCulprit = z.infer<typeof CaseCulprit>;

export const PlainSummary = z.object({
  text: z.string(),
  model: z.string(),
  generatedAt: z.string(), // ISO 8601
});
export type PlainSummary = z.infer<typeof PlainSummary>;

export const Case = z.object({
  id: z.string(),
  repo: z.string(),
  issue: z.string(),
  title: z.string(),
  severity: CaseSeverity,
  source: CaseSource,
  status: CaseStatus,
  startedAt: z.string(), // ISO 8601
  provenAt: z.string().optional(),
  culprit: CaseCulprit.optional(),
  metrics: CaseMetrics.optional(),
  summary: z.string().optional(), // plain-English proof summary, set by POST /api/cases/[id]/publish
  // Granite-generated plain-English "what broke / why / what changed" summary
  // for a non-technical manager. Set by POST /api/cases/[id]/publish.
  plainSummary: PlainSummary.optional(),
});
export type Case = z.infer<typeof Case>;

/**
 * /api/triage — Granite turns a messy bug report into
 * structured JSON. Shared so the API route, the /triage page and the
 * recorded-examples file all agree on the shape.
 */
export const TriageSuggestedIntake = z.enum(["issue", "log", "screenshot", "pdf"]);
export type TriageSuggestedIntake = z.infer<typeof TriageSuggestedIntake>;

export const TriageResult = z.object({
  severity: CaseSeverity,
  component: z.string(),
  expected: z.string(),
  actual: z.string(),
  stepsToReproduce: z.array(z.string()),
  missingInfo: z.array(z.string()),
  suggestedIntake: TriageSuggestedIntake,
});
export type TriageResult = z.infer<typeof TriageResult>;

export const TriageExampleRecord = z.object({
  input: z.string(),
  result: TriageResult,
  model: z.string(),
  recordedAt: z.string(), // ISO 8601
});
export type TriageExampleRecord = z.infer<typeof TriageExampleRecord>;

export const Event = z.object({
  caseId: z.string(),
  ts: z.string(), // ISO 8601
  agent: AgentName,
  kind: EventKind,
  title: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type Event = z.infer<typeof Event>;

export const Evidence = z.object({
  caseId: z.string(),
  kind: EvidenceKind,
  data: z.record(z.string(), z.unknown()),
});
export type Evidence = z.infer<typeof Evidence>;
