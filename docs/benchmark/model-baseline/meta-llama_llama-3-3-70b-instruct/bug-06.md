CULPRIT: 185f248
ROOT CAUSE: The bug is caused by the `computeTotals` function in `src/cart/totals.ts` not handling negative quantities correctly, resulting in incorrect totals and ultimately leading to a payment gateway error. This issue was introduced when the cart was updated to allow stacking multiple coupon codes.
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
  const discount = cart.couponCodes.reduce((sum, code) => sum + couponDiscount(subtotal, code), 0);

  const shipping = shippingFor(subtotal, cart.items.length);
  const total = fromPaise(toPaise(subtotal) - toPaise(discount) + toPaise(tax) + toPaise(shipping));
  const itemCount = cart.items.reduce((sum, item) => sum + Math.max(item.quantity, 0), 0);
  return { itemCount, subtotal, discount, tax, shipping, total };
}
```
=== END FILE ===
=== TEST ===
```ts
import { describe, expect, it } from "vitest";
import { createCart, addItem, setQuantity, computeTotals } from "../../src/cart";

describe("computeTotals", () => {
  it("should handle negative quantities correctly", () => {
    const cart = createCart();
    const cartItem = addItem(cart, "p14", 1);
    const updatedCart = setQuantity(cartItem, "p14", -3);
    const totals = computeTotals(updatedCart);
    expect(totals.itemCount).toBe(0);
    expect(totals.subtotal).toBe(0);
    expect(totals.discount).toBe(0);
    expect(totals.tax).toBe(0);
    expect(totals.shipping).toBe(0);
    expect(totals.total).toBe(0);
  });
});
```
=== END TEST ===