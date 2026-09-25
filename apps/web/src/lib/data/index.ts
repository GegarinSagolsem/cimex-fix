import { storeDataSource } from "./storeDataSource";
import type { CaseDataSource } from "./types";

export const dataSource: CaseDataSource = storeDataSource;

export type { CaseDataSource, CaseDetail } from "./types";
