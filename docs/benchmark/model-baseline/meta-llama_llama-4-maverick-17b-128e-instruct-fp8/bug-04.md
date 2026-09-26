CULPRIT: 882203d
ROOT CAUSE: The bug was introduced when the pagination logic was refactored to compute bounds explicitly, but the calculation of `totalPages` was not adjusted to account for the correct last index.

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
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
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
import { describe, expect, it } from "vitest";
import { paginate } from "../../src/catalog/paginate";
import { PRODUCTS } from "../../src/catalog/products";

describe("pagination repro", () => {
  it("shows the last product on the last page", () => {
    const lastPage = paginate(PRODUCTS, 5, 6);
    expect(lastPage.totalPages).toBe(5);
    expect(lastPage.page).toBe(5);
    expect(lastPage.items.length).toBe(1);
    expect(lastPage.items[0].name).toBe("Wool Pashmina Shawl");
  });
});
```
=== END TEST ===