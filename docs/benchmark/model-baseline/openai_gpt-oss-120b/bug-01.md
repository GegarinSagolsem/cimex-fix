CULPRIT: 185f248
ROOT CAUSE: `applyCoupon` added an empty string as a coupon code, which later caused `couponDiscount` to receive `undefined` and return `NaN`, breaking discount and total calculations.

=== FILE src/cart/coupons.ts ===
```ts
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
  // Ignore empty inputs – they should not create a coupon entry.
  if (!code) return cart;
  if (!isKnownCoupon(code)) throw new InvalidCouponError(input.trim());
  return { ...cart, couponCodes: [...cart.couponCodes, code] };
}

export function removeCoupon(cart: Cart): Cart {
  return { ...cart, couponCodes: [] };
}
```
=== END FILE ===

=== TEST ===
```ts
import { describe, it, expect } from "vitest";
import { createCart, addItem } from "../../src/cart/cart";
import { applyCoupon } from "../../src/cart/coupons";
import { computeTotals } from "../../src/cart/totals";

describe("applyCoupon with empty input should not affect totals", () => {
  it("ignores empty coupon codes", () => {
    let cart = createCart();
    cart = addItem(cart, "p01", 1); // ₹349
    cart = addItem(cart, "p02", 1); // ₹599
    const cartAfter = applyCoupon(cart, "   "); // empty/whitespace input

    // No coupon should be recorded
    expect(cartAfter.couponCodes).toHaveLength(0);

    const totals = computeTotals(cartAfter);
    expect(totals.subtotal).toBeCloseTo(948);
    expect(totals.discount).toBe(0);
    expect(totals.tax).toBeCloseTo(170.64);
    expect(totals.shipping).toBe(49);
    expect(totals.total).toBeCloseTo(948 + 170.64 + 49);
  });
});
```
=== END TEST ===