CULPRIT: 185f248
ROOT CAUSE: The bug was introduced when allowing stacking multiple coupon codes, which did not account for the possibility of applying the same coupon code multiple times.

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
  if (!code) return cart;
  if (!isKnownCoupon(code)) throw new InvalidCouponError(input.trim());
  const uniqueCouponCodes = [...new Set([...cart.couponCodes, code])];
  return { ...cart, couponCodes: uniqueCouponCodes };
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
import { applyCoupon, removeCoupon } from "../../src/cart/coupons";
import { computeTotals } from "../../src/cart/totals";

describe("BugProof Bob: coupon stacking", () => {
  it("should not allow applying the same coupon code multiple times", () => {
    const cart = createCart();
    addItem(cart, "p13", 1); // Bluetooth Speaker
    cart = applyCoupon(cart, "DIWALI60");
    cart = applyCoupon(cart, "DIWALI60");
    const totals = computeTotals(cart);
    expect(totals.discount).toBe(2499 * 0.6);
  });
});
```
=== END TEST ===