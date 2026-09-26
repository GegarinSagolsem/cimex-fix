CULPRIT: 185f248
ROOT CAUSE: The bug was introduced when allowing stacking multiple coupon codes, which caused the discount to be calculated incorrectly when multiple coupons are applied.
=== FILE src/cart/totals.ts ===
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
  const discount = cart.couponCodes.reduce((sum, code) => sum + couponDiscount(subtotal - sum, code), 0);

  const shipping = shippingFor(subtotal, cart.items.length);
  const total = fromPaise(toPaise(subtotal) - toPaise(discount) + toPaise(tax) + toPaise(shipping));
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return { itemCount, subtotal, discount, tax, shipping, total };
}
```
=== END FILE ===
=== TEST ===
```ts
import { describe, it, expect } from "vitest";
import { createCart, addItem, applyCoupon } from "../../src/cart/cart";
import { computeTotals } from "../../src/cart/totals";
import { COUPON_RULES } from "../../src/cart/coupons";

describe("Cart Totals with Multiple Coupons", () => {
  it("should correctly apply multiple coupons", () => {
    const cart = createCart();
    addItem(cart, "p01", 1); // Ceramic Coffee Mug
    addItem(cart, "p02", 1); // Steel Water Bottle 1L
    applyCoupon(cart, "SAVE10");
    applyCoupon(cart, "WELCOME15");

    const totals = computeTotals(cart);

    const subtotal = 349 + 599;
    const discount = (subtotal * 10) / 100 + (subtotal * 15) / 100;
    const tax = (subtotal - discount) * 0.18;
    const shipping = 49;
    const total = subtotal - discount + tax + shipping;

    expect(totals.subtotal).toBe(subtotal);
    expect(totals.discount).toBeCloseTo(discount);
    expect(totals.tax).toBeCloseTo(tax);
    expect(totals.shipping).toBe(shipping);
    expect(totals.total).toBeCloseTo(total);
  });
});
```
=== END TEST ===