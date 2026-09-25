import { mockCase, mockEvents, mockEvidence } from "@bugproof/shared";
import type { Case, Evidence, Event } from "@bugproof/shared";
import type { CaseDataSource, CaseDetail } from "./types";

/**
 * Extra cases cloned from mockCase so /cases has more than one row.
 * Only case_hero_001 has matching events/evidence (the fixture only covers that case).
 */
const extraCases: Case[] = [
  {
    ...mockCase,
    id: "case_demo_002",
    issue: "#2",
    title: "Checkout button disabled after currency switch",
    severity: "medium",
    source: "issue",
    status: "investigating",
    provenAt: undefined,
    culprit: undefined,
    metrics: undefined,
  },
  {
    ...mockCase,
    id: "case_demo_003",
    issue: "#3",
    title: "PDF invoice export truncates line items past 20",
    severity: "low",
    source: "pdf",
    status: "reproduced",
    provenAt: undefined,
    culprit: undefined,
    metrics: { testsRun: 12, testsPassed: 11 },
  },
  {
    ...mockCase,
    id: "case_demo_004",
    issue: "#4",
    title: "Stack trace shows wrong line number in error log",
    severity: "critical",
    source: "log",
    status: "unproven",
    provenAt: undefined,
    culprit: undefined,
    metrics: undefined,
  },
];

const allCases: Case[] = [mockCase, ...extraCases];

const detailsById = new Map<string, CaseDetail>(
  allCases.map((c) => [
    c.id,
    {
      case: c,
      events: c.id === mockCase.id ? mockEvents : ([] as Event[]),
      evidence: c.id === mockCase.id ? mockEvidence : ([] as Evidence[]),
    },
  ]),
);

export const mockDataSource: CaseDataSource = {
  listCases() {
    return Promise.resolve(allCases);
  },
  getCase(id: string) {
    return Promise.resolve(detailsById.get(id) ?? null);
  },
};
