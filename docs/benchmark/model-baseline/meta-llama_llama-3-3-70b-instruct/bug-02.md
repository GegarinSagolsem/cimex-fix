CULPRIT: 98e2fce
ROOT CAUSE: The bug is caused by the rounding of line totals in the `lineItems` function, which leads to a loss of precision when calculating the subtotal and tax. This results in a discrepancy of ₹0.01 in the total amount.
=== FILE src/cart/lineItems.ts ===
import { roundMoney } from "../currency/money";
import type { Cart, CartItem } from "./cart";

export interface LineItem extends CartItem {
  /** unitPrice × quantity, in rupees. */
  lineTotal: number;
}

export function lineItems(cart: Cart): LineItem[] {
  return cart.items.map((item) => ({ 
    ...item, 
    lineTotal: item.unitPrice * item.quantity // removed roundMoney here
  }));
}

export function sumBy<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((sum, item) => sum + pick(item), 0);
}
=== END FILE ===
=== FILE src/cart/totals.ts ===
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
  const subtotal = sumBy(lines, (line) => line.lineTotal);
  const tax = sumBy(lines, (line) => line.lineTotal * GST_RATE);

  // Coupons come off the pre-tax subtotal; GST is charged on the list price.
  // Cap combined discount at subtotal so total can never go negative.
  const discount = Math.min(
    cart.couponCodes.reduce((sum, code) => sum + couponDiscount(subtotal, code), 0),
    subtotal,
  );

  const shipping = shippingFor(subtotal, cart.items.length);
  const total = fromPaise(toPaise(subtotal) - toPaise(discount) + toPaise(tax) + toPaise(shipping));
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return { itemCount, subtotal: roundMoney(subtotal), discount: roundMoney(discount), tax: roundMoney(tax), shipping: roundMoney(shipping), total: roundMoney(total) };
}
=== END FILE ===
=== TEST ===
import { describe, expect, it } from "vitest";
import { createCart, addItem } from "../../src/cart/cart";
import { computeTotals } from "../../src/cart/totals";
import { getProductById } from "../../src/catalog/products";

describe("cart totals", () => {
  it("should calculate totals correctly", () => {
    const cart = createCart();
    const product = getProductById("p03");
    if (!product) throw new Error("Product not found");
    const updatedCart = addItem(cart, product.id, 1);
    const totals = computeTotals(updatedCart);
    expect(totals.subtotal).toBe(1049.25);
    expect(totals.tax).toBe(188.865);
    expect(totals.total).toBe(1238.115);
  });
});
=== END TEST ===