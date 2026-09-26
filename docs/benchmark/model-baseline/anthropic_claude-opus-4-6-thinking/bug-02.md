CULPRIT: 98e2fce
ROOT CAUSE: `computeTotals` calculates GST by multiplying each line total by the floating-point `GST_RATE` (0.18), which cannot be represented exactly in IEEE 754; for prices like ₹1,049.25 the product `1049.25 * 0.18` evaluates to ≈188.86499… instead of 188.865, so `roundMoney` rounds down instead of half-up. The existing `calculateGst` helper avoids this by working in integer paise, but `computeTotals` doesn't use it.
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
import { describe, expect, it } from "vitest";
import { addItem, createCart } from "../../src/cart/cart";
import { computeTotals } from "../../src/cart/totals";

describe("GST rounding regression (bug-02)", () => {
  it("should round GST half-up to the nearest paisa for fractional prices", () => {
    // Cast Iron Tawa: ₹1,049.25
    // 18% of ₹1,049.25 = ₹188.865 → rounds half-up to ₹188.87
    let cart = createCart("regression-gst");
    cart = addItem(cart, "p03");
    const totals = computeTotals(cart);

    expect(totals.subtotal).toBe(1049.25);
    expect(totals.tax).toBe(188.87);
    expect(totals.total).toBe(1238.12);
  });
});
=== END TEST ===
