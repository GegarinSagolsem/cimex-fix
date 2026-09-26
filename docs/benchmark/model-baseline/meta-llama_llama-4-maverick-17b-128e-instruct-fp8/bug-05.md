CULPRIT: 649b24a
ROOT CAUSE: The searchProducts function became case-sensitive after the introduction of the search index memoization, because the query was not normalized to match the haystack.

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
    index = products.map((product) => ({ product, haystack: `${product.name} ${product.category}` }));
    indexCache.set(products, index);
  }
  return index;
}

/** Substring search over product name and category. */
export function searchProducts(products: readonly Product[], query: string): Product[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [...products];
  return indexFor(products)
    .filter((entry) => entry.haystack.toLowerCase().includes(needle))
    .map((entry) => entry.product);
}
```
=== END FILE ===

=== TEST ===
```ts
import { describe, expect, it } from "vitest";
import { PRODUCTS, searchProducts } from "../../src/catalog/products";
import { searchProducts as search } from "../../src/catalog/search";

describe("catalog search regression", () => {
  it("matches product names case-insensitively", () => {
    expect(search(PRODUCTS, "mug")).toEqual(searchProducts(PRODUCTS, "Mug"));
  });
});
```
=== END TEST ===