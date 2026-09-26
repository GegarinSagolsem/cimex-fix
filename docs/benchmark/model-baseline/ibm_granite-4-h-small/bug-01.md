CULPRIT: 5dd2952
ROOT CAUSE: The `computeTotals` function in `src/cart/totals.ts` incorrectly calculates the discount by applying each coupon to the original subtotal instead of the running subtotal after previous discounts, causing the discount to be NaN when multiple coupons are applied.

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
  let subtotal = roundMoney(sumBy(lines, (line) => line.lineTotal));

  // Apply coupons sequentially to the running subtotal
  let discount = 0;
  for (const code of cart.couponCodes) {
    const amount = couponDiscount(subtotal, code);
    discount += amount;
    subtotal -= amount;
  }

  const tax = roundMoney(sumBy(lines, (line) => line.lineTotal * GST_RATE));
  const shipping = shippingFor(subtotal, cart.items.length);
  const total = fromPaise(toPaise(subtotal) + toPaise(tax) + toPaise(shipping));
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return { itemCount, subtotal, discount, tax, shipping, total };
}
```
=== END FILE ===

=== TEST ===
```ts
import { describe, expect, test } from "vitest";
import { createCart, addItem, applyCoupon } from "../../src/cart/cart";
import { computeTotals } from "../../src/cart/totals";

describe("Cart totals with multiple coupons", () => {
  test("should compute correct totals when applying multiple coupons", () => {
    const cart = createCart();
    cart = addItem(cart, "p01", 1); // Ceramic Coffee Mug ₹349
    cart = addItem(cart, "p02", 1); // Steel Water Bottle 1L ₹599
    cart = applyCoupon(cart, "SAVE10"); // 10% off
    cart = applyCoupon(cart, "WELCOME15"); // 15% off

    const totals = computeTotals(cart);
    expect(totals.discount).toBe(124.75); // 10% + 15% of the running subtotal
    expect(totals.total).toBe(723.64); // Subtotal - discount + tax + shipping
  });
});
```
=== END TEST ===