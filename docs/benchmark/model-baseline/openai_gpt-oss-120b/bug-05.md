CULPRIT: 649b24a
ROOT CAUSE: The search index stores the raw product name/category strings and the query is compared without normalising case, so `includes` becomes case‑sensitive after the memoisation change.

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
    index = products.map((product) => ({
      product,
      // Normalise to lower‑case for case‑insensitive matching
      haystack: `${product.name} ${product.category}`.toLowerCase(),
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

describe("searchProducts case‑insensitivity", () => {
  test("lowercase query matches product", () => {
    const results = searchProducts(PRODUCTS, "mug");
    expect(results).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Ceramic Coffee Mug" })])
    );
  });
});
```
=== END TEST ===