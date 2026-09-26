CULPRIT: 28e83cf
ROOT CAUSE: The bug was introduced when the `computeTotals` function was implemented. The issue arises from the order of operations when calculating the total amount, specifically when calculating the tax (GST) on the subtotal. The tax is calculated by summing the GST for each line item, which can lead to a rounding error.

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

  // Coupons come off the pre-tax subtotal; GST is charged on the list price.
  // Cap combined discount at subtotal so total can never go negative.
  const discount = Math.min(
    cart.couponCodes.reduce((sum, code) => sum + couponDiscount(subtotal, code), 0),
    subtotal,
  );

  // Calculate tax on the subtotal after discount
  const tax = roundMoney((subtotal - discount) * GST_RATE);

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
import { createCart, addItem } from "../../src/cart/cart";
import { computeTotals } from "../../src/cart/totals";
import { getProductById } from "../../src/catalog/products";

describe("cart totals repro", () => {
  it("matches the invoice generator for known-bad products", () => {
    const cart = addItem(createCart(), "p03");
    const totals = computeTotals(cart);
    expect(totals.subtotal).toBe(1049.25);
    expect(totals.tax).toBe(188.87);
    expect(totals.total).toBe(1238.12);
  });
});
```

=== END TEST ===