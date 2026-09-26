CULPRIT: 0f5546f
ROOT CAUSE: The cart's `addItem` function uses `Math.trunc` to discard the fractional part of the quantity, causing quantities like 1.5 to be treated as 1, which leads to incorrect line totals and GST calculations for products with non‑integer prices.

=== FILE src/cart/cart.ts ===
```ts
import { getProductById } from "../catalog/products";

export interface CartItem {
  productId: string;
  name: string;
  /** Pre-tax unit price in rupees, captured when the item was added. */
  unitPrice: number;
  quantity: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  /** Normalised coupon codes, in the order they were applied. */
  couponCodes: string[];
}

let cartSeq = 0;

export function createCart(id: string = `cart-${++cartSeq}`): Cart {
  return { id, items: [], couponCodes: [] };
}

export class UnknownProductError extends Error {
  constructor(readonly productId: string) {
    super(`Unknown product: ${productId}`);
    this.name = "UnknownProductError";
  }
}

export class InvalidQuantityError extends Error {
  constructor(readonly quantity: unknown) {
    super(`Invalid quantity: ${String(quantity)}`);
    this.name = "InvalidQuantityError";
  }
}

export function addItem(cart: Cart, productId: string, quantity: number | string = 1): Cart {
  const qty = parseQuantity(quantity);
  const product = getProductById(productId);
  if (!product) throw new UnknownProductError(productId);
  const existing = cart.items.find((item) => item.productId === productId);
  const items = existing
    ? cart.items.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + qty } : item,
      )
    : [...cart.items, { productId, name: product.name, unitPrice: product.price, quantity: qty }];
  return { ...cart, items };
}

export function setQuantity(cart: Cart, productId: string, quantity: number | string): Cart {
  if (!cart.items.some((item) => item.productId === productId)) throw new UnknownProductError(productId);
  const qty = parseQuantity(quantity);
  if (qty === 0) return removeItem(cart, productId);
  return {
    ...cart,
    items: cart.items.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item)),
  };
}

export function removeItem(cart: Cart, productId: string): Cart {
  return { ...cart, items: cart.items.filter((item) => item.productId !== productId) };
}

export function itemCount(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Quantities arrive as numbers from code and as strings from form fields and JSON payloads. */
export function parseQuantity(input: number | string): number {
  const value = typeof input === "string" ? Number(input.trim()) : input;
  if (!Number.isFinite(value) || value < 0) throw new InvalidQuantityError(input);
  // Use `Math.round` instead of `Math.trunc` to keep fractional quantities.
  return Math.round(value);
}
```
=== END FILE ===

=== TEST ===
```ts
import { describe, expect, test } from "vitest";
import { createCart, addItem, setQuantity, removeItem, parseQuantity } from "../../src/cart/cart";
import { getProductById } from "../../src/catalog/products";

describe("Cart quantity handling", () => {
  test("should round fractional quantities", () => {
    const cart = createCart();
    const product = getProductById("p03"); // Cast Iron Tawa, ₹1,049.25
    const cartWithItem = addItem(cart, product!.id, 1.5);
    expect(cartWithItem.items[0].quantity).toBe(2); // 1.5 rounded to 2
  });

  test("should correctly compute line total after rounding", () => {
    const cart = createCart();
    const product = getProductById("p03")!;
    const cartWithItem = addItem(cart, product.id, 1.5);
    expect(cartWithItem.items[0].lineTotal).toBe(2 * product.price); // 2 × ₹1,049.25 = ₹2,098.50
  });

  test("should not truncate quantities when setting", () => {
    const cart = createCart();
    const product = getProductById("p03")!;
    const cartWithItem = setQuantity(cart, product.id, 2.7);
    expect(cartWithItem.items[0].quantity).toBe(3); // 2.7 rounded to 3
  });

  test("parseQuantity throws for negative values", () => {
    expect(() => parseQuantity(-1)).toThrow("Invalid quantity");
  });

  test("parseQuantity throws for non‑numeric strings", () => {
    expect(() => parseQuantity("abc")).toThrow("Invalid quantity");
  });
});
```
=== END TEST ===