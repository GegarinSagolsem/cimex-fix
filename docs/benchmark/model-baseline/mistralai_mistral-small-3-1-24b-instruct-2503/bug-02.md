CULPRIT: 8cc8c28
ROOT CAUSE: The `lineItems` function rounds the line total to the nearest paisa before summing, which causes the GST calculation to be off by one paisa for some products.
=== FILE src/cart/lineItems.ts ===
```ts
import { roundMoney } from "../currency/money";
import type { Cart, CartItem } from "./cart";

export interface LineItem extends CartItem {
  /** unitPrice × quantity, in rupees. */
  lineTotal: number;
}

export function lineItems(cart: Cart): LineItem[] {
  return cart.items.map((item) => ({ ...item, lineTotal: item.unitPrice * item.quantity }));
}

export function sumBy<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((sum, item) => sum + pick(item), 0);
}
```
=== END FILE ===
=== TEST ===
```ts
import { describe, it, expect } from "vitest";
import { createCart, addItem } from "../../src/cart/cart";
import { computeTotals } from "../../src/cart/totals";

describe("Cart totals", () => {
  it("should correctly calculate GST for ₹1,049.25", () => {
    const cart = createCart();
    addItem(cart, "p03", 1);
    const totals = computeTotals(cart);
    expect(totals.tax).toBe(188.87);
  });
});
```
=== END TEST ===