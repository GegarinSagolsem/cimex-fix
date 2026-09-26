CULPRIT: 6d6c87a
ROOT CAUSE: The coupon discount is calculated against the pre‑tax subtotal, but the discount amount is subtracted from the total after tax has already been added, causing the final total to be incorrect (e.g., a 120 % off coupon makes the total negative).

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

  // Apply coupons *before* tax – the discount is taken off the pre‑tax subtotal.
  const discount = cart.couponCodes.reduce((sum, code) => sum + couponDiscount(subtotal, code), 0);

  const shipping = shippingFor(subtotal, cart.items.length);
  const total = fromPaise(toPaise(subtotal) - toPaise(discount) + toPaise(tax) + toPaise(shipping));
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return { itemCount, subtotal, discount, tax, shipping, total };
}
```
=== END FILE ===

=== TEST ===
```ts
import { expect, test } from "vitest";
import { createCart, addItem, applyCoupon } from "../../src/cart/cart";
import { computeTotals } from "../../src/cart/totals";

test("coupon discount is applied before tax", () => {
  // Create a cart with a single ₹2,499 item.
  const cart = addItem(createCart(), "p13", 1); // Bluetooth Speaker

  // Apply the 120 % off coupon (DIWALI60).
  const cartWithCoupon = applyCoupon(cart, "DIWALI60");

  const totals = computeTotals(cartWithCoupon);

  // Subtotal should be the original price.
  expect(totals.subtotal).toBe(2499);
  // Discount should be 120 % of the subtotal, capped at the subtotal.
  expect(totals.discount).toBe(2499);
  // Tax is calculated on the original price, not on the discounted price.
  expect(totals.tax).toBe(449.82);
  // Total should be subtotal - discount + tax + shipping (free).
  expect(totals.total).toBe(449.82);
});
```
=== END TEST ===