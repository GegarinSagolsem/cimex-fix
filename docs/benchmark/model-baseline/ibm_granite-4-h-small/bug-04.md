CULPRIT: 5dd2952
ROOT CAUSE: The pagination logic in `src/catalog/paginate.ts` clamps the requested page number to the total page count, so when the last page would contain exactly one product the page number is forced to the previous page, making the product invisible in the grid.

=== FILE src/catalog/paginate.ts ===
```ts
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
  const lastIndex = items.length - 1;
  const totalPages = Math.max(1, Math.ceil(lastIndex / pageSize));
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
```
=== END FILE ===

=== TEST ===
```ts
import { describe, expect, test } from "vitest";
import { paginate } from "../../src/catalog/paginate";

describe("paginate", () => {
  test("last page with a single item is returned correctly", () => {
    const items = [{ id: "p25" }]; // only one product
    const result = paginate(items, 5, 6);
    expect(result.items).toEqual(items);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });
});
```
=== END TEST ===