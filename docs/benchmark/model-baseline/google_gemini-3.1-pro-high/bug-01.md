CULPRIT: 185f248
ROOT CAUSE: The `applyCoupon` function retained a `code &&` check from an earlier version where an empty string was used to clear the coupon. When multiple coupons were introduced, this caused empty string inputs to bypass validation and get appended to the `couponCodes` array, leading to `NaN` in discount calculations because there is no rule for an empty string.
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
  if (!isKnownCoupon(code)) throw new InvalidCouponError(input.trim());
  return { ...cart, couponCodes: [...cart.couponCodes, code] };
}

export function removeCoupon(cart: Cart): Cart {
  return { ...cart, couponCodes: [] };
}
=== END FILE ===
=== TEST ===
import { describe, it, expect } from "vitest";
import { createCart } from "../../src/cart/cart";
import { applyCoupon, InvalidCouponError } from "../../src/cart/coupons";

describe("Coupon Validation", () => {
  it("rejects empty coupon codes to prevent NaN totals", () => {
    const cart = createCart();
    
    // In the buggy code, this succeeds and corrupts the cart with an empty coupon code.
    // In the fixed code, it correctly throws an InvalidCouponError.
    expect(() => applyCoupon(cart, "   ")).toThrow(InvalidCouponError);
    expect(() => applyCoupon(cart, "")).toThrow(InvalidCouponError);
  });
});
=== END TEST ===
