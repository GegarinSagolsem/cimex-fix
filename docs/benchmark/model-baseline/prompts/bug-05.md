<!-- system -->
You are an expert TypeScript engineer. You are fixing a reported bug in a repository. You cannot run code and you get exactly one answer.

<!-- user -->
Repository: ShopLite, a small TypeScript shop library (Node, ES modules, tested with Vitest).

## Bug report
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

## Source code (every file under src/)
### src/cart/cart.ts
```ts
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
  if (!Number.isFinite(value) || value < 0) throw new InvalidQuantityError(input);
  return Math.trunc(value);
}
```

### src/cart/coupons.ts
```ts
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
  if (!code) return cart;
  if (!isKnownCoupon(code)) throw new InvalidCouponError(input.trim());
  if (cart.couponCodes.includes(code)) return cart;
  return { ...cart, couponCodes: [...cart.couponCodes, code] };
}

export function removeCoupon(cart: Cart): Cart {
  return { ...cart, couponCodes: [] };
}
```

### src/cart/lineItems.ts
```ts
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
```

### src/cart/totals.ts
```ts
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
  // Cap combined discount at subtotal so total can never go negative.
  const discount = Math.min(
    cart.couponCodes.reduce((sum, code) => sum + couponDiscount(subtotal, code), 0),
    subtotal,
  );

  const shipping = shippingFor(subtotal, cart.items.length);
  const total = fromPaise(toPaise(subtotal) - toPaise(discount) + toPaise(tax) + toPaise(shipping));
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return { itemCount, subtotal, discount, tax, shipping, total };
}
```

### src/catalog/paginate.ts
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
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
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
```

### src/catalog/products.ts
```ts
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
```

### src/catalog/search.ts
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
  const needle = query.trim();
  if (needle === "") return [...products];
  return indexFor(products)
    .filter((entry) => entry.haystack.includes(needle))
    .map((entry) => entry.product);
}
```

### src/currency/format.ts
```ts
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

/** Formats rupees for display, e.g. 123456.5 → "₹1,23,456.50". */
export function formatINR(amount: number): string {
  return inr.format(amount);
}

/** Formats a discount as a negative amount, e.g. 200 → "−₹200.00". */
export function formatDiscount(amount: number): string {
  return amount === 0 ? formatINR(0) : `−${formatINR(amount)}`;
}
```

### src/currency/money.ts
```ts
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
```

### src/delivery/estimate.ts
```ts
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
  if (ist.getUTCHours() >= DISPATCH_CUTOFF_HOUR) dispatch += DAY_MS;
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
```

### src/index.ts
```ts
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
```

### src/orders/payments.ts
```ts
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
```

### src/orders/service.ts
```ts
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
```

### src/tax/gst.ts
```ts
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
```

## Git history (newest first; files changed under src/ are listed under each commit)
5d1cea2 2026-09-26 Update the BugProof Bob pack so helper modes hand back to the Lead
0944d88 2026-09-26 Ignore a coupon that is already applied and cap the discount at the subtotal
    src/cart/coupons.ts
    src/cart/totals.ts
31835d5 2026-09-26 Use IST hour instead of UTC hour for the delivery dispatch cutoff
    src/delivery/estimate.ts
6d6c87a 2026-09-26 Ignore empty coupon codes instead of producing NaN totals
    src/cart/coupons.ts
df66390 2026-09-26 Add customer screenshots for the coupon bugs
e21313f 2026-09-26 Reject negative cart quantities
    src/cart/cart.ts
35a91bf 2026-09-26 Fix the last catalog page dropping the final product
    src/catalog/paginate.ts
5dd2952 2026-09-26 Add the BugProof Bob pack
49f8447 2026-09-26 Remove the internal build spec from the repository
d39a704 2026-09-25 docs: add intake reports for open issues
e6183a9 2026-09-25 test(tax): cover half-paisa rounding
5b78d42 2026-09-25 test: add checkout integration tests
185f248 2026-09-25 feat(cart): allow stacking multiple coupon codes
    src/cart/cart.ts
    src/cart/coupons.ts
    src/cart/totals.ts
