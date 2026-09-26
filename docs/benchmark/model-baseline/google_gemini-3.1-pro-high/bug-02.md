CULPRIT: 98e2fce
ROOT CAUSE: The cart computed total tax by multiplying floating-point numbers (`lineTotal * GST_RATE`) and summing them, which suffers from precision loss, instead of applying the integer-based `calculateGst` helper on the subtotal.
=== FILE src/cart/totals.ts ===
import { fromPaise, roundMoney, toPaise } from "../currency/money";
import { calculateGst } from "../tax/gst";
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
  const tax = calculateGst(subtotal);

  // Coupons come off the pre-tax subtotal; GST is charged on the list price.
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
=== END FILE ===
=== TEST ===
import { describe, it, expect } from "vitest";
import { createCart, addItem } from "../../src/cart/cart";
import { computeTotals } from "../../src/cart/totals";

describe("bug-02 checkout", () => {
  it("computes exact GST on subtotal avoiding float precision issues", () => {
    let cart = createCart();
    cart = addItem(cart, "p03", 1); // Cast Iron Tawa, 1049.25
    
    const totals = computeTotals(cart);
    
    expect(totals.subtotal).toBe(1049.25);
    expect(totals.tax).toBe(188.87);
    expect(totals.shipping).toBe(0);
    expect(totals.total).toBe(1238.12);
  });
});
=== END TEST ===
