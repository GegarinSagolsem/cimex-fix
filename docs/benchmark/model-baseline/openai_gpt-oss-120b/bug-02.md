CULPRIT: 28e83cf
ROOT CAUSE: The GST tax was calculated with floating‑point multiplication (`line.lineTotal * GST_RATE`) and rounded via `roundMoney`, which can lose a fraction of a paisa (e.g., 188.864999…) and round down, giving a ₹0.01 shortfall. The tax should be computed in integer paise (using `calculateGst`) to guarantee correct half‑up rounding.

=== FILE src/cart/totals.ts ===
```ts
import { fromPaise, roundMoney, toPaise } from "../currency/money";
import { GST_RATE, calculateGst } from "../tax/gst";
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

  // Compute GST on the pre‑tax subtotal using integer paise to avoid floating‑point errors.
  const tax = calculateGst(subtotal, GST_RATE * 100);

  // Coupons come off the pre‑tax subtotal; GST is charged on the list price.
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
=== END FILE ===

=== TEST ===
```ts
import { describe, it, expect } from "vitest";
import { createCart, addItem, computeTotals } from "../../src";

describe("Cart GST rounding regression", () => {
  it("computes correct GST for a product with fractional rupee price", () => {
    // Cast Iron Tawa – price ₹1,049.25
    const cart = addItem(createCart(), "p03");
    const totals = computeTotals(cart);

    expect(totals.subtotal).toBe(1049.25);
    expect(totals.tax).toBe(188.87); // 18% of 1049.25 rounded half‑up
    expect(totals.shipping).toBe(0);
    expect(totals.total).toBe(1238.12); // subtotal + tax
  });
});
```
=== END TEST ===