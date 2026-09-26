CULPRIT: 649b24a
ROOT CAUSE: The bug was introduced when the search index was memoized, but the memoization did not account for the case sensitivity of the search query. This caused the search to become case-sensitive, as the memoized index was not updated when the case of the query changed.
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
    index = products.map((product) => ({ product, haystack: `${product.name.toLowerCase()} ${product.category.toLowerCase()}` }));
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
=== END FILE ===
=== TEST ===
import { describe, expect, it } from "vitest";
import { searchProducts } from "../../src/catalog/search";
import { PRODUCTS } from "../../src/catalog/products";

describe("searchProducts", () => {
  it("should be case-insensitive", () => {
    const results = searchProducts(PRODUCTS, "mug");
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Ceramic Coffee Mug");
  });

  it("should be case-insensitive for category", () => {
    const results = searchProducts(PRODUCTS, "kitchen");
    expect(results.length).toBe(5);
  });
});
=== END TEST ===