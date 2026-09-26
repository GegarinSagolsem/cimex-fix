CULPRIT: 882203d
ROOT CAUSE: The bug is caused by the `paginate` function not correctly handling cases where the last page has only one item. The `totalPages` calculation is correct, but the `hasNext` flag is not updated correctly when the current page is the last page with only one item.

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
    hasNext: current < totalPages && (end < items.length || (end === items.length && items.length % pageSize !== 0)),
  };
}
```
=== END FILE ===
=== TEST ===
```typescript
import { describe, expect, it } from "vitest";
import { paginate } from "../../src/catalog/paginate";

describe("paginate", () => {
  it("should handle last page with one item", () => {
    const items = Array(25).fill(0);
    const page = 5;
    const pageSize = 6;
    const result = paginate(items, page, pageSize);
    expect(result.hasNext).toBe(false);
    expect(result.items.length).toBe(1);
  });
});
```
=== END TEST ===