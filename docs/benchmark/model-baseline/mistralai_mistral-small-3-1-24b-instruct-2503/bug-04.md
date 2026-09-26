CULPRIT: 882203d
ROOT CAUSE: The `paginate` function incorrectly calculates the `totalPages` when the last page contains exactly one item, causing the last product to be omitted from the pagination.

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
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const current = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (current - 1) * pageSize;
  const end = Math.min(start + pageSize, totalItems);
  return {
    items: items.slice(start, end),
    page: current,
    pageSize,
    totalItems,
    totalPages,
    hasPrev: current > 1,
    hasNext: current < totalPages,
  };
}
```
=== END FILE ===
=== TEST ===
```ts
import { describe, it, expect } from "vitest";
import { paginate } from "../../src/catalog/paginate";
import { PRODUCTS } from "../../src/catalog/products";

describe("paginate", () => {
  it("should correctly paginate products with 25 items and page size 6", () => {
    const pageSize = 6;
    const totalPages = Math.ceil(PRODUCTS.length / pageSize);

    for (let page = 1; page <= totalPages; page++) {
      const result = paginate(PRODUCTS, page, pageSize);
      expect(result.page).toBe(page);
      expect(result.pageSize).toBe(pageSize);
      expect(result.totalItems).toBe(PRODUCTS.length);
      expect(result.totalPages).toBe(totalPages);
      expect(result.items).toHaveLength(page === totalPages ? PRODUCTS.length % pageSize : pageSize);
    }
  });
});
```
=== END TEST ===