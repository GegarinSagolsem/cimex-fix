CULPRIT: 882203d
ROOT CAUSE: The `totalPages` calculation incorrectly divides `items.length - 1` by `pageSize`, causing the last page to be completely omitted if it contains exactly one item.
=== FILE src/catalog/paginate.ts ===
export interface Page<T> {
  items: T[];
  /** 1-based page number actually returned (out-of-range requests are clamped). */
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError(`pageSize must be a positive integer, got ${pageSize}`);
  }
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (current - 1) * pageSize;
  const end = Math.min(start + pageSize, items.length);
  return {
    items: items.slice(start, end),
    page: current,
    pageSize,
    totalItems: items.length,
    totalPages,
    hasPrev: current > 1,
    hasNext: current < totalPages,
  };
}
=== END FILE ===
=== TEST ===
import { expect, it } from "vitest";
import { paginate } from "../../src/catalog/paginate";

it("calculates total pages correctly when the last page has exactly one item", () => {
  const items = new Array(25).fill("product");
  const result = paginate(items, 5, 6);
  
  expect(result.totalPages).toBe(5);
  expect(result.page).toBe(5);
  expect(result.items).toHaveLength(1);
});
=== END TEST ===
