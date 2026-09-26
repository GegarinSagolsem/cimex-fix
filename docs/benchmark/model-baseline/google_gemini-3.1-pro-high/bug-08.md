CULPRIT: 185f248
ROOT CAUSE: The commit `185f248` allowed stacking multiple coupons but failed to prevent applying the exact same coupon multiple times, and it failed to cap the total accumulated discount at the cart's subtotal, causing negative totals.
=== FILE src/cart/coupons.ts ===
import { fromPaise, toPaise } from "../currency/money";
import type { Cart } from "./cart";

/**
 * Active campaign coupons, in the format marketing uses in the promo sheet:
 * "10%" is a percentage off the subtotal, "200" is a flat amount in rupees.
 */
export const COUPON_RULES: Readonly<Record<string, string>> = {
  SAVE10: "10%",
  WELCOME15: "15%",
  FLAT200: "200",
  DIWALI60: "60%",
};

export class InvalidCouponError extends Error {
  constructor(readonly code: string) {
    super(`Coupon "${code}" is not valid`);
    this.name = "InvalidCouponError";
  }
}

export function normalizeCouponCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isKnownCoupon(code: string): boolean {
  return Object.hasOwn(COUPON_RULES, code);
}

export interface CouponRule {
  kind: "percent" | "flat";
  value: number;
}

const PERCENT_SUFFIX = /%$/;

/** Parses a promo-sheet rule such as "10%" or "200". */
export function parseCouponRule(rule: string): CouponRule {
  const value = parseFloat(rule);
  return PERCENT_SUFFIX.test(rule) ? { kind: "percent", value } : { kind: "flat", value };
}

/** Discount in rupees for a coupon code against a pre-tax subtotal. */
export function couponDiscount(subtotal: number, code?: string): number {
  if (code === undefined) return 0;
  const rule = parseCouponRule(COUPON_RULES[code]);
  if (rule.kind === "percent") return fromPaise(Math.round((toPaise(subtotal) * rule.value) / 100));
  return Math.min(rule.value, subtotal);
}

/** Adds a coupon to the cart. Coupons stack: each one is computed against the subtotal. */
export function applyCoupon(cart: Cart, input: string): Cart {
  const code = normalizeCouponCode(input);
  if (!code) return cart;
  if (!isKnownCoupon(code)) throw new InvalidCouponError(input.trim());
  if (cart.couponCodes.includes(code)) return cart;
  return { ...cart, couponCodes: [...cart.couponCodes, code] };
}

export function removeCoupon(cart: Cart): Cart {
  return { ...cart, couponCodes: [] };
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
  const subtotal = roundMoney(sumBy(lines, (line) => line.lineTotal));
  const tax = roundMoney(sumBy(lines, (line) => line.lineTotal * GST_RATE));

  // Coupons come off the pre-tax subtotal; GST is charged on the list price.
  const discount = Math.min(
    subtotal,
    cart.couponCodes.reduce((sum, code) => sum + couponDiscount(subtotal, code), 0)
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
import { applyCoupon } from "../../src/cart/coupons";
import { computeTotals } from "../../src/cart/totals";

describe("Coupon stacking bug", () => {
  it("ignores duplicate coupons and caps total discount at subtotal", () => {
    let cart = createCart("test-cart-1");
    cart = addItem(cart, "p13", 1); // 2499

    cart = applyCoupon(cart, "DIWALI60");
    cart = applyCoupon(cart, "DIWALI60");

    expect(cart.couponCodes).toEqual(["DIWALI60"]);

    const totals = computeTotals(cart);
    expect(totals.discount).toBe(1499.4);
    expect(totals.total).toBeGreaterThan(0);

    let smallCart = createCart("test-cart-2");
    smallCart = addItem(smallCart, "p16", 1); // 199
    smallCart = applyCoupon(smallCart, "DIWALI60");
    smallCart = applyCoupon(smallCart, "FLAT200");

    const smallTotals = computeTotals(smallCart);
    expect(smallTotals.discount).toBe(smallTotals.subtotal);
    expect(smallTotals.total).toBeGreaterThanOrEqual(0);
  });
});
=== END TEST ===
