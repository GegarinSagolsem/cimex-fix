CULPRIT: 649b24a
ROOT CAUSE: When the search index was memoized in `indexFor`, the haystack was stored without lowercasing, and the needle in `searchProducts` also lost its `toLowerCase()` call, making substring matching case-sensitive.
=== FILE src/catalog/search.ts ===
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
=== END FILE ===
=== TEST ===
import { describe, it, expect } from "vitest";
import { searchProducts } from "../../src/catalog/search";
import { PRODUCTS } from "../../src/catalog/products";

describe("searchProducts case-insensitive regression", () => {
  it("finds 'Ceramic Coffee Mug' when searching with lowercase 'mug'", () => {
    const results = searchProducts(PRODUCTS, "mug");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Ceramic Coffee Mug");
  });

  it("finds kitchen products when searching with uppercase 'KITCHEN'", () => {
    const results = searchProducts(PRODUCTS, "KITCHEN");
    expect(results).toHaveLength(5);
  });

  it("finds 'Bluetooth Speaker' when searching with lowercase 'bluetooth'", () => {
    const results = searchProducts(PRODUCTS, "bluetooth");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Bluetooth Speaker");
  });

  it("still matches with exact case", () => {
    const results = searchProducts(PRODUCTS, "Mug");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Ceramic Coffee Mug");
  });
});
=== END TEST ===
