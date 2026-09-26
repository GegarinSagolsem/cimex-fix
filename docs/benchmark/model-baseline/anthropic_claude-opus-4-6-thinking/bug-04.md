CULPRIT: 882203d
ROOT CAUSE: `totalPages` is computed from `items.length - 1` instead of `items.length`, so whenever the item count is an exact multiple of `pageSize` plus one, the final page is lost.
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
import { describe, it, expect } from "vitest";
import { paginate } from "../../src/catalog/paginate";

describe("paginate – last-page regression (bug-04)", () => {
  it("includes the last item when total is pageSize * n + 1", () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    const page5 = paginate(items, 5, 6);

    expect(page5.totalPages).toBe(5);
    expect(page5.page).toBe(5);
    expect(page5.items).toEqual([25]);
    expect(page5.hasNext).toBe(false);
    expect(page5.hasPrev).toBe(true);
    expect(page5.totalItems).toBe(25);
  });

  it("page 4 still has hasNext when there is a 5th page", () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    const page4 = paginate(items, 4, 6);

    expect(page4.hasNext).toBe(true);
    expect(page4.items).toEqual([19, 20, 21, 22, 23, 24]);
  });
});
=== END TEST ===
