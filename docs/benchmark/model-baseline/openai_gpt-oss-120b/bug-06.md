CULPRIT: c3fb68f
ROOT CAUSE: The refactor that added support for numeric‑string quantities removed the validation that quantities must be positive, allowing zero or negative quantities to be stored in the cart and later produce negative order totals.

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
  if (qty <= 0) throw new InvalidQuantityError(quantity);
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
  if (qty < 0) throw new InvalidQuantityError(quantity);
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
  if (!Number.isFinite(value)) throw new InvalidQuantityError(input);
  return Math.trunc(value);
}
```
=== END FILE ===

=== TEST ===
```ts
import { describe, expect, test } from "vitest";
import {
  createCart,
  addItem,
  setQuantity,
  InvalidQuantityError,
} from "../../src/cart/cart";

describe("cart quantity validation", () => {
  test("setQuantity rejects negative values", () => {
    const cart = addItem(createCart("c1"), "p11", 1);
    expect(() => setQuantity(cart, "p11", -3)).toThrow(InvalidQuantityError);
  });

  test("addItem rejects non‑positive quantities", () => {
    const cart = createCart("c2");
    expect(() => addItem(cart, "p11", 0)).toThrow(InvalidQuantityError);
    expect(() => addItem(cart, "p11", -2)).toThrow(InvalidQuantityError);
  });
});
```
=== END TEST ===