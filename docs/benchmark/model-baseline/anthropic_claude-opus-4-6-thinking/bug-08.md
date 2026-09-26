CULPRIT: 185f248
ROOT CAUSE: `applyCoupon` does not check whether the coupon code is already present in the cart, so the same code (DIWALI60) can be added repeatedly, stacking its 60% discount to exceed 100% and produce a negative total.
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
=== TEST ===
import { describe, it, expect } from "vitest";
import { createCart, addItem } from "../../src/cart/cart";
import { applyCoupon } from "../../src/cart/coupons";
import { computeTotals } from "../../src/cart/totals";

describe("duplicate coupon bug (bug-08)", () => {
  it("should not allow the same coupon code to be applied twice", () => {
    let cart = createCart("dup-coupon-test");
    cart = addItem(cart, "p13", 1); // Bluetooth Speaker ₹2,499

    cart = applyCoupon(cart, "DIWALI60");
    cart = applyCoupon(cart, "DIWALI60"); // duplicate – should be ignored

    expect(cart.couponCodes).toEqual(["DIWALI60"]);

    const totals = computeTotals(cart);
    expect(totals.discount).toBeCloseTo(1499.4, 2); // 60% of 2499
    expect(totals.total).toBeGreaterThan(0);
  });

  it("should still allow stacking different coupon codes", () => {
    let cart = createCart("stack-test");
    cart = addItem(cart, "p13", 1); // Bluetooth Speaker ₹2,499

    cart = applyCoupon(cart, "DIWALI60");
    cart = applyCoupon(cart, "SAVE10");

    expect(cart.couponCodes).toEqual(["DIWALI60", "SAVE10"]);
  });
});
=== END TEST ===
