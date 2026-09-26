CULPRIT: f376d02
ROOT CAUSE: The discount calculation is incorrect because it applies the coupon discount multiple times against the original subtotal instead of applying each subsequent coupon against the already discounted subtotal.

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
  let discountedSubtotal = subtotal;
  for (const code of cart.couponCodes) {
    const discount = couponDiscount(discountedSubtotal, code);
    discountedSubtotal = roundMoney(discountedSubtotal - discount);
  }
  const discount = roundMoney(subtotal - discountedSubtotal);

  const shipping = shippingFor(subtotal, cart.items.length);
  const total = fromPaise(toPaise(discountedSubtotal) + toPaise(tax) + toPaise(shipping));
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return { itemCount, subtotal, discount, tax, shipping, total };
}
```

=== END FILE ===

=== TEST ===
```ts
import { describe, expect, it } from "vitest";
import { createCart, addItem } from "../../src/cart/cart";
import { applyCoupon } from "../../src/cart/coupons";
import { computeTotals } from "../../src/cart/totals";
import { PRODUCTS } from "../../src/catalog/products";

describe("cart totals with multiple coupons", () => {
  it("computes totals correctly when multiple coupons are applied", () => {
    const cart = createCart();
    const product = PRODUCTS.find((p) => p.id === "p13")!; // Bluetooth Speaker
    const updatedCart = addItem(cart, product.id, 1);
    const cartWithCoupon1 = applyCoupon(updatedCart, "SAVE10");
    const cartWithCoupon2 = applyCoupon(cartWithCoupon1, "FLAT200");

    const totals = computeTotals(cartWithCoupon2);

    expect(totals.subtotal).toBe(product.price);
    expect(totals.discount).toBeCloseTo(449.1); // 10% off ₹2499 + ₹200 flat off ₹2249.1
    expect(totals.total).toBeCloseTo(-199.08); // ₹2049.9 (subtotal after discount) + ₹449.82 (GST) + 0 (shipping)
  });
});
```

=== END TEST ===
```