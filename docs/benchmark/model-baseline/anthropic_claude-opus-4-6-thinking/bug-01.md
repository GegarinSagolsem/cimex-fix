CULPRIT: 185f248
ROOT CAUSE: `applyCoupon` guards with `if (code && !isKnownCoupon(code))`, so when the user submits an empty coupon input, `normalizeCouponCode` returns `""`, the falsy check skips validation, and the empty string is added to `couponCodes`. `couponDiscount` then looks up `COUPON_RULES[""]` (→ `undefined`), passes it to `parseFloat` (→ `NaN`), and NaN propagates through discount and total.
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
  if (!code || !isKnownCoupon(code)) throw new InvalidCouponError(input.trim());
  return { ...cart, couponCodes: [...cart.couponCodes, code] };
}

export function removeCoupon(cart: Cart): Cart {
  return { ...cart, couponCodes: [] };
}
=== END FILE ===
=== TEST ===
import { describe, it, expect } from "vitest";
import { createCart, addItem } from "../../src/cart/cart";
import { applyCoupon, InvalidCouponError } from "../../src/cart/coupons";
import { computeTotals } from "../../src/cart/totals";

describe("empty coupon code bug", () => {
  it("applyCoupon rejects an empty string input", () => {
    const cart = addItem(createCart(), "p01");
    expect(() => applyCoupon(cart, "")).toThrow(InvalidCouponError);
  });

  it("applyCoupon rejects a whitespace-only input", () => {
    const cart = addItem(createCart(), "p01");
    expect(() => applyCoupon(cart, "   ")).toThrow(InvalidCouponError);
  });

  it("totals are not NaN when a valid coupon is applied", () => {
    let cart = createCart();
    cart = addItem(cart, "p01"); // Ceramic Coffee Mug ₹349
    cart = addItem(cart, "p02"); // Steel Water Bottle ₹599
    cart = applyCoupon(cart, "SAVE10");
    const totals = computeTotals(cart);
    expect(totals.discount).not.toBeNaN();
    expect(totals.total).not.toBeNaN();
    expect(totals.discount).toBeCloseTo(94.8, 2);
  });
});
=== END TEST ===
