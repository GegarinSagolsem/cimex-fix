import { getMergedCaseDetail, listMergedCases } from "./merge";
import type { CaseDataSource } from "./types";

/**
 * Store + static-replay backed data source (Plan.md §4.2). Replaces the
 * mock data source for the UI: /cases and /cases/[id] now read from the
 * CaseStore (Redis or in-memory) layered on top of apps/web/data/cases/*.json.
 */
export const storeDataSource: CaseDataSource = {
  listCases() {
    return listMergedCases();
  },
  getCase(id) {
    return getMergedCaseDetail(id);
  },
};
