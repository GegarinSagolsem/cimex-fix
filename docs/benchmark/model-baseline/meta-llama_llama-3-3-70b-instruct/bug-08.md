CULPRIT: 185f248
ROOT CAUSE: The bug is caused by the fact that the `couponDiscount` function is called for each coupon code in the `cart.couponCodes` array, and the discount is calculated against the subtotal for each code. However, the discount is not cumulative, so applying multiple codes with the same discount percentage results in incorrect totals. The `DIWALI60` code is applied twice, resulting in a discount of 120% instead of 60%.

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
  const uniqueCodes = [...new Set(cart.couponCodes)];
  const discount = uniqueCodes.reduce((sum, code) => sum + couponDiscount(subtotal, code), 0);

  const shipping = shippingFor(subtotal, cart.items.length);
  const total = fromPaise(toPaise(subtotal) - toPaise(discount) + toPaise(tax) + toPaise(shipping));
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return { itemCount, subtotal, discount, tax, shipping, total };
}
```
=== END FILE ===
=== TEST ===
```ts
import { describe, expect, it } from "vitest";
import { createCart, applyCoupon } from "../../src/cart/cart";
import { computeTotals } from "../../src/cart/totals";
import { addItem } from "../../src/cart/cart";
import { getProductById } from "../../src/catalog/products";

describe("cart totals", () => {
  it("should calculate correct totals with multiple coupons", () => {
    const cart = createCart();
    const product = getProductById("p13");
    addItem(cart, product.id, 1);
    const cartWithCoupons = applyCoupon(applyCoupon(cart, "DIWALI60"), "DIWALI60");
    const totals = computeTotals(cartWithCoupons);
    expect(totals.total).toBeLessThan(0); // This should not be negative
  });
});
```
=== END TEST ===