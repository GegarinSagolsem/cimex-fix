CULPRIT: 0944d88
ROOT CAUSE: The search index is built once per product list and never refreshed, so when the `searchProducts` function is called it uses the cached index that was created before any case‑insensitive normalization was added, causing case‑sensitive matching.

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
    // Normalise to lower‑case once so the search is case‑insensitive.
    index = products.map((product) => ({
      product,
      haystack: `${product.name.toLowerCase()} ${product.category.toLowerCase()}`,
    }));
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
import { describe, expect, test } from "vitest";
import { searchProducts } from "../../src/catalog/search";
import { PRODUCTS } from "../../src/catalog/products";

describe("catalog/search", () => {
  test("search is case‑insensitive", () => {
    // Before the fix this would return an empty array.
    const results = searchProducts(PRODUCTS, "mug");
    expect(results).toContainEqual(expect.objectContaining({ name: "Ceramic Coffee Mug" }));
  });

  test("empty query returns all products", () => {
    const results = searchProducts(PRODUCTS, "");
    expect(results).toEqual(PRODUCTS);
  });

  test("no match returns empty array", () => {
    const results = searchProducts(PRODUCTS, "nonexistent");
    expect(results).toHaveLength(0);
  });
});
```
=== END TEST ===