f2329e5 2026-09-25 feat(ui): show estimated delivery in cart summary
cd1e16e 2026-09-25 test(orders): cover payment references and coupon totals
985e247 2026-09-25 refactor(orders): derive duplicate-order check from order history
    src/orders/service.ts
4b3d73e 2026-09-25 test(catalog): cover search ordering and page metadata
882203d 2026-09-25 refactor(catalog): compute pagination bounds explicitly
    src/catalog/paginate.ts
b4369d9 2026-09-25 perf(delivery): compute IST date without Intl.DateTimeFormat
    src/delivery/estimate.ts
f0fd3f2 2026-09-25 docs: add README
0d4230e 2026-09-25 feat(ui): place orders and show order history
7f02116 2026-09-25 feat(ui): add cart panel with coupon field and totals
a818359 2026-09-25 feat(ui): scaffold Vite UI with catalog, search and pagination
c3fb68f 2026-09-25 refactor(cart): accept numeric strings for quantities
    src/cart/cart.ts
649b24a 2026-09-25 perf(catalog): memoize search index
    src/catalog/search.ts
5a145cf 2026-09-25 test(currency): cover crore grouping and display rounding
98e2fce 2026-09-25 feat(cart): sum multiple line items in cart totals
    src/cart/totals.ts
8cc8c28 2026-09-25 feat(cart): expose line items with line totals
    src/cart/lineItems.ts
    src/index.ts
26e3e96 2026-09-25 feat(orders): list orders newest first
    src/orders/service.ts
1ed4c55 2026-09-25 feat(orders): add order placement with payment gateway
    src/index.ts
    src/orders/payments.ts
    src/orders/service.ts
fcff63b 2026-09-25 feat(delivery): skip Sundays when estimating delivery
    src/delivery/estimate.ts
6f7ca14 2026-09-25 feat(delivery): estimate delivery date in Asia/Kolkata
    src/delivery/estimate.ts
c3f394a 2026-09-25 refactor(coupons): extract coupon rule parser
    src/cart/coupons.ts
db5afbb 2026-09-25 test(cart): cover coupon rounding, caps and campaign codes
f376d02 2026-09-25 feat(cart): support coupon codes
    src/cart/coupons.ts
    src/cart/totals.ts
    src/index.ts
28e83cf 2026-09-25 feat(cart): add cart totals with GST and shipping
    src/cart/totals.ts
    src/index.ts
acaea2d 2026-09-25 feat(cart): add cart with add, update and remove
    src/cart/cart.ts
d258820 2026-09-25 feat(catalog): add pagination helper
    src/catalog/paginate.ts
    src/index.ts
32fa562 2026-09-25 feat(catalog): add product search
    src/catalog/search.ts
9c920d7 2026-09-25 feat(catalog): add seed product catalog
    src/catalog/products.ts
aa85950 2026-09-25 feat(tax): add GST calculation
    src/index.ts
    src/tax/gst.ts
17e6910 2026-09-25 feat(currency): add INR formatting and paise helpers
    src/currency/format.ts
    src/currency/money.ts
    src/index.ts
890fb3c 2026-09-25 chore: scaffold TypeScript project with Vitest
    src/index.ts
32d13b1 2026-09-25 chore: initial spec for demo target repo

## Your task
1. Find the root cause of the reported bug.
2. Name the commit from the history above that introduced it.
3. Fix it with the smallest correct change to files under src/. Keep exported names and signatures unchanged.
4. Write a Vitest regression test that fails on the current code and passes after your fix. It will be saved as
   tests/bugproof/model-repro.test.ts; import from "vitest" and from "../../src/...".

Reply in exactly this format and nothing else:
CULPRIT: <short commit hash from the history>
ROOT CAUSE: <one or two sentences>
=== FILE src/path/to/file.ts ===
<the complete new content of the file>
=== END FILE ===
(one FILE block per source file you change; leave out unchanged files)
=== TEST ===
<the complete test file>
=== END TEST ===