CULPRIT: 185f248
ROOT CAUSE: The bug is caused by the `couponDiscount` function being called for each coupon code in the `computeTotals` function, which results in the discount being applied multiple times to the same subtotal. This leads to an incorrect total calculation. The `couponDiscount` function should be called with the cumulative discount applied to the subtotal.

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
  let cumulativeDiscount = 0;
  for (const code of cart.couponCodes) {
    cumulativeDiscount += couponDiscount(subtotal - cumulativeDiscount, code);
  }
  const discount = cumulativeDiscount;

  const shipping = shippingFor(subtotal, cart.items.length);
  const total = fromPaise(toPaise(subtotal) - toPaise(discount) + toPaise(tax) + toPaise(shipping));
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return { itemCount, subtotal, discount, tax, shipping, total };
}
```
=== END FILE ===
=== TEST ===
```typescript
import { describe, expect, it } from "vitest";
import { createCart, addItem } from "../../src/cart/cart";
import { applyCoupon } from "../../src/cart/coupons";
import { computeTotals } from "../../src/cart/totals";

describe("computeTotals", () => {
  it("should apply coupons cumulatively", () => {
    const cart = createCart();
    const product = { id: "p01", name: "Test Product", price: 100 };
    addItem(cart, product.id, 1);
    const cartWithCoupon = applyCoupon(cart, "SAVE10");
    const cartWithTwoCoupons = applyCoupon(cartWithCoupon, "SAVE10");
    const totals = computeTotals(cartWithTwoCoupons);
    expect(totals.total).toBeCloseTo(171.0); // 100 - 10% - 10% of 90 + 18% of 100 + 0
  });
});
```
=== END TEST ===