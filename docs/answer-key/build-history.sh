#!/usr/bin/env bash
#
# build-history.sh — rebuilds the ShopLite repository, commit by commit.
#
# Usage:
#   scripts/build-history.sh [--append] [target-dir]      (default target: ./shoplite)
#
#   target-dir must be empty or missing; it is `git init`ed and filled with ~35 sequential
#   commits. To rebuild, `rm -rf` the target and run again. With --append the target must be an
#   existing, clean git checkout and the commits are added on top of its current branch.
#
# Environment:
#   VERIFY=1          after every commit run the type checker and the test suite (and the UI
#                     build once it exists); abort on the first failure.
#   COMMIT_PAUSE=N    seconds to wait between commits (default 1) so commit times are distinct.
#
# Commit dates are never faked: git records the real wall-clock time of each commit.
# Requires: git, node >= 22.12, npm (network access for `npm install`).

set -euo pipefail

die() { echo "build-history: $*" >&2; exit 1; }

APPEND=0
TARGET=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --append) APPEND=1 ;;
    -h | --help) sed -n '2,19p' "${BASH_SOURCE[0]}"; exit 0 ;;
    -*) die "unknown option $1" ;;
    *) TARGET="$1" ;;
  esac
  shift
done
TARGET="${TARGET:-shoplite}"
VERIFY="${VERIFY:-0}"
COMMIT_PAUSE="${COMMIT_PAUSE:-1}"
SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"

command -v git >/dev/null || die "git is required"
command -v node >/dev/null || die "node is required"
command -v npm >/dev/null || die "npm is required"

if [[ -d "$TARGET/.git" ]]; then
  [[ "$APPEND" == 1 ]] || die "$TARGET is already a git repository (rm -rf it to rebuild, or pass --append)"
  [[ -z "$(git -C "$TARGET" status --porcelain)" ]] || die "$TARGET has uncommitted changes"
elif [[ -e "$TARGET" && -n "$(ls -A "$TARGET")" ]]; then
  die "$TARGET exists and is not empty"
else
  mkdir -p "$TARGET"
  git -C "$TARGET" init -q -b main
fi
cd "$TARGET"
git config user.name >/dev/null || git config user.name "ShopLite Maintainers"
git config user.email >/dev/null || git config user.email "maintainers@shoplite.invalid"

COMMITS=0
declare -a BUG_SHA=() BUG_MSG=()

# f <path>: write stdin to <path>, creating parent directories.
f() { mkdir -p "$(dirname "$1")"; cat >"$1"; }

verify() {
  [[ "$VERIFY" == 1 && -d node_modules ]] || return 0
  local log
  log="$(mktemp)"
  if ! npx tsc --noEmit >"$log" 2>&1; then cat "$log"; die "type check failed at $(git log -1 --format='%h %s')"; fi
  if ! npx vitest run >"$log" 2>&1; then cat "$log"; die "tests failed at $(git log -1 --format='%h %s')"; fi
  if [[ -f ui/package.json ]] && ! npm run build --silent >"$log" 2>&1; then cat "$log"; die "UI build failed at $(git log -1 --format='%h %s')"; fi
  grep -E "Tests +[0-9]+" "$log" >/dev/null 2>&1 || true
  rm -f "$log"
}

commit() {
  git add -A
  git commit -q -m "$1"
  COMMITS=$((COMMITS + 1))
  printf '  %2d  %s  %s\n' "$COMMITS" "$(git rev-parse --short=7 HEAD)" "$1"
  verify
  sleep "$COMMIT_PAUSE"
}

# bug_commit <n> <message>: an ordinary commit whose SHA is recorded for docs/bugs.md.
bug_commit() {
  commit "$2"
  BUG_SHA[$1]="$(git rev-parse --short=7 HEAD)"
  BUG_MSG[$1]="$2"
}

npm_install() { npm install --no-audit --no-fund --loglevel=error >/dev/null; }

echo "Building ShopLite history in $(pwd)"

# ---------------------------------------------------------------------------------------------
# 1. Project scaffold
# ---------------------------------------------------------------------------------------------
f .gitignore <<'__FILE__'
node_modules/
dist/
coverage/
.env*
.bugproof/
*.log
!intake/*.log
__FILE__

f .nvmrc <<'__FILE__'
24
__FILE__

f LICENSE <<'__FILE__'
MIT License

Copyright (c) 2026 Sagolsem Gegarin Singh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
__FILE__

f README.md <<'__FILE__'
# ShopLite

A small in-memory TypeScript shop. Work in progress.

```sh
npm install
npm test
```
__FILE__

f package.json <<'__FILE__'
{
  "name": "shoplite",
  "version": "0.1.0",
  "private": true,
  "description": "A tiny in-memory shop: catalog, cart, coupons, GST, delivery estimates and orders.",
  "license": "MIT",
  "type": "module",
  "engines": {
    "node": "^22.12.0 || >=24.0.0"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vitest": "^5.0.2"
  }
}
__FILE__

f tsconfig.json <<'__FILE__'
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src", "tests", "ui/src", "vitest.config.ts"]
}
__FILE__

f vitest.config.ts <<'__FILE__'
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
__FILE__

f src/index.ts <<'__FILE__'
export {};
__FILE__

f tests/smoke.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";

describe("toolchain", () => {
  it("runs TypeScript tests", () => {
    expect(1 + 1).toBe(2);
  });
});
__FILE__

npm_install
commit "chore: scaffold TypeScript project with Vitest"

# ---------------------------------------------------------------------------------------------
# 2. Currency
# ---------------------------------------------------------------------------------------------
rm -f tests/smoke.test.ts

f src/currency/money.ts <<'__FILE__'
/**
 * Amounts are passed around in rupees, but arithmetic that must be exact is done in
 * integer paise (1 rupee = 100 paise).
 */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function fromPaise(paise: number): number {
  return paise / 100;
}

/** Rounds a rupee amount to the nearest paisa. */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}
__FILE__

f src/currency/format.ts <<'__FILE__'
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

/** Formats rupees for display, e.g. 123456.5 → "₹1,23,456.50". */
export function formatINR(amount: number): string {
  return inr.format(amount);
}

/** Formats a discount as a negative amount, e.g. 200 → "−₹200.00". */
export function formatDiscount(amount: number): string {
  return amount === 0 ? formatINR(0) : `−${formatINR(amount)}`;
}
__FILE__

f src/index.ts <<'__FILE__'
export * from "./currency/format";
export * from "./currency/money";
__FILE__

f tests/currency/money.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";
import { fromPaise, roundMoney, toPaise } from "../../src/currency/money";

describe("money helpers", () => {
  it("converts rupees to integer paise", () => {
    expect(toPaise(19.99)).toBe(1999);
    expect(toPaise(1049.25)).toBe(104925);
  });

  it("converts paise back to rupees", () => {
    expect(fromPaise(12345)).toBe(123.45);
  });

  it("round-trips common prices without drift", () => {
    for (const price of [0.1, 0.2, 0.3, 349, 599.99, 2849]) {
      expect(fromPaise(toPaise(price))).toBe(price);
    }
  });

  it("rounds to the nearest paisa", () => {
    expect(roundMoney(10.004)).toBe(10);
    expect(roundMoney(10.006)).toBe(10.01);
  });
});
__FILE__

f tests/currency/format.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";
import { formatDiscount, formatINR } from "../../src/currency/format";

describe("formatINR", () => {
  it("formats whole rupees with the rupee sign", () => {
    expect(formatINR(349)).toBe("₹349.00");
  });

  it("always shows two decimal places", () => {
    expect(formatINR(1049.25)).toBe("₹1,049.25");
  });

  it("uses Indian digit grouping", () => {
    expect(formatINR(123456.5)).toBe("₹1,23,456.50");
  });

  it("formats zero", () => {
    expect(formatINR(0)).toBe("₹0.00");
  });

  it("formats negative amounts", () => {
    expect(formatINR(-20)).toBe("-₹20.00");
  });
});

describe("formatDiscount", () => {
  it("prefixes discounts with a minus sign", () => {
    expect(formatDiscount(200)).toBe("−₹200.00");
  });

  it("shows a zero discount without a sign", () => {
    expect(formatDiscount(0)).toBe("₹0.00");
  });
});
__FILE__
commit "feat(currency): add INR formatting and paise helpers"

# ---------------------------------------------------------------------------------------------
# 3. Tax
# ---------------------------------------------------------------------------------------------
f src/tax/gst.ts <<'__FILE__'
import { fromPaise, toPaise } from "../currency/money";

/** Standard GST slab applied to everything in the catalog. */
export const GST_RATE_PERCENT = 18;
export const GST_RATE = GST_RATE_PERCENT / 100;

/**
 * GST on a pre-tax amount, rounded half-up to the nearest paisa. Computed in integer paise
 * so that amounts like ₹249.75 (→ ₹44.955) round the same way every time.
 */
export function calculateGst(amount: number, ratePercent: number = GST_RATE_PERCENT): number {
  if (ratePercent < 0) throw new RangeError(`GST rate cannot be negative: ${ratePercent}`);
  return fromPaise(Math.round((toPaise(amount) * ratePercent) / 100));
}
__FILE__

f src/index.ts <<'__FILE__'
export * from "./currency/format";
export * from "./currency/money";
export * from "./tax/gst";
__FILE__

f tests/tax/gst.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";
import { calculateGst, GST_RATE, GST_RATE_PERCENT } from "../../src/tax/gst";

describe("calculateGst", () => {
  it("charges the standard 18% slab by default", () => {
    expect(GST_RATE_PERCENT).toBe(18);
    expect(GST_RATE).toBe(0.18);
    expect(calculateGst(1000)).toBe(180);
  });

  it("rounds to the nearest paisa", () => {
    expect(calculateGst(349)).toBe(62.82);
  });

  it("rounds half a paisa up", () => {
    expect(calculateGst(249.75)).toBe(44.96);
  });

  it("supports other GST slabs", () => {
    expect(calculateGst(199, 5)).toBe(9.95);
  });

  it("is zero for a zero amount", () => {
    expect(calculateGst(0)).toBe(0);
  });

  it("rejects negative rates", () => {
    expect(() => calculateGst(100, -1)).toThrow(RangeError);
  });
});
__FILE__
commit "feat(tax): add GST calculation"

# ---------------------------------------------------------------------------------------------
# 4. Catalog
# ---------------------------------------------------------------------------------------------
f src/catalog/products.ts <<'__FILE__'
export type Category = "Apparel" | "Electronics" | "Fitness" | "Home" | "Kitchen" | "Stationery";

export interface Product {
  id: string;
  name: string;
  category: Category;
  /** Pre-tax price in rupees. */
  price: number;
}

export const PRODUCTS: readonly Product[] = [
  { id: "p01", name: "Ceramic Coffee Mug", category: "Kitchen", price: 349 },
  { id: "p02", name: "Steel Water Bottle 1L", category: "Kitchen", price: 599 },
  { id: "p03", name: "Cast Iron Tawa", category: "Kitchen", price: 1049.25 },
  { id: "p04", name: "Bamboo Chopping Board", category: "Kitchen", price: 449.5 },
  { id: "p05", name: "Masala Dabba Spice Box", category: "Kitchen", price: 799 },
  { id: "p06", name: "Cotton Bath Towel", category: "Home", price: 399 },
  { id: "p07", name: "Handloom Cushion Cover", category: "Home", price: 299.75 },
  { id: "p08", name: "Brass Diya Set", category: "Home", price: 649 },
  { id: "p09", name: "Jute Storage Basket", category: "Home", price: 549 },
  { id: "p10", name: "Scented Soy Candle", category: "Home", price: 249.75 },
  { id: "p11", name: "Wireless Mouse", category: "Electronics", price: 899 },
  { id: "p12", name: "USB-C Charging Cable", category: "Electronics", price: 299 },
  { id: "p13", name: "Bluetooth Speaker", category: "Electronics", price: 2499 },
  { id: "p14", name: "Power Bank 10000mAh", category: "Electronics", price: 1299 },
  { id: "p15", name: "Noise-Cancelling Earbuds", category: "Electronics", price: 3999 },
  { id: "p16", name: "A5 Dotted Notebook", category: "Stationery", price: 199 },
  { id: "p17", name: "Gel Pen Pack", category: "Stationery", price: 149.25 },
  { id: "p18", name: "Desk Organizer", category: "Stationery", price: 699 },
  { id: "p19", name: "Yoga Mat", category: "Fitness", price: 1199 },
  { id: "p20", name: "Resistance Band Set", category: "Fitness", price: 749 },
  { id: "p21", name: "Steel Skipping Rope", category: "Fitness", price: 299 },
  { id: "p22", name: "Cotton Kurta", category: "Apparel", price: 1299.5 },
  { id: "p23", name: "Canvas Tote Bag", category: "Apparel", price: 349.75 },
  { id: "p24", name: "Linen Shirt", category: "Apparel", price: 1499 },
  { id: "p25", name: "Wool Pashmina Shawl", category: "Apparel", price: 2849 },
];

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === id);
}

export function listCategories(products: readonly Product[] = PRODUCTS): Category[] {
  return [...new Set(products.map((product) => product.category))].sort();
}
__FILE__

f tests/catalog/products.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";
import { getProductById, listCategories, PRODUCTS } from "../../src/catalog/products";

describe("product catalog", () => {
  it("ships with 25 products", () => {
    expect(PRODUCTS).toHaveLength(25);
  });

  it("uses unique product ids", () => {
    expect(new Set(PRODUCTS.map((product) => product.id)).size).toBe(PRODUCTS.length);
  });

  it("prices every product in rupees with at most two decimals", () => {
    for (const product of PRODUCTS) {
      expect(product.price).toBeGreaterThan(0);
      expect(Math.round(product.price * 100) / 100).toBe(product.price);
    }
  });

  it("looks up products by id", () => {
    expect(getProductById("p01")?.name).toBe("Ceramic Coffee Mug");
    expect(getProductById("nope")).toBeUndefined();
  });

  it("lists categories alphabetically", () => {
    expect(listCategories()).toEqual(["Apparel", "Electronics", "Fitness", "Home", "Kitchen", "Stationery"]);
  });
});
__FILE__
commit "feat(catalog): add seed product catalog"

# ---------------------------------------------------------------------------------------------
# 5. Search
# ---------------------------------------------------------------------------------------------
f src/catalog/search.ts <<'__FILE__'
import type { Product } from "./products";

/** Case-insensitive substring search over product name and category. */
export function searchProducts(products: readonly Product[], query: string): Product[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [...products];
  return products.filter(
    (product) =>
      product.name.toLowerCase().includes(needle) || product.category.toLowerCase().includes(needle),
  );
}
__FILE__

f tests/catalog/search.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";
import { PRODUCTS, type Product } from "../../src/catalog/products";
import { searchProducts } from "../../src/catalog/search";

const ids = (products: Product[]) => products.map((product) => product.id);

describe("searchProducts", () => {
  it("returns every product for an empty query", () => {
    expect(searchProducts(PRODUCTS, "")).toHaveLength(25);
  });

  it("treats a whitespace-only query as empty", () => {
    expect(searchProducts(PRODUCTS, "   ")).toHaveLength(25);
  });

  it("finds products by part of their name", () => {
    expect(ids(searchProducts(PRODUCTS, "Mug"))).toEqual(["p01"]);
  });

  it("finds products by category", () => {
    expect(searchProducts(PRODUCTS, "Kitchen")).toHaveLength(5);
  });

  it("ignores surrounding whitespace in the query", () => {
    expect(ids(searchProducts(PRODUCTS, "  Tawa "))).toEqual(["p03"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(searchProducts(PRODUCTS, "Laptop")).toEqual([]);
  });
});
__FILE__
commit "feat(catalog): add product search"

# ---------------------------------------------------------------------------------------------
# 6. Pagination
# ---------------------------------------------------------------------------------------------
f src/catalog/paginate.ts <<'__FILE__'
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
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (current - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: current,
    pageSize,
    totalItems: items.length,
    totalPages,
    hasPrev: current > 1,
    hasNext: current < totalPages,
  };
}
__FILE__

f tests/catalog/paginate.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";
import { paginate } from "../../src/catalog/paginate";
import { PRODUCTS } from "../../src/catalog/products";

const numbers = Array.from({ length: 10 }, (_, i) => i + 1);

describe("paginate", () => {
  it("returns the first page", () => {
    const page = paginate(numbers, 1, 4);
    expect(page.items).toEqual([1, 2, 3, 4]);
    expect(page.page).toBe(1);
  });

  it("returns a middle page", () => {
    expect(paginate(numbers, 2, 4).items).toEqual([5, 6, 7, 8]);
  });

  it("computes the total number of pages", () => {
    expect(paginate(numbers, 1, 4).totalPages).toBe(3);
    expect(paginate(numbers, 1, 5).totalPages).toBe(2);
  });

  it("clamps out-of-range page numbers", () => {
    expect(paginate(numbers, 99, 4).page).toBe(3);
    expect(paginate(numbers, 0, 4).page).toBe(1);
  });

  it("handles an empty list", () => {
    const page = paginate([], 1, 6);
    expect(page.items).toEqual([]);
    expect(page.totalPages).toBe(1);
  });

  it("rejects a non-positive page size", () => {
    expect(() => paginate(numbers, 1, 0)).toThrow(RangeError);
  });
});
__FILE__

f src/index.ts <<'__FILE__'
export * from "./catalog/paginate";
export * from "./catalog/products";
export * from "./catalog/search";
export * from "./currency/format";
export * from "./currency/money";
export * from "./tax/gst";
__FILE__
commit "feat(catalog): add pagination helper"

# ---------------------------------------------------------------------------------------------
# 7. Cart
# ---------------------------------------------------------------------------------------------
f src/cart/cart.ts <<'__FILE__'
import { getProductById } from "../catalog/products";

export interface CartItem {
  productId: string;
  name: string;
  /** Pre-tax unit price in rupees, captured when the item was added. */
  unitPrice: number;
  quantity: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  couponCode?: string;
}

let cartSeq = 0;

export function createCart(id: string = `cart-${++cartSeq}`): Cart {
  return { id, items: [] };
}

export class UnknownProductError extends Error {
  constructor(readonly productId: string) {
    super(`Unknown product: ${productId}`);
    this.name = "UnknownProductError";
  }
}

export class InvalidQuantityError extends Error {
  constructor(readonly quantity: unknown) {
    super(`Invalid quantity: ${String(quantity)}`);
    this.name = "InvalidQuantityError";
  }
}

export function addItem(cart: Cart, productId: string, quantity: number = 1): Cart {
  const qty = toQuantity(quantity);
  const product = getProductById(productId);
  if (!product) throw new UnknownProductError(productId);
  const existing = cart.items.find((item) => item.productId === productId);
  const items = existing
    ? cart.items.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + qty } : item,
      )
    : [...cart.items, { productId, name: product.name, unitPrice: product.price, quantity: qty }];
  return { ...cart, items };
}

