CULPRIT: c3fb68f
ROOT CAUSE: The bug was introduced when the code started accepting numeric strings for quantities, but didn't enforce a minimum quantity of 1 for items added to the cart, allowing negative quantities to be set.

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
  if (qty < 1) throw new InvalidQuantityError(quantity);
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
import { describe, expect, it } from "vitest";
import { addItem, createCart, InvalidQuantityError, setQuantity } from "../../src/cart/cart";
import { PRODUCTS } from "../../src/catalog/products";

describe("cart quantity rules", () => {
  const cart = createCart();
  const productId = PRODUCTS[0].id;

  it("prevents adding a negative quantity", () => {
    expect(() => addItem(cart, productId, -1)).toThrow(InvalidQuantityError);
  });

  it("prevents setting a negative quantity", () => {
    const cartWithItem = addItem(cart, productId, 1);
    expect(() => setQuantity(cartWithItem, productId, -1)).toThrow(InvalidQuantityError);
  });

  it("removes an item when its quantity is set to zero", () => {
    const cartWithItem = addItem(cart, productId, 1);
    expect(setQuantity(cartWithItem, productId, 0).items).toHaveLength(0);
  });
});
```
=== END TEST ===