CULPRIT: 649b24a
ROOT CAUSE: The search index was memoized in a case-sensitive way, causing the search to become case-sensitive.

=== FILE src/catalog/search.ts ===
```ts
import type { Product } from "./products";

interface IndexEntry {
  product: Product;
  haystack: string;
}

// Search runs on every keystroke, so build the searchable text once per product list.
const indexCache = new WeakMap<readonly Product[], IndexEntry[]>();

function indexFor(products: readonly Product[]): IndexEntry[] {
  let index = indexCache.get(products);
  if (index === undefined) {
    index = products.map((product) => ({ product, haystack: `${product.name} ${product.category}`.toLowerCase() }));
    indexCache.set(products, index);
  }
  return index;
}

/** Substring search over product name and category. */
export function searchProducts(products: readonly Product[], query: string): Product[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [...products];
  return indexFor(products)
    .filter((entry) => entry.haystack.includes(needle))
    .map((entry) => entry.product);
}
```
=== END FILE ===
=== TEST ===
```ts
import { describe, it, expect } from "vitest";
import { searchProducts } from "../../src/catalog/search";
import { PRODUCTS } from "../../src/catalog/products";

describe("searchProducts regression test", () => {
  it("should find products case-insensitively", () => {
    const results = searchProducts(PRODUCTS, "mug");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Ceramic Coffee Mug");
  });

  it("should find products with mixed case queries", () => {
    const results = searchProducts(PRODUCTS, "KITCHEN");
    expect(results).toHaveLength(5);
  });

  it("should find products with lowercase queries", () => {
    const results = searchProducts(PRODUCTS, "bluetooth");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Bluetooth Speaker");
  });
});
```
=== END TEST ===