CULPRIT: 185f248
ROOT CAUSE: The `applyCoupon` function allowed the same coupon code to be added multiple times, so duplicate coupons stacked and could produce discounts exceeding 100% of the subtotal.

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
  // Prevent the same coupon from being applied more than once.
  if (cart.couponCodes.includes(code)) return cart;
  return { ...cart, couponCodes: [...cart.couponCodes, code] };
}

export function removeCoupon(cart: Cart): Cart {
  return { ...cart, couponCodes: [] };
}
=== END FILE ===
=== TEST ===
import { describe, expect, test } from "vitest";
import { createCart, addItem, applyCoupon, computeTotals } from "../../src";

describe("Coupon duplicate handling", () => {
  test("applying the same coupon twice does not double the discount", () => {
    // Arrange: cart with a single Bluetooth Speaker (₹2,499)
    let cart = createCart();
    cart = addItem(cart, "p13", 1);

    // Act: apply DIWALI60 twice
    cart = applyCoupon(cart, "DIWALI60");
    cart = applyCoupon(cart, "DIWALI60"); // should be ignored

    const totals = computeTotals(cart);

    // Assert: only one coupon code stored
    expect(cart.couponCodes).toHaveLength(1);
    expect(cart.couponCodes[0]).toBe("DIWALI60");

    // Subtotal should be 2,499.00
    expect(totals.subtotal).toBeCloseTo(2499.0, 2);

    // Discount should be 60% of subtotal, i.e., ₹1,499.40
    expect(totals.discount).toBeCloseTo(1499.4, 2);

    // Total should be subtotal - discount + tax (18% GST) = 2,499 - 1,499.4 + 449.82 = 1,449.42
    expect(totals.total).toBeCloseTo(1449.42, 2);
  });
});
=== END TEST ===