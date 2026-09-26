CULPRIT: 649b24a
ROOT CAUSE: The memoization refactor for the search index accidentally omitted `.toLowerCase()` on both the query and the indexed strings, making substring matching strictly case-sensitive.
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

describe("Product Search Regression", () => {
  it("should perform case-insensitive search", () => {
    expect(searchProducts(PRODUCTS, "Mug").length).toBe(1);
    expect(searchProducts(PRODUCTS, "mug").length).toBe(1);
    expect(searchProducts(PRODUCTS, "KITCHEN").length).toBe(5);
    expect(searchProducts(PRODUCTS, "bluetooth").length).toBe(1);
  });
});
=== END TEST ===
