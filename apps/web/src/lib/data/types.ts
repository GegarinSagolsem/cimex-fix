import type { Case, Evidence, Event } from "@bugproof/shared";

export interface CaseDetail {
  case: Case;
  events: Event[];
  evidence: Evidence[];
}

export interface CaseDataSource {
  listCases(): Promise<Case[]>;
  getCase(id: string): Promise<CaseDetail | null>;
}