export function setQuantity(cart: Cart, productId: string, quantity: number): Cart {
  if (!cart.items.some((item) => item.productId === productId)) throw new UnknownProductError(productId);
  if (quantity === 0) return removeItem(cart, productId);
  const qty = toQuantity(quantity);
  return {
    ...cart,
    items: cart.items.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item)),
  };
}

export function removeItem(cart: Cart, productId: string): Cart {
  return { ...cart, items: cart.items.filter((item) => item.productId !== productId) };
}

export function itemCount(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

function toQuantity(quantity: number): number {
  if (!Number.isInteger(quantity) || quantity < 1) throw new InvalidQuantityError(quantity);
  return quantity;
}
__FILE__

f tests/cart/cart.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";
import {
  addItem,
  createCart,
  InvalidQuantityError,
  itemCount,
  removeItem,
  setQuantity,
  UnknownProductError,
} from "../../src/cart/cart";

describe("cart", () => {
  it("starts empty", () => {
    const cart = createCart("c1");
    expect(cart.items).toEqual([]);
    expect(itemCount(cart)).toBe(0);
  });

  it("adds a product with a snapshot of its name and price", () => {
    const cart = addItem(createCart("c1"), "p01");
    expect(cart.items).toEqual([{ productId: "p01", name: "Ceramic Coffee Mug", unitPrice: 349, quantity: 1 }]);
  });

  it("adds several units at once", () => {
    expect(addItem(createCart("c1"), "p16", 3).items[0].quantity).toBe(3);
  });

  it("increments the quantity when the same product is added again", () => {
    const cart = addItem(addItem(createCart("c1"), "p01"), "p01", 2);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(3);
  });

  it("rejects unknown products", () => {
    expect(() => addItem(createCart("c1"), "p99")).toThrow(UnknownProductError);
  });

  it("rejects a quantity that is not a number", () => {
    expect(() => addItem(createCart("c1"), "p01", Number.NaN)).toThrow(InvalidQuantityError);
  });

  it("updates the quantity of a line", () => {
    const cart = setQuantity(addItem(createCart("c1"), "p01"), "p01", 4);
    expect(cart.items[0].quantity).toBe(4);
  });

  it("removes a line when its quantity is set to zero", () => {
    const cart = setQuantity(addItem(createCart("c1"), "p01"), "p01", 0);
    expect(cart.items).toEqual([]);
  });

  it("removes a line", () => {
    const cart = removeItem(addItem(addItem(createCart("c1"), "p01"), "p02"), "p01");
    expect(cart.items.map((item) => item.productId)).toEqual(["p02"]);
  });

  it("does not mutate the original cart", () => {
    const original = createCart("c1");
    const updated = addItem(original, "p01", 2);
    expect(original.items).toEqual([]);
    expect(itemCount(updated)).toBe(2);
  });
});
__FILE__
commit "feat(cart): add cart with add, update and remove"

# ---------------------------------------------------------------------------------------------
# 8. Totals
# ---------------------------------------------------------------------------------------------
f src/cart/totals.ts <<'__FILE__'
import { fromPaise, toPaise } from "../currency/money";
import { calculateGst } from "../tax/gst";
import type { Cart } from "./cart";

export const FREE_SHIPPING_THRESHOLD = 999;
export const SHIPPING_FEE = 49;

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

export function shippingFor(subtotal: number, lineCount: number): number {
  if (lineCount === 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export function computeTotals(cart: Cart): CartTotals {
  const subtotal = fromPaise(cart.items.reduce((sum, item) => sum + toPaise(item.unitPrice) * item.quantity, 0));
  const tax = calculateGst(subtotal);

  const shipping = shippingFor(subtotal, cart.items.length);
  const total = fromPaise(toPaise(subtotal) + toPaise(tax) + toPaise(shipping));
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return { itemCount, subtotal, tax, shipping, total };
}
__FILE__

f tests/cart/totals.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";
import { addItem, createCart } from "../../src/cart/cart";
import { computeTotals } from "../../src/cart/totals";

const cartWith = (...lines: Array<[string, number]>) =>
  lines.reduce((cart, [productId, quantity]) => addItem(cart, productId, quantity), createCart("totals"));

describe("computeTotals", () => {
  it("is all zeros for an empty cart", () => {
    expect(computeTotals(createCart("empty"))).toMatchObject({ itemCount: 0, subtotal: 0, tax: 0, shipping: 0, total: 0 });
  });

  it("adds 18% GST to the subtotal", () => {
    const totals = computeTotals(cartWith(["p01", 1]));
    expect(totals.subtotal).toBe(349);
    expect(totals.tax).toBe(62.82);
  });

  it("charges shipping below the free-shipping threshold", () => {
    expect(computeTotals(cartWith(["p16", 1])).shipping).toBe(49);
  });

  it("ships free at or above ₹999", () => {
    expect(computeTotals(cartWith(["p13", 1])).shipping).toBe(0);
  });

  it("computes the grand total", () => {
    expect(computeTotals(cartWith(["p02", 2]))).toMatchObject({
      subtotal: 1198,
      tax: 215.64,
      shipping: 0,
      total: 1413.64,
    });
  });

  it("totals several lines", () => {
    expect(computeTotals(cartWith(["p01", 2], ["p12", 1], ["p16", 3]))).toMatchObject({
      itemCount: 6,
      subtotal: 1594,
      tax: 286.92,
      total: 1880.92,
    });
  });
});
__FILE__

f src/index.ts <<'__FILE__'
export * from "./cart/cart";
export * from "./cart/totals";
export * from "./catalog/paginate";
export * from "./catalog/products";
export * from "./catalog/search";
export * from "./currency/format";
export * from "./currency/money";
export * from "./tax/gst";
__FILE__
commit "feat(cart): add cart totals with GST and shipping"

# ---------------------------------------------------------------------------------------------
# 9. Coupons
# ---------------------------------------------------------------------------------------------
f src/cart/coupons.ts <<'__FILE__'
import { fromPaise, toPaise } from "../currency/money";
import type { Cart } from "./cart";

/**
 * Active campaign coupons, in the format marketing uses in the promo sheet:
 * "10%" is a percentage off the subtotal, "200" is a flat amount in rupees.
 */
export const COUPON_RULES: Readonly<Record<string, string>> = {
  SAVE10: "10%",
  WELCOME15: "15%",
  FLAT200: "200",
  DIWALI60: "60%",
};

export class InvalidCouponError extends Error {
  constructor(readonly code: string) {
    super(`Coupon "${code}" is not valid`);
    this.name = "InvalidCouponError";
  }
}

export function normalizeCouponCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isKnownCoupon(code: string): boolean {
  return Object.hasOwn(COUPON_RULES, code);
}

/** Discount in rupees for a coupon code against a pre-tax subtotal. */
export function couponDiscount(subtotal: number, code?: string): number {
  if (!code) return 0;
  const rule = COUPON_RULES[code];
  const value = parseFloat(rule);
  if (rule.endsWith("%")) return fromPaise(Math.round((toPaise(subtotal) * value) / 100));
  return Math.min(value, subtotal);
}

export function applyCoupon(cart: Cart, input: string): Cart {
  const code = normalizeCouponCode(input);
  if (code && !isKnownCoupon(code)) throw new InvalidCouponError(input.trim());
  return { ...cart, couponCode: code };
}

export function removeCoupon(cart: Cart): Cart {
  return { ...cart, couponCode: undefined };
}
__FILE__

f src/cart/totals.ts <<'__FILE__'
import { fromPaise, toPaise } from "../currency/money";
import { calculateGst } from "../tax/gst";
import type { Cart } from "./cart";
import { couponDiscount } from "./coupons";

export const FREE_SHIPPING_THRESHOLD = 999;
export const SHIPPING_FEE = 49;

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
}

export function shippingFor(subtotal: number, lineCount: number): number {
  if (lineCount === 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export function computeTotals(cart: Cart): CartTotals {
  const subtotal = fromPaise(cart.items.reduce((sum, item) => sum + toPaise(item.unitPrice) * item.quantity, 0));
  const tax = calculateGst(subtotal);

  // Coupons come off the pre-tax subtotal; GST is charged on the list price.
  const discount = Math.min(couponDiscount(subtotal, cart.couponCode), subtotal);

  const shipping = shippingFor(subtotal, cart.items.length);
  const total = fromPaise(toPaise(subtotal) - toPaise(discount) + toPaise(tax) + toPaise(shipping));
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return { itemCount, subtotal, discount, tax, shipping, total };
}
__FILE__

f tests/cart/coupons.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";
import { addItem, createCart } from "../../src/cart/cart";
import { applyCoupon, InvalidCouponError, isKnownCoupon, removeCoupon } from "../../src/cart/coupons";
import { computeTotals } from "../../src/cart/totals";

// Bluetooth Speaker, ₹2,499.
const speakerCart = () => addItem(createCart("coupon"), "p13");

describe("coupons", () => {
  it("applies a percentage coupon to the subtotal", () => {
    expect(computeTotals(applyCoupon(speakerCart(), "SAVE10")).discount).toBe(249.9);
  });

  it("applies a flat coupon", () => {
    expect(computeTotals(applyCoupon(speakerCart(), "FLAT200")).discount).toBe(200);
  });

  it("accepts codes in any case with surrounding spaces", () => {
    expect(computeTotals(applyCoupon(speakerCart(), " save10 ")).discount).toBe(249.9);
  });

  it("rejects unknown coupon codes", () => {
    expect(() => applyCoupon(speakerCart(), "FREEBIE")).toThrow(InvalidCouponError);
  });

  it("removes an applied coupon", () => {
    expect(computeTotals(removeCoupon(applyCoupon(speakerCart(), "SAVE10"))).discount).toBe(0);
  });
});
__FILE__

f src/index.ts <<'__FILE__'
export * from "./cart/cart";
export * from "./cart/coupons";
export * from "./cart/totals";
export * from "./catalog/paginate";
export * from "./catalog/products";
export * from "./catalog/search";
export * from "./currency/format";
export * from "./currency/money";
export * from "./tax/gst";
__FILE__
commit "feat(cart): support coupon codes"

# ---------------------------------------------------------------------------------------------
# 10. More coupon tests
# ---------------------------------------------------------------------------------------------
f tests/cart/coupons.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";
import { addItem, createCart } from "../../src/cart/cart";
import { applyCoupon, InvalidCouponError, isKnownCoupon, removeCoupon } from "../../src/cart/coupons";
import { computeTotals } from "../../src/cart/totals";

// Bluetooth Speaker, ₹2,499.
const speakerCart = () => addItem(createCart("coupon"), "p13");

describe("coupons", () => {
  it("applies a percentage coupon to the subtotal", () => {
    expect(computeTotals(applyCoupon(speakerCart(), "SAVE10")).discount).toBe(249.9);
  });

  it("applies a flat coupon", () => {
    expect(computeTotals(applyCoupon(speakerCart(), "FLAT200")).discount).toBe(200);
  });

  it("accepts codes in any case with surrounding spaces", () => {
    expect(computeTotals(applyCoupon(speakerCart(), " save10 ")).discount).toBe(249.9);
  });

  it("rejects unknown coupon codes", () => {
    expect(() => applyCoupon(speakerCart(), "FREEBIE")).toThrow(InvalidCouponError);
  });

  it("removes an applied coupon", () => {
    expect(computeTotals(removeCoupon(applyCoupon(speakerCart(), "SAVE10"))).discount).toBe(0);
  });

  it("caps a flat coupon at the subtotal", () => {
    const cart = addItem(createCart("small"), "p16"); // ₹199
    expect(computeTotals(applyCoupon(cart, "FLAT200")).discount).toBe(199);
  });

  it("rounds percentage discounts to the nearest paisa", () => {
    const cart = addItem(createCart("candle"), "p10"); // ₹249.75 → 10% = ₹24.975
    expect(computeTotals(applyCoupon(cart, "SAVE10")).discount).toBe(24.98);
  });

  it("recognises every active campaign code", () => {
    for (const code of ["SAVE10", "WELCOME15", "FLAT200", "DIWALI60"]) {
      expect(isKnownCoupon(code)).toBe(true);
    }
    expect(isKnownCoupon("save10")).toBe(false);
  });

  it("takes the discount off the total after GST and shipping", () => {
    expect(computeTotals(applyCoupon(speakerCart(), "WELCOME15"))).toMatchObject({
      subtotal: 2499,
      discount: 374.85,
      tax: 449.82,
      shipping: 0,
      total: 2573.97,
    });
  });
});
__FILE__
commit "test(cart): cover coupon rounding, caps and campaign codes"

# ---------------------------------------------------------------------------------------------
# 11. BUG #1 — refactor coupon rule parsing (empty code now yields NaN)
# ---------------------------------------------------------------------------------------------
f src/cart/coupons.ts <<'__FILE__'
import { fromPaise, toPaise } from "../currency/money";
import type { Cart } from "./cart";

/**
 * Active campaign coupons, in the format marketing uses in the promo sheet:
 * "10%" is a percentage off the subtotal, "200" is a flat amount in rupees.
 */
export const COUPON_RULES: Readonly<Record<string, string>> = {
  SAVE10: "10%",
  WELCOME15: "15%",
  FLAT200: "200",
  DIWALI60: "60%",
};

export class InvalidCouponError extends Error {
  constructor(readonly code: string) {
    super(`Coupon "${code}" is not valid`);
    this.name = "InvalidCouponError";
  }
}

export function normalizeCouponCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isKnownCoupon(code: string): boolean {
  return Object.hasOwn(COUPON_RULES, code);
}

export interface CouponRule {
  kind: "percent" | "flat";
  value: number;
}

const PERCENT_SUFFIX = /%$/;

/** Parses a promo-sheet rule such as "10%" or "200". */
export function parseCouponRule(rule: string): CouponRule {
  const value = parseFloat(rule);
  return PERCENT_SUFFIX.test(rule) ? { kind: "percent", value } : { kind: "flat", value };
}

/** Discount in rupees for a coupon code against a pre-tax subtotal. */
export function couponDiscount(subtotal: number, code?: string): number {
  if (code === undefined) return 0;
  const rule = parseCouponRule(COUPON_RULES[code]);
  if (rule.kind === "percent") return fromPaise(Math.round((toPaise(subtotal) * rule.value) / 100));
  return Math.min(rule.value, subtotal);
}

export function applyCoupon(cart: Cart, input: string): Cart {
  const code = normalizeCouponCode(input);
  if (code && !isKnownCoupon(code)) throw new InvalidCouponError(input.trim());
  return { ...cart, couponCode: code };
}

export function removeCoupon(cart: Cart): Cart {
  return { ...cart, couponCode: undefined };
}
__FILE__

f tests/cart/couponRules.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";
import { parseCouponRule } from "../../src/cart/coupons";

describe("parseCouponRule", () => {
  it("parses percentage rules", () => {
    expect(parseCouponRule("10%")).toEqual({ kind: "percent", value: 10 });
  });

  it("parses flat rupee rules", () => {
    expect(parseCouponRule("200")).toEqual({ kind: "flat", value: 200 });
  });

  it("keeps fractional percentages", () => {
    expect(parseCouponRule("12.5%")).toEqual({ kind: "percent", value: 12.5 });
  });
});
__FILE__
bug_commit 1 "refactor(coupons): extract coupon rule parser"

# ---------------------------------------------------------------------------------------------
# 12. Delivery estimate
# ---------------------------------------------------------------------------------------------
f src/delivery/estimate.ts <<'__FILE__'
export const DELIVERY_TIME_ZONE = "Asia/Kolkata";
/** Orders placed at or after 20:00 IST are dispatched the next day. */
export const DISPATCH_CUTOFF_HOUR = 20;
export const DEFAULT_TRANSIT_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

interface CalendarTime {
  year: number;
  month: number;
  day: number;
  hour: number;
}

/** Wall-clock date and hour of an instant in India Standard Time. */
function istCalendar(instant: Date): CalendarTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DELIVERY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") };
}

function addDeliveryDays(start: number, days: number): number {
  return start + days * DAY_MS;
}

function toIsoDate(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/**
 * Estimated delivery date (YYYY-MM-DD, IST calendar) for an order placed at `orderedAt`.
 * Dispatch happens on the IST order date, or the next day after the 8 PM cutoff.
 */
export function estimateDelivery(orderedAt: Date, transitDays: number = DEFAULT_TRANSIT_DAYS): string {
  const { year, month, day, hour } = istCalendar(orderedAt);
  let dispatch = Date.UTC(year, month - 1, day);
  if (hour >= DISPATCH_CUTOFF_HOUR) dispatch += DAY_MS;
  return toIsoDate(addDeliveryDays(dispatch, transitDays));
}
__FILE__

f tests/delivery/estimate.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";
import { estimateDelivery } from "../../src/delivery/estimate";

// 10 March 2026 is a Tuesday.
describe("estimateDelivery", () => {
  it("adds three days of transit to a morning order", () => {
    expect(estimateDelivery(new Date("2026-03-10T10:00:00+05:30"))).toBe("2026-03-13");
  });

  it("supports a custom transit time", () => {
    expect(estimateDelivery(new Date("2026-03-10T10:00:00+05:30"), 1)).toBe("2026-03-11");
  });

  it("uses the IST calendar date for early-morning orders", () => {
    // 01:00 IST on the 10th is still the 9th in UTC.
    expect(estimateDelivery(new Date("2026-03-10T01:00:00+05:30"))).toBe("2026-03-13");
  });

  it("returns an ISO calendar date", () => {
    expect(estimateDelivery(new Date())).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
__FILE__
commit "feat(delivery): estimate delivery date in Asia/Kolkata"

# ---------------------------------------------------------------------------------------------
# 13. Skip Sundays
# ---------------------------------------------------------------------------------------------
f src/delivery/estimate.ts <<'__FILE__'
export const DELIVERY_TIME_ZONE = "Asia/Kolkata";
/** Orders placed at or after 20:00 IST are dispatched the next day. */
export const DISPATCH_CUTOFF_HOUR = 20;
export const DEFAULT_TRANSIT_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;
const SUNDAY = 0;

interface CalendarTime {
  year: number;
  month: number;
  day: number;
  hour: number;
}

/** Wall-clock date and hour of an instant in India Standard Time. */
function istCalendar(instant: Date): CalendarTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DELIVERY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") };
}

/** Couriers do not deliver on Sundays, so Sundays are not counted as transit days. */
function addDeliveryDays(start: number, days: number): number {
  let day = start;
  for (let added = 0; added < days; ) {
    day += DAY_MS;
    if (new Date(day).getUTCDay() !== SUNDAY) added++;
  }
  return day;
}

function toIsoDate(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/**
 * Estimated delivery date (YYYY-MM-DD, IST calendar) for an order placed at `orderedAt`.
 * Dispatch happens on the IST order date, or the next day after the 8 PM cutoff.
 */
export function estimateDelivery(orderedAt: Date, transitDays: number = DEFAULT_TRANSIT_DAYS): string {
  const { year, month, day, hour } = istCalendar(orderedAt);
  let dispatch = Date.UTC(year, month - 1, day);
  if (hour >= DISPATCH_CUTOFF_HOUR) dispatch += DAY_MS;
  return toIsoDate(addDeliveryDays(dispatch, transitDays));
}

const displayFormat = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "2026-03-16" → "Mon, 16 Mar". */
export function formatDeliveryDate(isoDate: string): string {
  return displayFormat.format(new Date(`${isoDate}T00:00:00Z`));
}
__FILE__

f tests/delivery/estimate.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";
import { estimateDelivery, formatDeliveryDate } from "../../src/delivery/estimate";

// 10 March 2026 is a Tuesday.
describe("estimateDelivery", () => {
  it("adds three days of transit to a morning order", () => {
    expect(estimateDelivery(new Date("2026-03-10T10:00:00+05:30"))).toBe("2026-03-13");
  });

  it("supports a custom transit time", () => {
    expect(estimateDelivery(new Date("2026-03-10T10:00:00+05:30"), 1)).toBe("2026-03-11");
  });

  it("uses the IST calendar date for early-morning orders", () => {
    // 01:00 IST on the 10th is still the 9th in UTC.
    expect(estimateDelivery(new Date("2026-03-10T01:00:00+05:30"))).toBe("2026-03-13");
  });

  it("returns an ISO calendar date", () => {
    expect(estimateDelivery(new Date())).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("does not deliver on Sundays", () => {
    // Thursday + 3 would land on Sunday the 15th.
    expect(estimateDelivery(new Date("2026-03-12T11:00:00+05:30"))).toBe("2026-03-16");
  });

  it("does not count Sunday as a transit day", () => {
    expect(estimateDelivery(new Date("2026-03-13T09:30:00+05:30"))).toBe("2026-03-17");
  });

  it("rolls a Saturday next-day delivery to Monday", () => {
    expect(estimateDelivery(new Date("2026-03-14T12:00:00+05:30"), 1)).toBe("2026-03-16");
  });
});

describe("formatDeliveryDate", () => {
  it("formats delivery dates for display", () => {
    expect(formatDeliveryDate("2026-03-16")).toBe("Mon, 16 Mar");
  });
});
__FILE__
commit "feat(delivery): skip Sundays when estimating delivery"

# ---------------------------------------------------------------------------------------------
# 14. Orders
# ---------------------------------------------------------------------------------------------
f src/orders/payments.ts <<'__FILE__'
export interface PaymentResult {
  paymentId: string;
}

export interface PaymentGateway {
  charge(amount: number, reference: string): Promise<PaymentResult>;
}

/** In-memory gateway that approves every charge, optionally after a simulated delay. */
export class FakePaymentGateway implements PaymentGateway {
  readonly charges: Array<{ amount: number; reference: string }> = [];
  private seq = 0;

  constructor(private readonly latencyMs = 0) {}

  async charge(amount: number, reference: string): Promise<PaymentResult> {
    if (this.latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    this.charges.push({ amount, reference });
    return { paymentId: `pay_${String(++this.seq).padStart(6, "0")}` };
  }
}
__FILE__

f src/orders/service.ts <<'__FILE__'
import type { Cart, CartItem } from "../cart/cart";
import { computeTotals, type CartTotals } from "../cart/totals";
import { estimateDelivery } from "../delivery/estimate";
import { FakePaymentGateway, type PaymentGateway } from "./payments";

export interface Order {
  id: string;
  cartId: string;
  items: CartItem[];
  totals: CartTotals;
  paymentId: string;
  /** ISO timestamp. */
  placedAt: string;
  /** YYYY-MM-DD in IST. */
  estimatedDelivery: string;
}

export class EmptyCartError extends Error {
  constructor() {
    super("Cannot place an order for an empty cart");
    this.name = "EmptyCartError";
  }
}

export class DuplicateOrderError extends Error {
  constructor(readonly cartId: string) {
    super(`Cart ${cartId} has already been ordered`);
    this.name = "DuplicateOrderError";
  }
}

export interface OrderServiceOptions {
  payments?: PaymentGateway;
  clock?: () => Date;
}

export class OrderService {
  private readonly orders: Order[] = [];
  private readonly inFlight = new Map<string, Promise<Order>>();
  private readonly payments: PaymentGateway;
  private readonly clock: () => Date;
  private seq = 0;

  constructor(options: OrderServiceOptions = {}) {
    this.payments = options.payments ?? new FakePaymentGateway();
    this.clock = options.clock ?? (() => new Date());
  }

  /** Places an order for the cart. Concurrent calls for the same cart share one submission. */
  placeOrder(cart: Cart): Promise<Order> {
    const pending = this.inFlight.get(cart.id);
    if (pending) return pending;
    const submission = this.submit(cart).finally(() => this.inFlight.delete(cart.id));
    this.inFlight.set(cart.id, submission);
    return submission;
  }

  listOrders(): Order[] {
    return [...this.orders];
  }

  private async submit(cart: Cart): Promise<Order> {
    if (cart.items.length === 0) throw new EmptyCartError();
    if (this.orders.some((order) => order.cartId === cart.id)) throw new DuplicateOrderError(cart.id);
    const totals = computeTotals(cart);
    const placedAt = this.clock();
    const { paymentId } = await this.payments.charge(totals.total, cart.id);
    const order: Order = {
      id: `ORD-${String(++this.seq).padStart(4, "0")}`,
      cartId: cart.id,
      items: cart.items.map((item) => ({ ...item })),
      totals,
      paymentId,
      placedAt: placedAt.toISOString(),
      estimatedDelivery: estimateDelivery(placedAt),
    };
    this.orders.push(order);
    return order;
  }
}
__FILE__

f tests/orders/service.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";
import { addItem, createCart } from "../../src/cart/cart";
import { computeTotals } from "../../src/cart/totals";
import { FakePaymentGateway } from "../../src/orders/payments";
import { DuplicateOrderError, EmptyCartError, OrderService } from "../../src/orders/service";

const MORNING_IST = new Date("2026-03-10T10:00:00+05:30");

function setup() {
  const payments = new FakePaymentGateway();
  const service = new OrderService({ payments, clock: () => MORNING_IST });
  return { payments, service };
}

const cartFor = (id: string) => addItem(addItem(createCart(id), "p01", 2), "p12");

describe("OrderService", () => {
  it("places an order with the cart's items and totals", async () => {
    const { service } = setup();
    const order = await service.placeOrder(cartFor("o1"));
    expect(order.totals).toEqual(computeTotals(cartFor("o1")));
    expect(order.items.map((item) => item.productId)).toEqual(["p01", "p12"]);
  });

  it("numbers orders sequentially", async () => {
    const { service } = setup();
    const first = await service.placeOrder(cartFor("o1"));
    const second = await service.placeOrder(cartFor("o2"));
    expect([first.id, second.id]).toEqual(["ORD-0001", "ORD-0002"]);
  });

  it("rejects an empty cart", async () => {
    const { service } = setup();
    await expect(service.placeOrder(createCart("empty"))).rejects.toThrow(EmptyCartError);
  });

  it("refuses to order the same cart twice", async () => {
    const { service } = setup();
    const cart = cartFor("o1");
    await service.placeOrder(cart);
    await expect(service.placeOrder(cart)).rejects.toThrow(DuplicateOrderError);
  });

  it("charges the payment gateway for the order total", async () => {
    const { payments, service } = setup();
    const order = await service.placeOrder(cartFor("o1"));
    expect(payments.charges).toEqual([{ amount: order.totals.total, reference: "o1" }]);
  });

  it("records when the order was placed", async () => {
    const { service } = setup();
    expect((await service.placeOrder(cartFor("o1"))).placedAt).toBe(MORNING_IST.toISOString());
  });

  it("estimates delivery from the order time", async () => {
    const { service } = setup();
    expect((await service.placeOrder(cartFor("o1"))).estimatedDelivery).toBe("2026-03-13");
  });
});
__FILE__

f src/index.ts <<'__FILE__'
export * from "./cart/cart";
export * from "./cart/coupons";
export * from "./cart/totals";
export * from "./catalog/paginate";
export * from "./catalog/products";
export * from "./catalog/search";
export * from "./currency/format";
export * from "./currency/money";
export * from "./delivery/estimate";
export * from "./orders/payments";
export * from "./orders/service";
export * from "./tax/gst";
__FILE__
commit "feat(orders): add order placement with payment gateway"

# ---------------------------------------------------------------------------------------------
# 15. Order list
# ---------------------------------------------------------------------------------------------
f src/orders/service.ts <<'__FILE__'
import type { Cart, CartItem } from "../cart/cart";
import { computeTotals, type CartTotals } from "../cart/totals";
import { estimateDelivery } from "../delivery/estimate";
import { FakePaymentGateway, type PaymentGateway } from "./payments";

export interface Order {
  id: string;
  cartId: string;
  items: CartItem[];
  totals: CartTotals;
  paymentId: string;
  /** ISO timestamp. */
  placedAt: string;
  /** YYYY-MM-DD in IST. */
  estimatedDelivery: string;
}

export class EmptyCartError extends Error {
  constructor() {
    super("Cannot place an order for an empty cart");
    this.name = "EmptyCartError";
  }
}

export class DuplicateOrderError extends Error {
  constructor(readonly cartId: string) {
    super(`Cart ${cartId} has already been ordered`);
    this.name = "DuplicateOrderError";
  }
}

export interface OrderServiceOptions {
  payments?: PaymentGateway;
  clock?: () => Date;
}

export class OrderService {
  private readonly orders: Order[] = [];
  private readonly inFlight = new Map<string, Promise<Order>>();
  private readonly payments: PaymentGateway;
  private readonly clock: () => Date;
  private seq = 0;

  constructor(options: OrderServiceOptions = {}) {
    this.payments = options.payments ?? new FakePaymentGateway();
    this.clock = options.clock ?? (() => new Date());
  }

  /** Places an order for the cart. Concurrent calls for the same cart share one submission. */
  placeOrder(cart: Cart): Promise<Order> {
    const pending = this.inFlight.get(cart.id);
    if (pending) return pending;
    const submission = this.submit(cart).finally(() => this.inFlight.delete(cart.id));
    this.inFlight.set(cart.id, submission);
    return submission;
  }

  /** All orders, newest first. */
  listOrders(): Order[] {
    return [...this.orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt) || b.id.localeCompare(a.id));
  }

  getOrder(id: string): Order | undefined {
    return this.orders.find((order) => order.id === id);
  }

  private async submit(cart: Cart): Promise<Order> {
    if (cart.items.length === 0) throw new EmptyCartError();
    if (this.orders.some((order) => order.cartId === cart.id)) throw new DuplicateOrderError(cart.id);
    const totals = computeTotals(cart);
    const placedAt = this.clock();
    const { paymentId } = await this.payments.charge(totals.total, cart.id);
    const order: Order = {
      id: `ORD-${String(++this.seq).padStart(4, "0")}`,
      cartId: cart.id,
      items: cart.items.map((item) => ({ ...item })),
      totals,
      paymentId,
      placedAt: placedAt.toISOString(),
      estimatedDelivery: estimateDelivery(placedAt),
    };
    this.orders.push(order);
    return order;
  }
}
__FILE__

cat >>tests/orders/service.test.ts <<'__FILE__'

describe("OrderService order history", () => {
  it("lists orders newest first", async () => {
    let now = Date.parse("2026-03-10T09:00:00+05:30");
    const service = new OrderService({ clock: () => new Date((now += 60_000)) });
    await service.placeOrder(cartFor("a"));
    await service.placeOrder(cartFor("b"));
    await service.placeOrder(cartFor("c"));
    expect(service.listOrders().map((order) => order.cartId)).toEqual(["c", "b", "a"]);
  });

  it("looks up an order by id", async () => {
    const { service } = setup();
    const order = await service.placeOrder(cartFor("o1"));
    expect(service.getOrder(order.id)).toEqual(order);
    expect(service.getOrder("ORD-9999")).toBeUndefined();
  });
});
__FILE__
commit "feat(orders): list orders newest first"

# ---------------------------------------------------------------------------------------------
# 16. Line items
# ---------------------------------------------------------------------------------------------
f src/cart/lineItems.ts <<'__FILE__'
import { roundMoney } from "../currency/money";
import type { Cart, CartItem } from "./cart";

export interface LineItem extends CartItem {
  /** unitPrice × quantity, in rupees. */
  lineTotal: number;
}

export function lineItems(cart: Cart): LineItem[] {
  return cart.items.map((item) => ({ ...item, lineTotal: roundMoney(item.unitPrice * item.quantity) }));
}

export function sumBy<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((sum, item) => sum + pick(item), 0);
}
__FILE__

f tests/cart/lineItems.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";
import { addItem, createCart } from "../../src/cart/cart";
import { lineItems, sumBy } from "../../src/cart/lineItems";

describe("lineItems", () => {
  it("computes a line total for every cart line", () => {
    const cart = addItem(addItem(createCart("lines"), "p01", 2), "p17", 3);
    expect(lineItems(cart).map((line) => line.lineTotal)).toEqual([698, 447.75]);
  });

  it("is empty for an empty cart", () => {
    expect(lineItems(createCart("lines"))).toEqual([]);
  });
});

describe("sumBy", () => {
  it("sums a numeric field", () => {
    expect(sumBy([{ n: 1 }, { n: 2 }, { n: 3 }], (item) => item.n)).toBe(6);
  });
});
__FILE__

f src/index.ts <<'__FILE__'
export * from "./cart/cart";
export * from "./cart/coupons";
export * from "./cart/lineItems";
export * from "./cart/totals";
export * from "./catalog/paginate";
export * from "./catalog/products";
export * from "./catalog/search";
export * from "./currency/format";
export * from "./currency/money";
export * from "./delivery/estimate";
export * from "./orders/payments";
export * from "./orders/service";
export * from "./tax/gst";
__FILE__
commit "feat(cart): expose line items with line totals"

# ---------------------------------------------------------------------------------------------
# 17. BUG #2 — totals summed from line items in floating point
# ---------------------------------------------------------------------------------------------
f src/cart/totals.ts <<'__FILE__'
import { fromPaise, roundMoney, toPaise } from "../currency/money";
import { GST_RATE } from "../tax/gst";
import type { Cart } from "./cart";
import { couponDiscount } from "./coupons";
import { lineItems, sumBy } from "./lineItems";

export const FREE_SHIPPING_THRESHOLD = 999;
export const SHIPPING_FEE = 49;

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
}

export function shippingFor(subtotal: number, lineCount: number): number {
  if (lineCount === 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export function computeTotals(cart: Cart): CartTotals {
  const lines = lineItems(cart);
  const subtotal = roundMoney(sumBy(lines, (line) => line.lineTotal));
  const tax = roundMoney(sumBy(lines, (line) => line.lineTotal * GST_RATE));

  // Coupons come off the pre-tax subtotal; GST is charged on the list price.
  const discount = Math.min(couponDiscount(subtotal, cart.couponCode), subtotal);

  const shipping = shippingFor(subtotal, cart.items.length);
  const total = fromPaise(toPaise(subtotal) - toPaise(discount) + toPaise(tax) + toPaise(shipping));
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return { itemCount, subtotal, discount, tax, shipping, total };
}
__FILE__

cat >>tests/cart/totals.test.ts <<'__FILE__'

describe("computeTotals with multiple line items", () => {
  it("sums the line totals into the subtotal", () => {
    const totals = computeTotals(cartWith(["p01", 1], ["p16", 2], ["p06", 1]));
    expect(totals.subtotal).toBe(349 + 398 + 399);
    expect(totals.itemCount).toBe(4);
  });
});
__FILE__
bug_commit 2 "feat(cart): sum multiple line items in cart totals"

# ---------------------------------------------------------------------------------------------
# 18. Currency tests
# ---------------------------------------------------------------------------------------------
cat >>tests/currency/format.test.ts <<'__FILE__'

describe("formatINR edge cases", () => {
  it("groups crores", () => {
    expect(formatINR(10_000_000)).toBe("₹1,00,00,000.00");
  });

  it("hides floating-point noise", () => {
    expect(formatINR(19.99 * 3)).toBe("₹59.97");
  });

  it("formats fractional discounts", () => {
    expect(formatDiscount(24.98)).toBe("−₹24.98");
  });
});
__FILE__
commit "test(currency): cover crore grouping and display rounding"

# ---------------------------------------------------------------------------------------------
# 19. BUG #5 — memoized search index drops case folding
# ---------------------------------------------------------------------------------------------
f src/catalog/search.ts <<'__FILE__'
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
  const needle = query.trim();
  if (needle === "") return [...products];
  return indexFor(products)
    .filter((entry) => entry.haystack.includes(needle))
    .map((entry) => entry.product);
}
__FILE__
bug_commit 5 "perf(catalog): memoize search index"

# ---------------------------------------------------------------------------------------------
# 20. BUG #6 — quantity parsing drops the lower bound
# ---------------------------------------------------------------------------------------------
f src/cart/cart.ts <<'__FILE__'
import { getProductById } from "../catalog/products";

export interface CartItem {
  productId: string;
  name: string;
  /** Pre-tax unit price in rupees, captured when the item was added. */
  unitPrice: number;
  quantity: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  couponCode?: string;
}

let cartSeq = 0;

export function createCart(id: string = `cart-${++cartSeq}`): Cart {
  return { id, items: [] };
}

export class UnknownProductError extends Error {
  constructor(readonly productId: string) {
    super(`Unknown product: ${productId}`);
    this.name = "UnknownProductError";
  }
}

export class InvalidQuantityError extends Error {
  constructor(readonly quantity: unknown) {
    super(`Invalid quantity: ${String(quantity)}`);
    this.name = "InvalidQuantityError";
  }
}

export function addItem(cart: Cart, productId: string, quantity: number | string = 1): Cart {
  const qty = parseQuantity(quantity);
  const product = getProductById(productId);
  if (!product) throw new UnknownProductError(productId);
  const existing = cart.items.find((item) => item.productId === productId);
  const items = existing
    ? cart.items.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + qty } : item,
      )
    : [...cart.items, { productId, name: product.name, unitPrice: product.price, quantity: qty }];
  return { ...cart, items };
}

export function setQuantity(cart: Cart, productId: string, quantity: number | string): Cart {
  if (!cart.items.some((item) => item.productId === productId)) throw new UnknownProductError(productId);
  const qty = parseQuantity(quantity);
  if (qty === 0) return removeItem(cart, productId);
  return {
    ...cart,
    items: cart.items.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item)),
  };
}

export function removeItem(cart: Cart, productId: string): Cart {
  return { ...cart, items: cart.items.filter((item) => item.productId !== productId) };
}

export function itemCount(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Quantities arrive as numbers from code and as strings from form fields and JSON payloads. */
export function parseQuantity(input: number | string): number {
  const value = typeof input === "string" ? Number(input.trim()) : input;
  if (!Number.isFinite(value)) throw new InvalidQuantityError(input);
  return Math.trunc(value);
}
__FILE__

cat >>tests/cart/cart.test.ts <<'__FILE__'

describe("quantities from form input", () => {
  it("accepts a quantity typed into a form field", () => {
    expect(addItem(createCart("form"), "p01", "2").items[0].quantity).toBe(2);
  });

  it("trims whitespace around a typed quantity", () => {
    const cart = setQuantity(addItem(createCart("form"), "p01"), "p01", " 5 ");
    expect(cart.items[0].quantity).toBe(5);
  });
});
__FILE__
bug_commit 6 "refactor(cart): accept numeric strings for quantities"

# ---------------------------------------------------------------------------------------------
# 21. UI scaffold: catalog, search, pagination
# ---------------------------------------------------------------------------------------------
f package.json <<'__FILE__'
{
  "name": "shoplite",
  "version": "0.1.0",
  "private": true,
  "description": "A tiny in-memory shop: catalog, cart, coupons, GST, delivery estimates and orders.",
  "license": "MIT",
  "type": "module",
  "engines": {
    "node": "^22.12.0 || >=24.0.0"
  },
  "workspaces": [
    "ui"
  ],
  "scripts": {
    "dev": "npm run dev -w ui",
    "build": "tsc --noEmit && npm run build -w ui",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vitest": "^5.0.2"
  }
}
__FILE__

f ui/package.json <<'__FILE__'
{
  "name": "shoplite-ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^8.0.0"
  }
}
__FILE__

f ui/index.html <<'__FILE__'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ShopLite</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <header class="topbar">
      <div class="brand"><span class="logo">S</span> ShopLite</div>
      <input id="search" type="search" placeholder="Search products…" autocomplete="off" aria-label="Search products" />
    </header>
    <main class="layout">
      <section class="catalog" aria-label="Products">
        <div id="product-grid" class="grid"></div>
        <nav id="pager" class="pager" aria-label="Pagination"></nav>
      </section>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
__FILE__

f ui/src/style.css <<'__FILE__'
:root {
  --bg: #f6f5f2;
  --panel: #ffffff;
  --ink: #1f2328;
  --muted: #6b7280;
  --line: #e5e2dc;
  --accent: #c2410c;
  --accent-ink: #ffffff;
  --good: #15803d;
  --bad: #b91c1c;
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--ink);
  background: var(--bg);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
}

button {
  font: inherit;
  cursor: pointer;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 14px 28px;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  z-index: 1;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 20px;
}

.logo {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--accent);
  color: var(--accent-ink);
}

#search {
  flex: 1;
  max-width: 480px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  font: inherit;
  background: var(--bg);
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 24px;
  padding: 24px 28px;
  max-width: 1280px;
  margin: 0 auto;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card h3 {
  margin: 6px 0 0;
  font-size: 15px;
}

.thumb {
  height: 110px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 28px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.45);
  background: #ece7df;
}

.thumb-kitchen { background: #fde7d7; }
.thumb-home { background: #e4efe3; }
.thumb-electronics { background: #dde8f7; }
.thumb-stationery { background: #f3e8fb; }
.thumb-fitness { background: #fdf3c9; }
.thumb-apparel { background: #fbe0e6; }

.category {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.price {
  margin: 0;
  font-weight: 600;
}

.add,
.primary,
.coupon button {
  border: none;
  border-radius: 8px;
  padding: 9px 12px;
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 600;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  color: var(--muted);
  font-size: 14px;
}

.pager button {
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 8px;
  padding: 8px 14px;
}

.pager button:disabled {
  opacity: 0.4;
  cursor: default;
}

.empty {
  color: var(--muted);
}

.cart,
.orders {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 18px;
  align-self: start;
}

.orders {
  grid-column: 1 / -1;
}

.cart h2,
.orders h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

.lines {
  list-style: none;
  margin: 0;
  padding: 0;
}

.line {
  display: grid;
  grid-template-columns: 1fr 56px 88px 24px;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
  font-size: 14px;
}

.line small {
  display: block;
  color: var(--muted);
}

.qty {
  width: 56px;
  padding: 4px 6px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font: inherit;
}

.line-total {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.remove,
.link {
  border: none;
  background: none;
  color: var(--muted);
  padding: 0;
}

.link {
  text-decoration: underline;
  margin-left: 8px;
}

.coupon {
  display: flex;
  gap: 8px;
  margin: 14px 0 6px;
}

.coupon input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font: inherit;
  text-transform: uppercase;
}

.coupon-status {
  min-height: 22px;
  font-size: 13px;
}

.coupon-status .applied {
  color: var(--good);
}

.coupon-status .error {
  color: var(--bad);
}

.chip {
  display: inline-block;
  margin-right: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #dcfce7;
  color: var(--good);
  font-weight: 600;
}

.totals {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 12px;
  margin: 12px 0;
  font-size: 14px;
}

.totals dt,
.totals dd {
  margin: 0;
}

.totals dd {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.totals .discount {
  color: var(--good);
}

.totals .grand {
  font-size: 18px;
  font-weight: 700;
  padding-top: 8px;
  border-top: 1px solid var(--line);
}

.delivery {
  font-size: 13px;
  color: var(--muted);
}

.primary {
  width: 100%;
  padding: 12px;
  font-size: 16px;
}

.order-status {
  min-height: 20px;
  font-size: 13px;
  color: var(--muted);
}

.order-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.order {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 14px;
}

.order-head {
  display: flex;
  justify-content: space-between;
}

.order-meta,
.order-items {
  font-size: 13px;
  color: var(--muted);
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
__FILE__

f ui/src/dom.ts <<'__FILE__'
type Child = Node | string;

/** Tiny element factory so the views stay readable without a framework. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

export function $<T extends HTMLElement = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing element ${selector}`);
  return node;
}
__FILE__

f ui/src/catalogView.ts <<'__FILE__'
import { paginate } from "../../src/catalog/paginate";
import { PRODUCTS, type Product } from "../../src/catalog/products";
import { searchProducts } from "../../src/catalog/search";
import { formatINR } from "../../src/currency/format";
import { $, el } from "./dom";

export const PAGE_SIZE = 6;

export interface CatalogProps {
  query: string;
  page: number;
  onPage(page: number): void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function productCard(product: Product): HTMLElement {
  return el(
    "article",
    { className: "card" },
    el("div", { className: `thumb thumb-${product.category.toLowerCase()}` }, initials(product.name)),
    el("h3", {}, product.name),
    el("p", { className: "category" }, product.category),
    el("p", { className: "price" }, formatINR(product.price)),
  );
}

export function renderCatalog({ query, page, onPage }: CatalogProps): void {
  const results = searchProducts(PRODUCTS, query);
  const current = paginate(results, page, PAGE_SIZE);

  const grid = $("#product-grid");
  if (results.length === 0) {
    grid.replaceChildren(el("p", { className: "empty" }, `No products match “${query.trim()}”.`));
  } else {
    grid.replaceChildren(...current.items.map(productCard));
  }

  const first = current.totalItems === 0 ? 0 : (current.page - 1) * current.pageSize + 1;
  const last = current.totalItems === 0 ? 0 : first + current.items.length - 1;
  $("#pager").replaceChildren(
    el("button", { type: "button", disabled: !current.hasPrev, onclick: () => onPage(current.page - 1) }, "‹ Prev"),
    el(
      "span",
      { className: "pager-info" },
      `Page ${current.page} of ${current.totalPages} · Showing ${first}–${last} of ${current.totalItems}`,
    ),
    el("button", { type: "button", disabled: !current.hasNext, onclick: () => onPage(current.page + 1) }, "Next ›"),
  );
}
__FILE__

f ui/src/main.ts <<'__FILE__'
import { renderCatalog } from "./catalogView";
import { $ } from "./dom";

let query = "";
let page = 1;

function render(): void {
  renderCatalog({
    query,
    page,
    onPage: (next) => {
      page = next;
      render();
    },
  });
}

const search = $<HTMLInputElement>("#search");
search.addEventListener("input", () => {
  query = search.value;
  page = 1;
  render();
});

render();
__FILE__

npm_install
commit "feat(ui): scaffold Vite UI with catalog, search and pagination"

# ---------------------------------------------------------------------------------------------
# 22. UI cart panel
# ---------------------------------------------------------------------------------------------
f ui/index.html <<'__FILE__'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ShopLite</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <header class="topbar">
      <div class="brand"><span class="logo">S</span> ShopLite</div>
      <input id="search" type="search" placeholder="Search products…" autocomplete="off" aria-label="Search products" />
    </header>
    <main class="layout">
      <section class="catalog" aria-label="Products">
        <div id="product-grid" class="grid"></div>
        <nav id="pager" class="pager" aria-label="Pagination"></nav>
      </section>
      <aside class="cart" aria-label="Cart">
        <h2>Your cart</h2>
        <ul id="cart-lines" class="lines"></ul>
        <form id="coupon-form" class="coupon">
          <input id="coupon-input" placeholder="Coupon code" autocomplete="off" aria-label="Coupon code" />
          <button type="submit">Apply</button>
        </form>
        <div id="coupon-status" class="coupon-status"></div>
        <dl id="totals" class="totals"></dl>
      </aside>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
__FILE__

f ui/src/catalogView.ts <<'__FILE__'
import { paginate } from "../../src/catalog/paginate";
import { PRODUCTS, type Product } from "../../src/catalog/products";
import { searchProducts } from "../../src/catalog/search";
import { formatINR } from "../../src/currency/format";
import { $, el } from "./dom";

export const PAGE_SIZE = 6;

export interface CatalogProps {
  query: string;
  page: number;
  onPage(page: number): void;
  onAdd(productId: string): void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function productCard(product: Product, onAdd: (productId: string) => void): HTMLElement {
  return el(
    "article",
    { className: "card" },
    el("div", { className: `thumb thumb-${product.category.toLowerCase()}` }, initials(product.name)),
    el("h3", {}, product.name),
    el("p", { className: "category" }, product.category),
    el("p", { className: "price" }, formatINR(product.price)),
    el("button", { type: "button", className: "add", onclick: () => onAdd(product.id) }, "Add to cart"),
  );
}

export function renderCatalog({ query, page, onPage, onAdd }: CatalogProps): void {
  const results = searchProducts(PRODUCTS, query);
  const current = paginate(results, page, PAGE_SIZE);

  const grid = $("#product-grid");
  if (results.length === 0) {
    grid.replaceChildren(el("p", { className: "empty" }, `No products match “${query.trim()}”.`));
  } else {
    grid.replaceChildren(...current.items.map((product) => productCard(product, onAdd)));
  }

  const first = current.totalItems === 0 ? 0 : (current.page - 1) * current.pageSize + 1;
  const last = current.totalItems === 0 ? 0 : first + current.items.length - 1;
  $("#pager").replaceChildren(
    el("button", { type: "button", disabled: !current.hasPrev, onclick: () => onPage(current.page - 1) }, "‹ Prev"),
    el(
      "span",
      { className: "pager-info" },
      `Page ${current.page} of ${current.totalPages} · Showing ${first}–${last} of ${current.totalItems}`,
    ),
    el("button", { type: "button", disabled: !current.hasNext, onclick: () => onPage(current.page + 1) }, "Next ›"),
  );
}
__FILE__

f ui/src/cartView.ts <<'__FILE__'
import { InvalidQuantityError, removeItem, setQuantity, type Cart } from "../../src/cart/cart";
import { applyCoupon, InvalidCouponError, removeCoupon } from "../../src/cart/coupons";
import { lineItems, type LineItem } from "../../src/cart/lineItems";
import { computeTotals } from "../../src/cart/totals";
import { formatDiscount, formatINR } from "../../src/currency/format";
import { GST_RATE_PERCENT } from "../../src/tax/gst";
import { $, el } from "./dom";

export interface CartViewProps {
  cart: Cart;
  onChange(cart: Cart): void;
}

let couponError = "";

export function bindCouponForm(getCart: () => Cart, onChange: (cart: Cart) => void): void {
  const form = $<HTMLFormElement>("#coupon-form");
  const input = $<HTMLInputElement>("#coupon-input");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      couponError = "";
      onChange(applyCoupon(getCart(), input.value));
      input.value = "";
    } catch (error) {
      if (!(error instanceof InvalidCouponError)) throw error;
      couponError = error.message;
      onChange(getCart());
    }
  });
}

function lineRow(line: LineItem, cart: Cart, onChange: (cart: Cart) => void): HTMLElement {
  const qty = el("input", { type: "number", min: "1", value: String(line.quantity), className: "qty" });
  qty.addEventListener("change", () => {
    try {
      onChange(setQuantity(cart, line.productId, Number(qty.value)));
    } catch (error) {
      if (!(error instanceof InvalidQuantityError)) throw error;
      qty.value = String(line.quantity);
    }
  });
  return el(
    "li",
    { className: "line" },
    el("div", { className: "line-name" }, line.name, el("small", {}, `${formatINR(line.unitPrice)} each`)),
    qty,
    el("span", { className: "line-total" }, formatINR(line.lineTotal)),
    el(
      "button",
      { type: "button", className: "remove", title: "Remove", onclick: () => onChange(removeItem(cart, line.productId)) },
      "×",
    ),
  );
}

function row(label: string, value: string, className = ""): HTMLElement[] {
  return [el("dt", { className }, label), el("dd", { className }, value)];
}

export function renderCart({ cart, onChange }: CartViewProps): void {
  const lines = lineItems(cart);
  $("#cart-lines").replaceChildren(
    ...(lines.length === 0
      ? [el("li", { className: "empty" }, "Your cart is empty.")]
      : lines.map((line) => lineRow(line, cart, onChange))),
  );

  const totals = computeTotals(cart);
  $("#totals").replaceChildren(
    ...row(`Subtotal (${totals.itemCount} items)`, formatINR(totals.subtotal)),
    ...(totals.discount !== 0 ? row("Discount", formatDiscount(totals.discount), "discount") : []),
    ...row(`GST (${GST_RATE_PERCENT}%)`, formatINR(totals.tax)),
    ...row("Shipping", totals.shipping === 0 ? "Free" : formatINR(totals.shipping)),
    ...row("Total", formatINR(totals.total), "grand"),
  );

  const status = $("#coupon-status");
  if (couponError) {
    status.replaceChildren(el("span", { className: "error" }, couponError));
  } else if (cart.couponCode) {
    status.replaceChildren(
      el("span", { className: "applied" }, `Coupon ${cart.couponCode} applied`),
      el("button", { type: "button", className: "link", onclick: () => onChange(removeCoupon(cart)) }, "Remove"),
    );
  } else {
    status.replaceChildren();
  }
}
__FILE__

f ui/src/main.ts <<'__FILE__'
import { addItem, createCart, type Cart } from "../../src/cart/cart";
import { bindCouponForm, renderCart } from "./cartView";
import { renderCatalog } from "./catalogView";
import { $ } from "./dom";

let cart: Cart = createCart();
let query = "";
let page = 1;

function setCart(next: Cart): void {
  cart = next;
  render();
}

function render(): void {
  renderCatalog({
    query,
    page,
    onPage: (next) => {
      page = next;
      render();
    },
    onAdd: (productId) => setCart(addItem(cart, productId)),
  });
  renderCart({ cart, onChange: setCart });
}

const search = $<HTMLInputElement>("#search");
search.addEventListener("input", () => {
  query = search.value;
  page = 1;
  render();
});

bindCouponForm(() => cart, setCart);

render();
__FILE__
commit "feat(ui): add cart panel with coupon field and totals"

# ---------------------------------------------------------------------------------------------
# 23. UI orders
# ---------------------------------------------------------------------------------------------
f ui/index.html <<'__FILE__'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ShopLite</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <header class="topbar">
      <div class="brand"><span class="logo">S</span> ShopLite</div>
      <input id="search" type="search" placeholder="Search products…" autocomplete="off" aria-label="Search products" />
    </header>
    <main class="layout">
      <section class="catalog" aria-label="Products">
        <div id="product-grid" class="grid"></div>
        <nav id="pager" class="pager" aria-label="Pagination"></nav>
      </section>
      <aside class="cart" aria-label="Cart">
        <h2>Your cart</h2>
        <ul id="cart-lines" class="lines"></ul>
        <form id="coupon-form" class="coupon">
          <input id="coupon-input" placeholder="Coupon code" autocomplete="off" aria-label="Coupon code" />
          <button type="submit">Apply</button>
        </form>
        <div id="coupon-status" class="coupon-status"></div>
        <dl id="totals" class="totals"></dl>
        <button id="place-order" type="button" class="primary">Place order</button>
        <p id="order-status" class="order-status" role="status"></p>
      </aside>
      <section class="orders" aria-label="Orders">
        <h2>Your orders</h2>
        <ol id="order-list" class="order-list"></ol>
      </section>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
__FILE__

f ui/src/ordersView.ts <<'__FILE__'
import { formatINR } from "../../src/currency/format";
import { DELIVERY_TIME_ZONE, formatDeliveryDate } from "../../src/delivery/estimate";
import type { Order } from "../../src/orders/service";
import { $, el } from "./dom";

const placedAtFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: DELIVERY_TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function orderRow(order: Order): HTMLElement {
  return el(
    "li",
    { className: "order" },
    el("div", { className: "order-head" }, el("strong", {}, order.id), el("span", {}, formatINR(order.totals.total))),
    el(
      "div",
      { className: "order-meta" },
      `${order.totals.itemCount} items · placed ${placedAtFormat.format(new Date(order.placedAt))} IST · ` +
        `arrives ${formatDeliveryDate(order.estimatedDelivery)} · payment ${order.paymentId}`,
    ),
    el("div", { className: "order-items" }, order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ")),
  );
}

export function renderOrders(orders: Order[]): void {
  $("#order-list").replaceChildren(
    ...(orders.length === 0 ? [el("li", { className: "empty" }, "No orders yet.")] : orders.map(orderRow)),
  );
}
__FILE__

f ui/src/main.ts <<'__FILE__'
import { addItem, createCart, type Cart } from "../../src/cart/cart";
import { formatINR } from "../../src/currency/format";
import { FakePaymentGateway } from "../../src/orders/payments";
import { OrderService } from "../../src/orders/service";
import { bindCouponForm, renderCart } from "./cartView";
import { renderCatalog } from "./catalogView";
import { $ } from "./dom";
import { renderOrders } from "./ordersView";

// Simulated payment latency so the "Placing order…" state is visible.
const orders = new OrderService({ payments: new FakePaymentGateway(800) });

let cart: Cart = createCart();
let query = "";
let page = 1;

function setCart(next: Cart): void {
  cart = next;
  render();
}

function render(): void {
  renderCatalog({
    query,
    page,
    onPage: (next) => {
      page = next;
      render();
    },
    onAdd: (productId) => setCart(addItem(cart, productId)),
  });
  renderCart({ cart, onChange: setCart });
  renderOrders(orders.listOrders());
}

const search = $<HTMLInputElement>("#search");
search.addEventListener("input", () => {
  query = search.value;
  page = 1;
  render();
});

bindCouponForm(() => cart, setCart);

const placeButton = $<HTMLButtonElement>("#place-order");
const orderStatus = $("#order-status");
placeButton.addEventListener("click", async () => {
  if (cart.items.length === 0) {
    orderStatus.textContent = "Your cart is empty.";
    return;
  }
  placeButton.textContent = "Placing order…";
  try {
    const order = await orders.placeOrder(cart);
    cart = createCart();
    orderStatus.textContent = `Order ${order.id} placed · ${formatINR(order.totals.total)}`;
  } catch (error) {
    orderStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    placeButton.textContent = "Place order";
    render();
  }
});

render();
__FILE__
commit "feat(ui): place orders and show order history"

# ---------------------------------------------------------------------------------------------
# 24. README
# ---------------------------------------------------------------------------------------------
f README.md <<'__FILE__'
# ShopLite

A small, in-memory TypeScript shop: product catalog with search and pagination, a cart with
coupons, 18% GST and shipping, delivery-date estimates in India Standard Time, and order
placement against a fake payment gateway. There is no backend or database — everything is plain
TypeScript modules, so the domain logic is easy to read and test.

## Getting started

Requires Node 24 (see `.nvmrc`; Node ≥ 22.12 also works) and npm.

```sh
npm install
npm test          # Vitest unit + integration tests
npm run dev       # UI at http://localhost:5173
npm run build     # type-check everything and build the UI into ui/dist
```

## Layout

| Path            | What lives there                                                    |
| --------------- | ------------------------------------------------------------------- |
| `src/catalog/`  | product list, search, pagination                                    |
| `src/cart/`     | cart state, line items, coupons, totals                             |
| `src/tax/`      | GST calculation                                                     |
| `src/currency/` | INR formatting (`₹1,23,456.50`) and paise helpers                   |
| `src/delivery/` | delivery-date estimate (Asia/Kolkata, 8 PM dispatch cutoff)         |
| `src/orders/`   | order placement, order history, fake payment gateway                |
| `tests/`        | Vitest tests mirroring `src/`                                       |
| `ui/`           | tiny Vite + vanilla TS storefront that imports straight from `src/` |

## Business rules

- Prices are pre-tax rupees. GST is 18% of the subtotal, rounded to the paisa.
- Shipping is ₹49, free when the subtotal is ₹999 or more.
- Coupons (`SAVE10`, `WELCOME15`, `FLAT200`, `DIWALI60`) come off the pre-tax subtotal.
- Orders placed before 8 PM IST are dispatched the same day, later orders the next day; transit
  is 3 days and there are no Sunday deliveries.

## License

MIT
__FILE__
commit "docs: add README"

# ---------------------------------------------------------------------------------------------
# 25. BUG #3 — fixed IST offset, but the cutoff hour is read in UTC
# ---------------------------------------------------------------------------------------------
f src/delivery/estimate.ts <<'__FILE__'
export const DELIVERY_TIME_ZONE = "Asia/Kolkata";
/** Orders placed at or after 20:00 IST are dispatched the next day. */
export const DISPATCH_CUTOFF_HOUR = 20;
export const DEFAULT_TRANSIT_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;
const SUNDAY = 0;

// India has no daylight saving, so IST is always UTC+05:30. Shifting the timestamp is much
// cheaper than building an Intl.DateTimeFormat on every cart render.
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** Couriers do not deliver on Sundays, so Sundays are not counted as transit days. */
function addDeliveryDays(start: number, days: number): number {
  let day = start;
  for (let added = 0; added < days; ) {
    day += DAY_MS;
    if (new Date(day).getUTCDay() !== SUNDAY) added++;
  }
  return day;
}

function toIsoDate(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/**
 * Estimated delivery date (YYYY-MM-DD, IST calendar) for an order placed at `orderedAt`.
 * Dispatch happens on the IST order date, or the next day after the 8 PM cutoff.
 */
export function estimateDelivery(orderedAt: Date, transitDays: number = DEFAULT_TRANSIT_DAYS): string {
  const ist = new Date(orderedAt.getTime() + IST_OFFSET_MS);
  let dispatch = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  if (orderedAt.getUTCHours() >= DISPATCH_CUTOFF_HOUR) dispatch += DAY_MS;
  return toIsoDate(addDeliveryDays(dispatch, transitDays));
}

const displayFormat = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "2026-03-16" → "Mon, 16 Mar". */
export function formatDeliveryDate(isoDate: string): string {
  return displayFormat.format(new Date(`${isoDate}T00:00:00Z`));
}
__FILE__
bug_commit 3 "perf(delivery): compute IST date without Intl.DateTimeFormat"

# ---------------------------------------------------------------------------------------------
# 26. BUG #4 — page count derived from the last index (off by one)
# ---------------------------------------------------------------------------------------------
f src/catalog/paginate.ts <<'__FILE__'
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
    hasNext: current < totalPages,
  };
}
__FILE__
bug_commit 4 "refactor(catalog): compute pagination bounds explicitly"

# ---------------------------------------------------------------------------------------------
# 27. Catalog tests
# ---------------------------------------------------------------------------------------------
cat >>tests/catalog/search.test.ts <<'__FILE__'

describe("searchProducts ordering", () => {
  it("returns matches in catalog order", () => {
    expect(ids(searchProducts(PRODUCTS, "Electronics"))).toEqual(["p11", "p12", "p13", "p14", "p15"]);
  });

  it("returns the same results for repeated queries", () => {
    expect(searchProducts(PRODUCTS, "Cotton")).toEqual(searchProducts(PRODUCTS, "Cotton"));
  });

  it("matches multi-word names", () => {
    expect(ids(searchProducts(PRODUCTS, "Water Bottle"))).toEqual(["p02"]);
  });
});
__FILE__

cat >>tests/catalog/paginate.test.ts <<'__FILE__'

describe("paginate metadata", () => {
  it("reports neighbouring pages", () => {
    expect(paginate(numbers, 2, 4)).toMatchObject({ hasPrev: true, hasNext: true });
    expect(paginate(numbers, 1, 4)).toMatchObject({ hasPrev: false, hasNext: true });
  });

  it("reports the total item count", () => {
    expect(paginate(PRODUCTS, 2, 6)).toMatchObject({ totalItems: 25, pageSize: 6 });
  });
});
__FILE__
commit "test(catalog): cover search ordering and page metadata"

# ---------------------------------------------------------------------------------------------
# 28. BUG #7 — duplicate check moved before an await, in-flight guard removed
# ---------------------------------------------------------------------------------------------
f src/orders/service.ts <<'__FILE__'
import type { Cart, CartItem } from "../cart/cart";
import { computeTotals, type CartTotals } from "../cart/totals";
import { estimateDelivery } from "../delivery/estimate";
import { FakePaymentGateway, type PaymentGateway } from "./payments";

export interface Order {
  id: string;
  cartId: string;
  items: CartItem[];
  totals: CartTotals;
  paymentId: string;
  /** ISO timestamp. */
  placedAt: string;
  /** YYYY-MM-DD in IST. */
  estimatedDelivery: string;
}

export class EmptyCartError extends Error {
  constructor() {
    super("Cannot place an order for an empty cart");
    this.name = "EmptyCartError";
  }
}

export class DuplicateOrderError extends Error {
  constructor(readonly cartId: string) {
    super(`Cart ${cartId} has already been ordered`);
    this.name = "DuplicateOrderError";
  }
}

export interface OrderServiceOptions {
  payments?: PaymentGateway;
  clock?: () => Date;
}

export class OrderService {
  private readonly orders: Order[] = [];
  private readonly payments: PaymentGateway;
  private readonly clock: () => Date;
  private seq = 0;

  constructor(options: OrderServiceOptions = {}) {
    this.payments = options.payments ?? new FakePaymentGateway();
    this.clock = options.clock ?? (() => new Date());
  }

  /** Places an order for the cart. A cart can only be ordered once. */
  async placeOrder(cart: Cart): Promise<Order> {
    if (cart.items.length === 0) throw new EmptyCartError();
    if (this.hasOrderFor(cart.id)) throw new DuplicateOrderError(cart.id);
    const totals = computeTotals(cart);
    const placedAt = this.clock();
    const { paymentId } = await this.payments.charge(totals.total, cart.id);
    const order: Order = {
      id: `ORD-${String(++this.seq).padStart(4, "0")}`,
      cartId: cart.id,
      items: cart.items.map((item) => ({ ...item })),
      totals,
      paymentId,
      placedAt: placedAt.toISOString(),
      estimatedDelivery: estimateDelivery(placedAt),
    };
    this.orders.push(order);
    return order;
  }

  /** All orders, newest first. */
  listOrders(): Order[] {
    return [...this.orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt) || b.id.localeCompare(a.id));
  }

  getOrder(id: string): Order | undefined {
    return this.orders.find((order) => order.id === id);
  }

  private hasOrderFor(cartId: string): boolean {
    return this.orders.some((order) => order.cartId === cartId);
  }
}
__FILE__
bug_commit 7 "refactor(orders): derive duplicate-order check from order history"

# ---------------------------------------------------------------------------------------------
# 29. Order tests
# ---------------------------------------------------------------------------------------------
cat >>tests/orders/service.test.ts <<'__FILE__'

describe("OrderService payments", () => {
  it("issues a distinct payment reference per order", async () => {
    const { service } = setup();
    const first = await service.placeOrder(cartFor("o1"));
    const second = await service.placeOrder(cartFor("o2"));
    expect(first.paymentId).not.toBe(second.paymentId);
  });

  it("charges the discounted total when a coupon is applied", async () => {
    const { payments, service } = setup();
    const order = await service.placeOrder(applyCoupon(addItem(createCart("promo"), "p13"), "SAVE10"));
    expect(order.totals.discount).toBe(249.9);
    expect(payments.charges[0].amount).toBe(order.totals.total);
  });
});
__FILE__
sed -i 's#^import { addItem, createCart } from "../../src/cart/cart";#import { addItem, createCart } from "../../src/cart/cart";\nimport { applyCoupon } from "../../src/cart/coupons";#' tests/orders/service.test.ts
commit "test(orders): cover payment references and coupon totals"

# ---------------------------------------------------------------------------------------------
# 30. UI delivery estimate
# ---------------------------------------------------------------------------------------------
f ui/index.html <<'__FILE__'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ShopLite</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <header class="topbar">
      <div class="brand"><span class="logo">S</span> ShopLite</div>
      <input id="search" type="search" placeholder="Search products…" autocomplete="off" aria-label="Search products" />
    </header>
    <main class="layout">
      <section class="catalog" aria-label="Products">
        <div id="product-grid" class="grid"></div>
        <nav id="pager" class="pager" aria-label="Pagination"></nav>
      </section>
      <aside class="cart" aria-label="Cart">
        <h2>Your cart</h2>
        <ul id="cart-lines" class="lines"></ul>
        <form id="coupon-form" class="coupon">
          <input id="coupon-input" placeholder="Coupon code" autocomplete="off" aria-label="Coupon code" />
          <button type="submit">Apply</button>
        </form>
        <div id="coupon-status" class="coupon-status"></div>
        <dl id="totals" class="totals"></dl>
        <p id="delivery" class="delivery"></p>
        <button id="place-order" type="button" class="primary">Place order</button>
        <p id="order-status" class="order-status" role="status"></p>
      </aside>
      <section class="orders" aria-label="Orders">
        <h2>Your orders</h2>
        <ol id="order-list" class="order-list"></ol>
      </section>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
__FILE__

f ui/src/cartView.ts <<'__FILE__'
import { InvalidQuantityError, removeItem, setQuantity, type Cart } from "../../src/cart/cart";
import { applyCoupon, InvalidCouponError, removeCoupon } from "../../src/cart/coupons";
import { lineItems, type LineItem } from "../../src/cart/lineItems";
import { computeTotals } from "../../src/cart/totals";
import { formatDiscount, formatINR } from "../../src/currency/format";
import { estimateDelivery, formatDeliveryDate } from "../../src/delivery/estimate";
import { GST_RATE_PERCENT } from "../../src/tax/gst";
import { $, el } from "./dom";

export interface CartViewProps {
  cart: Cart;
  onChange(cart: Cart): void;
}

let couponError = "";

export function bindCouponForm(getCart: () => Cart, onChange: (cart: Cart) => void): void {
  const form = $<HTMLFormElement>("#coupon-form");
  const input = $<HTMLInputElement>("#coupon-input");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      couponError = "";
      onChange(applyCoupon(getCart(), input.value));
      input.value = "";
    } catch (error) {
      if (!(error instanceof InvalidCouponError)) throw error;
      couponError = error.message;
      onChange(getCart());
    }
  });
}

function lineRow(line: LineItem, cart: Cart, onChange: (cart: Cart) => void): HTMLElement {
  const qty = el("input", { type: "number", min: "1", value: String(line.quantity), className: "qty" });
  qty.addEventListener("change", () => {
    try {
      onChange(setQuantity(cart, line.productId, Number(qty.value)));
    } catch (error) {
      if (!(error instanceof InvalidQuantityError)) throw error;
      qty.value = String(line.quantity);
    }
  });
  return el(
    "li",
    { className: "line" },
    el("div", { className: "line-name" }, line.name, el("small", {}, `${formatINR(line.unitPrice)} each`)),
    qty,
    el("span", { className: "line-total" }, formatINR(line.lineTotal)),
    el(
      "button",
      { type: "button", className: "remove", title: "Remove", onclick: () => onChange(removeItem(cart, line.productId)) },
      "×",
    ),
  );
}

function row(label: string, value: string, className = ""): HTMLElement[] {
  return [el("dt", { className }, label), el("dd", { className }, value)];
}

export function renderCart({ cart, onChange }: CartViewProps): void {
  const lines = lineItems(cart);
  $("#cart-lines").replaceChildren(
    ...(lines.length === 0
      ? [el("li", { className: "empty" }, "Your cart is empty.")]
      : lines.map((line) => lineRow(line, cart, onChange))),
  );

  const totals = computeTotals(cart);
  $("#totals").replaceChildren(
    ...row(`Subtotal (${totals.itemCount} items)`, formatINR(totals.subtotal)),
    ...(totals.discount !== 0 ? row("Discount", formatDiscount(totals.discount), "discount") : []),
    ...row(`GST (${GST_RATE_PERCENT}%)`, formatINR(totals.tax)),
    ...row("Shipping", totals.shipping === 0 ? "Free" : formatINR(totals.shipping)),
    ...row("Total", formatINR(totals.total), "grand"),
  );

  $("#delivery").textContent =
    lines.length === 0
      ? ""
      : `Estimated delivery: ${formatDeliveryDate(estimateDelivery(new Date()))}. Orders after 8 PM IST ship the next day.`;

  const status = $("#coupon-status");
  if (couponError) {
    status.replaceChildren(el("span", { className: "error" }, couponError));
  } else if (cart.couponCode) {
    status.replaceChildren(
      el("span", { className: "applied" }, `Coupon ${cart.couponCode} applied`),
      el("button", { type: "button", className: "link", onclick: () => onChange(removeCoupon(cart)) }, "Remove"),
    );
  } else {
    status.replaceChildren();
  }
}
__FILE__
commit "feat(ui): show estimated delivery in cart summary"

# ---------------------------------------------------------------------------------------------
# 31. BUG #8 — stacking coupons without de-duplication or a cap
# ---------------------------------------------------------------------------------------------
f src/cart/cart.ts <<'__FILE__'
import { getProductById } from "../catalog/products";

export interface CartItem {
  productId: string;
  name: string;
  /** Pre-tax unit price in rupees, captured when the item was added. */
  unitPrice: number;
  quantity: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  /** Normalised coupon codes, in the order they were applied. */
  couponCodes: string[];
}

let cartSeq = 0;

export function createCart(id: string = `cart-${++cartSeq}`): Cart {
  return { id, items: [], couponCodes: [] };
}

export class UnknownProductError extends Error {
  constructor(readonly productId: string) {
    super(`Unknown product: ${productId}`);
    this.name = "UnknownProductError";
  }
}

export class InvalidQuantityError extends Error {
  constructor(readonly quantity: unknown) {
    super(`Invalid quantity: ${String(quantity)}`);
    this.name = "InvalidQuantityError";
  }
}

export function addItem(cart: Cart, productId: string, quantity: number | string = 1): Cart {
  const qty = parseQuantity(quantity);
  const product = getProductById(productId);
  if (!product) throw new UnknownProductError(productId);
  const existing = cart.items.find((item) => item.productId === productId);
  const items = existing
    ? cart.items.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + qty } : item,
      )
    : [...cart.items, { productId, name: product.name, unitPrice: product.price, quantity: qty }];
  return { ...cart, items };
}

export function setQuantity(cart: Cart, productId: string, quantity: number | string): Cart {
  if (!cart.items.some((item) => item.productId === productId)) throw new UnknownProductError(productId);
  const qty = parseQuantity(quantity);
  if (qty === 0) return removeItem(cart, productId);
  return {
    ...cart,
    items: cart.items.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item)),
  };
}

export function removeItem(cart: Cart, productId: string): Cart {
  return { ...cart, items: cart.items.filter((item) => item.productId !== productId) };
}

export function itemCount(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Quantities arrive as numbers from code and as strings from form fields and JSON payloads. */
export function parseQuantity(input: number | string): number {
  const value = typeof input === "string" ? Number(input.trim()) : input;
  if (!Number.isFinite(value)) throw new InvalidQuantityError(input);
  return Math.trunc(value);
}
__FILE__

f src/cart/coupons.ts <<'__FILE__'
import { fromPaise, toPaise } from "../currency/money";
import type { Cart } from "./cart";

/**
 * Active campaign coupons, in the format marketing uses in the promo sheet:
 * "10%" is a percentage off the subtotal, "200" is a flat amount in rupees.
 */
export const COUPON_RULES: Readonly<Record<string, string>> = {
  SAVE10: "10%",
  WELCOME15: "15%",
  FLAT200: "200",
  DIWALI60: "60%",
};

export class InvalidCouponError extends Error {
  constructor(readonly code: string) {
    super(`Coupon "${code}" is not valid`);
    this.name = "InvalidCouponError";
  }
}

export function normalizeCouponCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isKnownCoupon(code: string): boolean {
  return Object.hasOwn(COUPON_RULES, code);
}

export interface CouponRule {
  kind: "percent" | "flat";
  value: number;
}

const PERCENT_SUFFIX = /%$/;

/** Parses a promo-sheet rule such as "10%" or "200". */
export function parseCouponRule(rule: string): CouponRule {
  const value = parseFloat(rule);
  return PERCENT_SUFFIX.test(rule) ? { kind: "percent", value } : { kind: "flat", value };
}

/** Discount in rupees for a coupon code against a pre-tax subtotal. */
export function couponDiscount(subtotal: number, code?: string): number {
  if (code === undefined) return 0;
  const rule = parseCouponRule(COUPON_RULES[code]);
  if (rule.kind === "percent") return fromPaise(Math.round((toPaise(subtotal) * rule.value) / 100));
  return Math.min(rule.value, subtotal);
}

/** Adds a coupon to the cart. Coupons stack: each one is computed against the subtotal. */
export function applyCoupon(cart: Cart, input: string): Cart {
  const code = normalizeCouponCode(input);
  if (code && !isKnownCoupon(code)) throw new InvalidCouponError(input.trim());
  return { ...cart, couponCodes: [...cart.couponCodes, code] };
}

export function removeCoupon(cart: Cart): Cart {
  return { ...cart, couponCodes: [] };
}
__FILE__

f src/cart/totals.ts <<'__FILE__'
import { fromPaise, roundMoney, toPaise } from "../currency/money";
import { GST_RATE } from "../tax/gst";
import type { Cart } from "./cart";
import { couponDiscount } from "./coupons";
import { lineItems, sumBy } from "./lineItems";

export const FREE_SHIPPING_THRESHOLD = 999;
export const SHIPPING_FEE = 49;

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
}

export function shippingFor(subtotal: number, lineCount: number): number {
  if (lineCount === 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export function computeTotals(cart: Cart): CartTotals {
  const lines = lineItems(cart);
  const subtotal = roundMoney(sumBy(lines, (line) => line.lineTotal));
  const tax = roundMoney(sumBy(lines, (line) => line.lineTotal * GST_RATE));

  // Coupons come off the pre-tax subtotal; GST is charged on the list price.
  const discount = cart.couponCodes.reduce((sum, code) => sum + couponDiscount(subtotal, code), 0);

  const shipping = shippingFor(subtotal, cart.items.length);
  const total = fromPaise(toPaise(subtotal) - toPaise(discount) + toPaise(tax) + toPaise(shipping));
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return { itemCount, subtotal, discount, tax, shipping, total };
}
__FILE__

f ui/src/cartView.ts <<'__FILE__'
import { InvalidQuantityError, removeItem, setQuantity, type Cart } from "../../src/cart/cart";
import { applyCoupon, InvalidCouponError, removeCoupon } from "../../src/cart/coupons";
import { lineItems, type LineItem } from "../../src/cart/lineItems";
import { computeTotals } from "../../src/cart/totals";
import { formatDiscount, formatINR } from "../../src/currency/format";
import { estimateDelivery, formatDeliveryDate } from "../../src/delivery/estimate";
import { GST_RATE_PERCENT } from "../../src/tax/gst";
import { $, el } from "./dom";

export interface CartViewProps {
  cart: Cart;
  onChange(cart: Cart): void;
}

let couponError = "";

export function bindCouponForm(getCart: () => Cart, onChange: (cart: Cart) => void): void {
  const form = $<HTMLFormElement>("#coupon-form");
  const input = $<HTMLInputElement>("#coupon-input");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      couponError = "";
      onChange(applyCoupon(getCart(), input.value));
      input.value = "";
    } catch (error) {
      if (!(error instanceof InvalidCouponError)) throw error;
      couponError = error.message;
      onChange(getCart());
    }
  });
}

function lineRow(line: LineItem, cart: Cart, onChange: (cart: Cart) => void): HTMLElement {
  const qty = el("input", { type: "number", min: "1", value: String(line.quantity), className: "qty" });
  qty.addEventListener("change", () => {
    try {
      onChange(setQuantity(cart, line.productId, Number(qty.value)));
    } catch (error) {
      if (!(error instanceof InvalidQuantityError)) throw error;
      qty.value = String(line.quantity);
    }
  });
  return el(
    "li",
    { className: "line" },
    el("div", { className: "line-name" }, line.name, el("small", {}, `${formatINR(line.unitPrice)} each`)),
    qty,
    el("span", { className: "line-total" }, formatINR(line.lineTotal)),
    el(
      "button",
      { type: "button", className: "remove", title: "Remove", onclick: () => onChange(removeItem(cart, line.productId)) },
      "×",
    ),
  );
}

function row(label: string, value: string, className = ""): HTMLElement[] {
  return [el("dt", { className }, label), el("dd", { className }, value)];
}

function percentOff(discount: number, subtotal: number): string {
  return subtotal === 0 ? "" : ` (${Math.round((discount / subtotal) * 100)}% off)`;
}

export function renderCart({ cart, onChange }: CartViewProps): void {
  const lines = lineItems(cart);
  $("#cart-lines").replaceChildren(
    ...(lines.length === 0
      ? [el("li", { className: "empty" }, "Your cart is empty.")]
      : lines.map((line) => lineRow(line, cart, onChange))),
  );

  const totals = computeTotals(cart);
  $("#totals").replaceChildren(
    ...row(`Subtotal (${totals.itemCount} items)`, formatINR(totals.subtotal)),
    ...(totals.discount !== 0
      ? row(`Discount${percentOff(totals.discount, totals.subtotal)}`, formatDiscount(totals.discount), "discount")
      : []),
    ...row(`GST (${GST_RATE_PERCENT}%)`, formatINR(totals.tax)),
    ...row("Shipping", totals.shipping === 0 ? "Free" : formatINR(totals.shipping)),
    ...row("Total", formatINR(totals.total), "grand"),
  );

  $("#delivery").textContent =
    lines.length === 0
      ? ""
      : `Estimated delivery: ${formatDeliveryDate(estimateDelivery(new Date()))}. Orders after 8 PM IST ship the next day.`;

  const status = $("#coupon-status");
  if (couponError) {
    status.replaceChildren(el("span", { className: "error" }, couponError));
  } else if (cart.couponCodes.length > 0) {
    status.replaceChildren(
      ...cart.couponCodes.map((code) => el("span", { className: "chip" }, code)),
      el("button", { type: "button", className: "link", onclick: () => onChange(removeCoupon(cart)) }, "Remove all"),
    );
  } else {
    status.replaceChildren();
  }
}
__FILE__

cat >>tests/cart/coupons.test.ts <<'__FILE__'

describe("stacked coupons", () => {
  it("combines a percentage and a flat coupon", () => {
    const cart = applyCoupon(applyCoupon(speakerCart(), "SAVE10"), "FLAT200");
    expect(computeTotals(cart).discount).toBe(449.9);
  });

  it("keeps coupons in the order they were applied", () => {
    const cart = applyCoupon(applyCoupon(speakerCart(), "save10"), "flat200");
    expect(cart.couponCodes).toEqual(["SAVE10", "FLAT200"]);
  });
});
__FILE__
bug_commit 8 "feat(cart): allow stacking multiple coupon codes"

# ---------------------------------------------------------------------------------------------
# 32. Integration tests
# ---------------------------------------------------------------------------------------------
f tests/integration/checkout.test.ts <<'__FILE__'
import { describe, expect, it } from "vitest";
import { addItem, createCart } from "../../src/cart/cart";
import { applyCoupon } from "../../src/cart/coupons";
import { computeTotals } from "../../src/cart/totals";
import { paginate } from "../../src/catalog/paginate";
import { PRODUCTS } from "../../src/catalog/products";
import { searchProducts } from "../../src/catalog/search";
import { formatINR } from "../../src/currency/format";
import { FakePaymentGateway } from "../../src/orders/payments";
import { OrderService } from "../../src/orders/service";

const TUESDAY_MORNING_IST = new Date("2026-03-10T10:00:00+05:30");

describe("checkout flow", () => {
  it("searches, adds to cart, applies a coupon and places an order", async () => {
    const [speaker] = searchProducts(PRODUCTS, "Speaker");
    const cart = applyCoupon(addItem(createCart("flow-1"), speaker.id), "SAVE10");
    const service = new OrderService({ payments: new FakePaymentGateway(), clock: () => TUESDAY_MORNING_IST });

    const order = await service.placeOrder(cart);

    expect(order.totals).toMatchObject({ subtotal: 2499, discount: 249.9, tax: 449.82, shipping: 0, total: 2698.92 });
    expect(service.listOrders()).toEqual([order]);
  });

  it("formats the order total for the receipt", async () => {
    const service = new OrderService({ clock: () => TUESDAY_MORNING_IST });
    const order = await service.placeOrder(applyCoupon(addItem(createCart("flow-2"), "p13"), "SAVE10"));
    expect(formatINR(order.totals.total)).toBe("₹2,698.92");
  });

  it("adds a product found on the second catalog page", () => {
    const page = paginate(PRODUCTS, 2, 6);
    expect(page.items.map((product) => product.id)).toEqual(["p07", "p08", "p09", "p10", "p11", "p12"]);
    const cart = addItem(createCart("flow-3"), page.items[4].id);
    expect(cart.items[0].name).toBe("Wireless Mouse");
  });

  it("drops shipping once the cart crosses ₹999", () => {
    const below = addItem(addItem(createCart("flow-4"), "p06"), "p02");
    expect(computeTotals(below)).toMatchObject({ subtotal: 998, shipping: 49 });
    expect(computeTotals(addItem(below, "p16"))).toMatchObject({ subtotal: 1197, shipping: 0 });
  });

  it("estimates next-week delivery for a Saturday morning order", async () => {
    const service = new OrderService({ clock: () => new Date("2026-03-14T10:00:00+05:30") });
    const order = await service.placeOrder(addItem(createCart("flow-5"), "p19"));
    expect(order.estimatedDelivery).toBe("2026-03-18");
  });
});
__FILE__
commit "test: add checkout integration tests"

# ---------------------------------------------------------------------------------------------
# 33. Tax tests
# ---------------------------------------------------------------------------------------------
cat >>tests/tax/gst.test.ts <<'__FILE__'

describe("calculateGst on fractional amounts", () => {
  it("rounds half a paisa up for small amounts", () => {
    expect(calculateGst(149.25)).toBe(26.87);
  });

  it("rounds half a paisa up for amounts over ₹1,000", () => {
    expect(calculateGst(1049.25)).toBe(188.87);
  });
});
__FILE__
commit "test(tax): cover half-paisa rounding"

# ---------------------------------------------------------------------------------------------
# 34. Intake artifacts
# ---------------------------------------------------------------------------------------------
f scripts/render-pdf.mjs <<'__FILE__'
#!/usr/bin/env node
// Renders a Markdown file to a plain, text-only PDF (A4, Helvetica/Courier) with no
// dependencies, so intake reports can be regenerated anywhere Node runs:
//
//   node scripts/render-pdf.mjs intake/bug-03-qa-report.md intake/bug-03-qa-report.pdf
//
// Only headings, paragraphs, lists, tables (as text) and fenced code blocks are supported.
// Non-ASCII characters are transliterated because the standard PDF fonts are Latin-1 only.
import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node scripts/render-pdf.mjs <input.md> <output.pdf>");
  process.exit(1);
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 56;
const STYLES = {
  h1: { font: "F2", size: 17, leading: 26, wrap: 55 },
  h2: { font: "F2", size: 13, leading: 21, wrap: 72 },
  body: { font: "F1", size: 10, leading: 14, wrap: 96 },
  code: { font: "F3", size: 8.5, leading: 11.5, wrap: 92 },
};

const ASCII = { "₹": "Rs.", "–": "-", "—": "-", "−": "-", "‘": "'", "’": "'", "“": '"', "”": '"', "…": "...", "→": "->", "×": "x", "·": "-", "≥": ">=", "≤": "<=" };
const toAscii = (text) => text.replace(/[^\x20-\x7e]/g, (ch) => ASCII[ch] ?? "?");
const escapePdf = (text) => text.replace(/[\\()]/g, (ch) => `\\${ch}`);

function wrap(text, width) {
  if (text.length <= width) return [text];
  const indent = /^\s*(?:- |\d+\. )?/.exec(text)[0].replace(/\S/g, " ");
  const lines = [];
  let line = "";
  for (const word of text.split(/ +/)) {
    if (line && (line + " " + word).length > width) {
      lines.push(line);
      line = indent + word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function layout(markdown) {
  const out = [];
  let inCode = false;
  for (const raw of markdown.split(/\r?\n/)) {
    if (raw.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      for (const line of wrap(toAscii(raw), STYLES.code.wrap)) out.push({ style: "code", text: line });
      continue;
    }
    let text = raw
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
    let style = "body";
    const heading = /^(#{1,6})\s+(.*)$/.exec(text);
    if (heading) {
      style = heading[1].length === 1 ? "h1" : "h2";
      text = heading[2];
    } else if (/^\|?\s*:?-{3,}/.test(text)) {
      continue; // table separator row
    }
    text = toAscii(text).replace(/^(\s*)\* /, "$1- ");
    for (const line of wrap(text, STYLES[style].wrap)) out.push({ style, text: line });
  }
  return out;
}

function paginateLines(lines) {
  const pages = [[]];
  let y = PAGE_HEIGHT - MARGIN;
  for (const line of lines) {
    const { leading } = STYLES[line.style];
    if (y - leading < MARGIN) {
      pages.push([]);
      y = PAGE_HEIGHT - MARGIN;
    }
    y -= leading;
    pages.at(-1).push({ ...line, y });
  }
  return pages;
}

function contentStream(page, number, total) {
  const ops = page
    .filter((line) => line.text.trim() !== "")
    .map((line) => {
      const { font, size } = STYLES[line.style];
      return `BT /${font} ${size} Tf ${MARGIN} ${line.y.toFixed(1)} Td (${escapePdf(line.text)}) Tj ET`;
    });
  ops.push(`BT /F1 8 Tf ${PAGE_WIDTH - MARGIN - 40} 30 Td (Page ${number} of ${total}) Tj ET`);
  return ops.join("\n");
}

const pages = paginateLines(layout(readFileSync(input, "utf8")));
const objects = [];
const add = (body) => objects.push(body) && objects.length;

const catalogId = add("");
const pagesId = add("");
const fonts = [add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"), add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"), add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>")];
const pageIds = pages.map((page, i) => {
  const stream = contentStream(page, i + 1, pages.length);
  const contentId = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
  return add(
    `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${fonts[0]} 0 R /F2 ${fonts[1]} 0 R /F3 ${fonts[2]} 0 R >> >> /Contents ${contentId} 0 R >>`,
  );
});
objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

let pdf = "%PDF-1.4\n";
const offsets = objects.map((body, i) => {
  const offset = Buffer.byteLength(pdf, "latin1");
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  return offset;
});
const xref = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
writeFileSync(output, pdf, "latin1");
console.log(`wrote ${output} (${pages.length} page${pages.length === 1 ? "" : "s"})`);
__FILE__

f intake/README.md <<'__FILE__'
# Intake

How each reported problem reached the team. These are the raw artifacts a debugger starts from:
a QA report, a server log, a few GitHub issues and two screenshots.

| File                                      | Kind            |
| ----------------------------------------- | --------------- |
| `bug-01-screenshot.png`                   | screenshot (capture manually, see below) |
| `bug-02-issue.md`                         | GitHub issue    |
| `bug-03-qa-report.md` / `.pdf`            | QA report       |
| `bug-04-issue.md`                         | GitHub issue    |
| `bug-05-issue.md`                         | GitHub issue    |
| `bug-06-server.log`                       | server log      |
| `bug-07-issue.md`                         | GitHub issue with log excerpt |
| `bug-08-screenshot.png`                   | screenshot (capture manually, see below) |

## Capturing the two screenshots

The screenshots are deliberately not generated. Capture them from the real UI:

1. From the repository root run `npm install`, then `cd ui && npm run dev` and open the printed
   URL (normally <http://localhost:5173>).
2. **`bug-01-screenshot.png`** — add any product (e.g. *Ceramic Coffee Mug*) to the cart, leave
   the coupon field **empty** and click **Apply**. The cart summary now shows `₹NaN` for the
   discount and the total. Screenshot the cart panel and save it as
   `intake/bug-01-screenshot.png`.
3. **`bug-08-screenshot.png`** — reload, add *Bluetooth Speaker* (₹2,499), type `DIWALI60` and
   click **Apply**, then type `DIWALI60` again and click **Apply** a second time. The summary
   shows `Discount (120% off)` and a negative total. Screenshot the cart panel and save it as
   `intake/bug-08-screenshot.png`.

## Regenerating the QA report PDF

```sh
node scripts/render-pdf.mjs intake/bug-03-qa-report.md intake/bug-03-qa-report.pdf
```
__FILE__

f intake/bug-02-issue.md <<'__FILE__'
# Cart total is ₹0.01 lower than it should be for some products

**Labels:** `checkout`, `money`

## Description

For some carts the GST line — and therefore the order total — is one paisa short of 18% of the
subtotal. Finance noticed it while reconciling invoices: our invoice generator (which computes GST
from the subtotal) disagrees with the amount we charged by ₹0.01 on a handful of orders.

It does not happen for every product, which is why nobody caught it in review.

## Steps to reproduce

1. Open the shop and add **Cast Iron Tawa** (₹1,049.25) to an empty cart, quantity 1.
2. Look at the cart summary.

## Expected

- Subtotal: ₹1,049.25
- GST (18%): **₹188.87** (18% of ₹1,049.25 is ₹188.865, which rounds half-up to ₹188.87)
- Shipping: Free
- Total: **₹1,238.12**

## Actual

- Subtotal: ₹1,049.25
- GST (18%): **₹188.86**
- Shipping: Free
- Total: **₹1,238.11**

## Notes

- Carts with whole-rupee prices look fine.
- The standalone GST helper gives the right answer for the same amount, so the difference seems
  to come from how the cart adds things up.
- The charged amount matches the (wrong) cart total, so customers are under-charged by ₹0.01.
__FILE__

f intake/bug-03-qa-report.md <<'__FILE__'
# QA Report: Delivery estimate is one day early for evening orders

**Report ID:** QA-2026-117
**Component:** Checkout / delivery estimate
**Severity:** Major (customer-facing promise is wrong)
**Environment:** staging, Chrome 141 on macOS, device clock set to Asia/Kolkata (IST)
**Tester:** QA team, Bengaluru

## Summary

The estimated delivery date shown in the cart and stored on the order is one day too early for
orders placed at or after 8:00 PM IST. Our dispatch cutoff is 8 PM IST: anything ordered after
that is dispatched the next day, so the promise should move out by a day. It does not.

## Business rule under test

- Orders placed before 20:00 IST are dispatched the same day.
- Orders placed at or after 20:00 IST are dispatched the next day.
- Transit takes 3 days; Sundays are not delivery days.

## Steps to reproduce

1. Set the device clock (or the service clock in the test harness) to **Tuesday 10 March 2026,
   21:00 IST** (15:30 UTC).
2. Add any product to the cart, e.g. Ceramic Coffee Mug.
3. Read the "Estimated delivery" line under the cart totals.
4. Place the order and open "Your orders"; read "arrives ...".

## Expected result

Dispatch Wednesday 11 March, delivery **Sat, 14 Mar** (2026-03-14).

## Actual result

Cart and order both show **Fri, 13 Mar** (2026-03-13) - the same date as a morning order.

## Additional observations

| Order time (IST)        | UTC equivalent | Expected   | Actual     | Result |
| ----------------------- | -------------- | ---------- | ---------- | ------ |
| Tue 10 Mar, 10:00       | 04:30          | Fri 13 Mar | Fri 13 Mar | Pass   |
| Tue 10 Mar, 19:55       | 14:25          | Fri 13 Mar | Fri 13 Mar | Pass   |
| Tue 10 Mar, 20:05       | 14:35          | Sat 14 Mar | Fri 13 Mar | FAIL   |
| Tue 10 Mar, 21:00       | 15:30          | Sat 14 Mar | Fri 13 Mar | FAIL   |
| Tue 10 Mar, 23:45       | 18:15          | Sat 14 Mar | Fri 13 Mar | FAIL   |
| Thu 12 Mar, 21:30       | 16:00          | Tue 17 Mar | Mon 16 Mar | FAIL   |

- Every failing case is at or after 20:00 IST; the estimate is always exactly one day early.
- Morning and afternoon orders are correct, including orders just after midnight IST.
- Reproduced on two machines, one with the OS timezone set to UTC and one set to IST, so it
  does not depend on the browser's local timezone.
- This worked in the previous release that QA signed off; it looks like a regression.

## Attachments

- Screen recording available on request.
__FILE__

f intake/bug-04-issue.md <<'__FILE__'
# Last product never shows up in the catalog

**Labels:** `catalog`, `ui`

## Description

We have 25 products but I can only ever page through 24 of them in the storefront. The **Wool
Pashmina Shawl** is in the catalog data, shows up when you search for it, and can be added to a
cart, but it never appears when browsing the product grid.

## Steps to reproduce

1. Open the shop with an empty search box (6 products per page).
2. Click **Next ›** until the button is disabled.

## Expected

25 products at 6 per page is 5 pages. Page 5 shows the Wool Pashmina Shawl and the footer says
**Page 5 of 5 · Showing 25–25 of 25**.

## Actual

The pager stops at **Page 4 of 4 · Showing 19–24 of 25** and **Next ›** is disabled. The footer
itself says there are 25 products, but only 24 can be reached.

## Notes

- Searching "Shawl" finds it (a single page of results), so the product data is fine.
- Looks like it only bites when the last page would hold exactly one product; when we had 23
  products nobody noticed.
__FILE__

f intake/bug-05-issue.md <<'__FILE__'
# Search is case-sensitive now

**Labels:** `catalog`, `regression`

## Description

Product search used to ignore case. Since the latest deploy it only matches when the capitalisation
is exactly the same as the product name, so most real searches (people type in lowercase on
mobile) come back empty.

## Steps to reproduce

1. Open the shop.
2. Type `mug` in the search box.

## Expected

**Ceramic Coffee Mug** is listed (same as searching `Mug`).

## Actual

"No products match “mug”."

## More examples

| Query         | Before  | Now       |
| ------------- | ------- | --------- |
| `Mug`         | 1 result | 1 result |
| `mug`         | 1 result | 0 results |
| `KITCHEN`     | 5 results | 0 results |
| `bluetooth`   | 1 result | 0 results |

## Notes

This is a regression — it definitely worked last sprint. Nothing about search was mentioned in
the release notes.
__FILE__

f intake/bug-06-server.log <<'__FILE__'
2026-09-18T14:01:52.113Z info  [http] GET /api/products?page=3&pageSize=6 200 4ms ua="Mozilla/5.0 (Linux; Android 14)" ip=10.12.4.88
2026-09-18T14:01:58.407Z info  [http] POST /api/carts 201 3ms cartId=cart-8841
2026-09-18T14:02:03.921Z info  [http] POST /api/carts/cart-8841/items 200 6ms body={"productId":"p14","quantity":"1"}
2026-09-18T14:02:03.922Z debug [cart] addItem cartId=cart-8841 productId=p14 quantity=1 lines=1
2026-09-18T14:02:09.664Z info  [http] PATCH /api/carts/cart-8841/items/p14 200 5ms body={"quantity":"-3"}
2026-09-18T14:02:09.665Z debug [cart] setQuantity cartId=cart-8841 productId=p14 quantity=-3
2026-09-18T14:02:09.667Z debug [cart] totals cartId=cart-8841 itemCount=-3 subtotal=-3897 discount=0 tax=-701.46 shipping=49 total=-4549.46
2026-09-18T14:02:13.402Z info  [http] POST /api/orders 202 2ms cartId=cart-8841 requestId=req_7f2c91
2026-09-18T14:02:13.404Z info  [orders] placing order cartId=cart-8841 lines=1 total=-4549.46
2026-09-18T14:02:13.405Z info  [payments] charge requested reference=cart-8841 amount=-4549.46 currency=INR
2026-09-18T14:02:14.188Z warn  [payments] gateway accepted charge with non-positive amount reference=cart-8841 amount=-4549.46 paymentId=pay_104233
2026-09-18T14:02:14.190Z info  [orders] order placed id=ORD-5521 cartId=cart-8841 items=[{"productId":"p14","name":"Power Bank 10000mAh","unitPrice":1299,"quantity":-3}] subtotal=-3897 tax=-701.46 shipping=49 total=-4549.46 estimatedDelivery=2026-09-22
2026-09-18T14:02:14.191Z info  [http] POST /api/orders 201 789ms requestId=req_7f2c91 orderId=ORD-5521
2026-09-18T14:02:31.550Z info  [http] GET /api/orders 200 2ms count=1
2026-09-18T14:05:02.019Z error [reconciliation] settlement mismatch orderId=ORD-5521 paymentId=pay_104233 expected>0 got=-4549.46 action=flag_for_review
__FILE__

f intake/bug-07-issue.md <<'__FILE__'
# Double-clicking "Place order" creates two orders and charges twice

**Labels:** `orders`, `payments`, `priority: high`

## Description

A customer double-clicked **Place order** (the button takes a moment while the payment goes
through) and ended up with **two identical orders** and **two charges** for the same cart. Support
has seen three of these this week.

## Steps to reproduce

1. Add **Bluetooth Speaker** to the cart.
2. Double-click **Place order** quickly (both clicks within the ~1 second the payment takes).

## Expected

One order (`ORD-0001`) and one payment. The second click should be ignored or should return the
same order.

## Actual

Two orders, `ORD-0001` and `ORD-0002`, both for the same cart, each with its own payment.
Placing the *same* cart again after the first order has finished is correctly rejected with
"Cart … has already been ordered", so the duplicate check exists — it just does not catch the
second click while the first one is still in progress.

## Log excerpt

```
2026-09-21T09:14:07.201Z info  [http] POST /api/orders 202 1ms cartId=cart-3310 requestId=req_a1
2026-09-21T09:14:07.203Z info  [payments] charge requested reference=cart-3310 amount=2948.82
2026-09-21T09:14:07.389Z info  [http] POST /api/orders 202 1ms cartId=cart-3310 requestId=req_a2
2026-09-21T09:14:07.390Z info  [payments] charge requested reference=cart-3310 amount=2948.82
2026-09-21T09:14:08.004Z info  [orders] order placed id=ORD-0001 cartId=cart-3310 paymentId=pay_000001 total=2948.82
2026-09-21T09:14:08.191Z info  [orders] order placed id=ORD-0002 cartId=cart-3310 paymentId=pay_000002 total=2948.82
2026-09-21T09:14:08.192Z warn  [reconciliation] duplicate charge reference=cart-3310 payments=pay_000001,pay_000002
```

## Notes

Disabling the button in the UI would hide it, but the API should be idempotent per cart —
mobile clients and retries hit the same path.
__FILE__

node scripts/render-pdf.mjs intake/bug-03-qa-report.md intake/bug-03-qa-report.pdf >/dev/null
commit "docs: add intake reports for open issues"

# ---------------------------------------------------------------------------------------------
# 35. This script
# ---------------------------------------------------------------------------------------------
mkdir -p scripts
if [[ ! "$SCRIPT_PATH" -ef scripts/build-history.sh ]]; then cp "$SCRIPT_PATH" scripts/build-history.sh; fi
chmod +x scripts/build-history.sh scripts/render-pdf.mjs
commit "chore: add script to rebuild repository history"

# ---------------------------------------------------------------------------------------------
# 36. Answer key + probes
# ---------------------------------------------------------------------------------------------
f docs/vitest.probes.config.ts <<'__FILE__'
import { defineConfig } from "vitest/config";

// Runs only the seeded-bug probes: npx vitest run --config docs/vitest.probes.config.ts
export default defineConfig({
  test: {
    include: ["docs/bug-probes.test.ts"],
    environment: "node",
  },
});
__FILE__

f docs/bug-probes.test.ts <<'__FILE__'
// Probes for the eight seeded bugs listed in docs/bugs.md. Each probe asserts the *correct*
// behaviour, so on the seeded history every probe FAILS; reverting a bug's introducing commit
// makes its probe pass. Not part of `npm test`.
import { describe, expect, it } from "vitest";
import { addItem, createCart } from "../src/cart/cart";
import { applyCoupon } from "../src/cart/coupons";
import { computeTotals } from "../src/cart/totals";
import { paginate } from "../src/catalog/paginate";
import { PRODUCTS } from "../src/catalog/products";
import { searchProducts } from "../src/catalog/search";
import { estimateDelivery } from "../src/delivery/estimate";
import { FakePaymentGateway } from "../src/orders/payments";
import { OrderService } from "../src/orders/service";
import { calculateGst } from "../src/tax/gst";

describe("seeded bug probes", () => {
  it("#1 an empty coupon field leaves the total unchanged", () => {
    const cart = addItem(createCart("probe-1"), "p01");
    expect(computeTotals(applyCoupon(cart, "")).total).toBe(computeTotals(cart).total);
  });

  it("#2 GST on the cart is 18% of the subtotal, rounded half-up", () => {
    const totals = computeTotals(addItem(createCart("probe-2"), "p03"));
    expect(totals.tax).toBe(calculateGst(totals.subtotal));
    expect(totals.total).toBe(1238.12);
  });

  it("#3 orders after 8 PM IST are dispatched the next day", () => {
    expect(estimateDelivery(new Date("2026-03-10T21:00:00+05:30"))).toBe("2026-03-14");
  });

  it("#4 the last catalog page includes the last product", () => {
    const last = paginate(PRODUCTS, 5, 6);
    expect(last.totalPages).toBe(5);
    expect(last.items.map((product) => product.id)).toEqual(["p25"]);
  });

  it("#5 search ignores case", () => {
    expect(searchProducts(PRODUCTS, "mug").map((product) => product.id)).toEqual(["p01"]);
  });

  it("#6 negative quantities are rejected", () => {
    expect(() => addItem(createCart("probe-6"), "p14", -3)).toThrow();
  });

  it("#7 a double-click on Place order creates one order", async () => {
    const service = new OrderService({ payments: new FakePaymentGateway(5) });
    const cart = addItem(createCart("probe-7"), "p13");
    await Promise.allSettled([service.placeOrder(cart), service.placeOrder(cart)]);
    expect(service.listOrders()).toHaveLength(1);
  });

  it("#8 applying the same coupon twice does not double the discount", () => {
    const cart = addItem(createCart("probe-8"), "p13");
    const once = computeTotals(applyCoupon(cart, "DIWALI60"));
    const twice = computeTotals(applyCoupon(applyCoupon(cart, "DIWALI60"), "DIWALI60"));
    expect(twice.discount).toBe(once.discount);
    expect(twice.total).toBeGreaterThan(0);
  });
});
__FILE__

f docs/bugs.md <<'__FILE__'
# Seeded bug answer key

> **Private.** This is the answer key for the BugProof demo. Do not link it from the README or
> surface it in the UI.

The ShopLite history is produced by `scripts/build-history.sh`, which weaves eight ordinary-looking
commits into the history, each introducing one bug that the test suite at that point (and the final
suite) does not catch. The SHAs below were written by the same run that created the commits; if the
history is rebuilt, this file is regenerated with the new SHAs.

Probes: `npx vitest run --config docs/vitest.probes.config.ts` runs one probe per bug. Each asserts
the correct behaviour, so on HEAD **all 8 fail**; `git revert <sha>` of a bug's commit makes its
probe pass.

| # | Bug | Type | Arrives as | Introducing commit |
|---|-----|------|------------|--------------------|
| 1 | Empty coupon field → total shows `₹NaN` | type coercion | screenshot | `@@SHA1@@` @@MSG1@@ |
| 2 | Totals off by ₹0.01 | float rounding | issue text | `@@SHA2@@` @@MSG2@@ |
| 3 | Delivery date one day early after 8 PM IST | timezone | QA PDF | `@@SHA3@@` @@MSG3@@ |
| 4 | Pagination drops the last product | off-by-one | issue text | `@@SHA4@@` @@MSG4@@ |
| 5 | Search became case-sensitive | regression | issue text | `@@SHA5@@` @@MSG5@@ |
| 6 | Negative quantity accepted → negative total | validation | server log | `@@SHA6@@` @@MSG6@@ |
| 7 | Double-click "Place order" → two orders | race condition | issue + log | `@@SHA7@@` @@MSG7@@ |
| 8 | Coupon applies twice → discount over 100% | logic | screenshot | `@@SHA8@@` @@MSG8@@ |

---

## 1. Empty coupon field → total shows `₹NaN` (hero)

- **Commit:** `@@SHA1@@` — `@@MSG1@@`
- **Files touched:** @@FILES1@@
- **Intake:** `intake/bug-01-screenshot.png` (captured manually, see `intake/README.md`)
- **Root cause:** `applyCoupon` stores the normalised input even when it is empty (`""`). The old
  `couponDiscount` guarded with `if (!code)`, which treated `""` as "no coupon". The refactor
  changed the guard to `if (code === undefined)`, so `""` falls through to
  `parseCouponRule(COUPON_RULES[""])` → `parseCouponRule(undefined)`: `PERCENT_SUFFIX.test(undefined)`
  coerces to the string `"undefined"` (false) and `parseFloat(undefined)` is `NaN`, giving a flat
  discount of `NaN`. `Math.min(NaN, subtotal)` is `NaN`, the total becomes `NaN`, and
  `Intl.NumberFormat` renders `₹NaN`.
- **Repro (UI):** `npm run dev`; add *Ceramic Coffee Mug*; leave the coupon field empty; click
  **Apply**. Discount shows `−₹NaN`, Total shows `₹NaN`.
- **Repro (code):** `computeTotals(applyCoupon(addItem(createCart(), "p01"), "")).total` → `NaN`.
- **Fix:** restore the falsy guard (or make `applyCoupon` ignore empty input).

## 2. Totals off by ₹0.01

- **Commit:** `@@SHA2@@` — `@@MSG2@@`
- **Files touched:** @@FILES2@@
- **Intake:** `intake/bug-02-issue.md`
- **Root cause:** `computeTotals` switched from `calculateGst(subtotal)` (integer-paise, exact
  half-up rounding) to `roundMoney(sumBy(lines, l => l.lineTotal * GST_RATE))`. In binary floating
  point `1049.25 * 0.18` is `188.86499999999998`, which rounds down to `188.86` instead of `188.87`.
- **Repro (UI):** add *Cast Iron Tawa* (₹1,049.25). GST shows ₹188.86, total ₹1,238.11; expected
  ₹188.87 and ₹1,238.12.
- **Repro (code):** `computeTotals(addItem(createCart(), "p03"))` → `{ tax: 188.86, total: 1238.11 }`
  while `calculateGst(1049.25)` → `188.87`.
- **Fix:** compute GST with `calculateGst(subtotal)` (paise arithmetic).

## 3. Delivery date one day early after 8 PM IST

- **Commit:** `@@SHA3@@` — `@@MSG3@@`
- **Files touched:** @@FILES3@@
- **Intake:** `intake/bug-03-qa-report.pdf` (source: `intake/bug-03-qa-report.md`)
- **Root cause:** the "perf" rewrite shifts the timestamp by +05:30 into `ist`, but checks the
  dispatch cutoff with `orderedAt.getUTCHours()` instead of `ist.getUTCHours()`. 20:00–23:59 IST is
  14:30–18:29 UTC, so the cutoff never triggers in that window and the estimate is one day early.
  (It also fires wrongly for 01:30–05:29 IST, pushing those estimates a day late.)
- **Repro (code):** `estimateDelivery(new Date("2026-03-10T21:00:00+05:30"))` → `"2026-03-13"`;
  expected `"2026-03-14"`.
- **Repro (UI):** set the system clock to any time after 20:00 IST, add an item, read "Estimated
  delivery" (or place an order and read "arrives …").
- **Fix:** use `ist.getUTCHours()` for the cutoff check.

## 4. Pagination drops the last product

- **Commit:** `@@SHA4@@` — `@@MSG4@@`
- **Files touched:** @@FILES4@@
- **Intake:** `intake/bug-04-issue.md`
- **Root cause:** the page count is now derived from the last index,
  `Math.ceil((items.length - 1) / pageSize)`, instead of `Math.ceil(items.length / pageSize)`.
  Whenever `items.length % pageSize === 1` the final page (holding just one item) is never counted,
  so it is unreachable and requests for it are clamped to the previous page. With 25 products and
  6 per page, *Wool Pashmina Shawl* (`p25`) can never be browsed to.
- **Repro (UI):** empty search, click **Next ›** until disabled → "Page 4 of 4 · Showing 19–24 of
  25"; there is no page 5.
- **Repro (code):** `paginate(PRODUCTS, 5, 6)` → `{ page: 4, totalPages: 4 }` (expected page 5 of 5
  with `["p25"]`).
- **Fix:** `Math.max(1, Math.ceil(items.length / pageSize))`.

## 5. Search became case-sensitive

- **Commit:** `@@SHA5@@` — `@@MSG5@@`
- **Files touched:** @@FILES5@@
- **Intake:** `intake/bug-05-issue.md`
- **Root cause:** the memoised index stores `${name} ${category}` without lower-casing, and the
  query is no longer lower-cased either, so matching became case-sensitive.
- **Repro (UI):** type `mug` → "No products match"; `Mug` works.
- **Repro (code):** `searchProducts(PRODUCTS, "mug")` → `[]`.
- **Fix:** lower-case the haystack when building the index and the needle when querying.

## 6. Negative quantity accepted → negative total

- **Commit:** `@@SHA6@@` — `@@MSG6@@`
- **Files touched:** @@FILES6@@
- **Intake:** `intake/bug-06-server.log`
- **Root cause:** `toQuantity` (integer ≥ 1) was replaced by `parseQuantity`, which only checks
  `Number.isFinite` and truncates — the lower bound was lost, so `-3` (or `"-3"`) is accepted.
- **Repro (UI):** add *Power Bank 10000mAh*, type `-3` in its quantity box and tab out. Subtotal
  −₹3,897.00, GST −₹701.46, total −₹4,549.46; the order can be placed.
- **Repro (code):** `computeTotals(addItem(createCart(), "p14", -3)).total` → `-4549.46`.
- **Fix:** reject non-integers and values < 1 in `parseQuantity` (keep 0 → remove in `setQuantity`).

## 7. Double-click "Place order" → two orders

- **Commit:** `@@SHA7@@` — `@@MSG7@@`
- **Files touched:** @@FILES7@@
- **Intake:** `intake/bug-07-issue.md` (includes a log excerpt)
- **Root cause:** the refactor removed the per-cart in-flight promise map and relies on
  "has this cart already been ordered?" — but the order is only recorded after
  `await payments.charge(...)`. Two concurrent calls both pass the check before either records its
  order (check-then-act race).
- **Repro (UI):** add an item, double-click **Place order** within the 800 ms simulated payment
  latency → two orders for the same cart.
- **Repro (code):** `await Promise.all([svc.placeOrder(cart), svc.placeOrder(cart)])` → two orders.
- **Fix:** restore the in-flight map (share one submission per cart id) or reserve the cart before
  awaiting the payment.

## 8. Coupon applies twice → discount over 100%

- **Commit:** `@@SHA8@@` — `@@MSG8@@`
- **Files touched:** @@FILES8@@
- **Intake:** `intake/bug-08-screenshot.png` (captured manually, see `intake/README.md`)
- **Root cause:** stacking changed `couponCode` to a `couponCodes` list, but `applyCoupon` appends
  without de-duplicating and `computeTotals` sums the per-coupon discounts without the old
  `Math.min(…, subtotal)` cap. Applying `DIWALI60` twice gives a 120% discount.
- **Repro (UI):** add *Bluetooth Speaker* (₹2,499); apply `DIWALI60` twice → "Discount (120% off)
  −₹2,998.80", total −₹49.98.
- **Repro (code):** `computeTotals(applyCoupon(applyCoupon(addItem(createCart(), "p13"), "DIWALI60"), "DIWALI60"))`
  → `{ discount: 2998.8, total: -49.98 }`.
- **Fix:** ignore a code that is already applied and cap the combined discount at the subtotal.
__FILE__

answer_key="$(cat docs/bugs.md)"
for n in 1 2 3 4 5 6 7 8; do
  sha="${BUG_SHA[$n]}"
  files="$(git diff-tree --no-commit-id --name-only -r "$sha" | awk '{ printf "%s`%s`", (NR > 1 ? ", " : ""), $0 }')"
  answer_key="${answer_key//@@SHA$n@@/$sha}"
  answer_key="${answer_key//@@MSG$n@@/${BUG_MSG[$n]}}"
  answer_key="${answer_key//@@FILES$n@@/$files}"
done
printf '%s\n' "$answer_key" >docs/bugs.md
commit "docs: add maintainer answer key and probes"

# ---------------------------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------------------------
echo
echo "Done: $COMMITS commits on $(git rev-parse --abbrev-ref HEAD) ($(git rev-list --count HEAD) total in repository)."
echo "Bug-introducing commits:"
for n in 1 2 3 4 5 6 7 8; do
  printf '  #%d  %s  %s\n' "$n" "${BUG_SHA[$n]}" "${BUG_MSG[$n]}"
done
