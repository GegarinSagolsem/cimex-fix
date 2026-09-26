CULPRIT: 882203d
ROOT CAUSE: The pagination logic calculated total pages using `lastIndex = items.length - 1`, which under‑counts when the final page contains fewer than `pageSize` items (e.g., 25 items with pageSize 6 yields 4 pages instead of 5).

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

/**
 * Returns a slice of `items` representing the requested page together with pagination metadata.
 *
 * The function clamps out‑of‑range page numbers to the nearest valid page and always reports at
 * least one page (even for an empty list) so UI code can rely on `totalPages >= 1`.
 */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError(`pageSize must be a positive integer, got ${pageSize}`);
  }

  // Correct total page calculation: use the total item count, not the last index.
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Clamp the requested page number to the valid range [1, totalPages].
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
import { PRODUCTS } from "../../src/catalog/products";

describe("catalog pagination edge case", () => {
  test("last page with a single item is reachable", () => {
    const pageSize = 6;
    const lastPageNumber = 5; // 25 items => 5 pages (6,6,6,6,1)

    const result = paginate(PRODUCTS, lastPageNumber, pageSize);

    expect(result.totalPages).toBe(5);
    expect(result.page).toBe(5);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("p25"); // Wool Pashmina Shawl
    expect(result.hasPrev).toBe(true);
    expect(result.hasNext).toBe(false);
  });
});
```
=== END TEST ===