CULPRIT: c3fb68f
ROOT CAUSE: The `parseQuantity` function parses numeric strings but fails to check if the resulting value is negative, allowing API consumers to bypass quantity constraints and create orders with negative totals.
=== FILE src/cart/cart.ts ===
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
  return Math.trunc(value);
}
=== END FILE ===
=== TEST ===
import { describe, it, expect } from "vitest";
import { createCart, setQuantity, InvalidQuantityError } from "../../src/cart/cart";

describe("bug-06 repro", () => {
  it("rejects negative quantities when setting cart item quantity", () => {
    const cart = createCart();
    
    // Seed the cart with an item
    cart.items.push({
      productId: "p14",
      name: "Power Bank 10000mAh",
      unitPrice: 1299,
      quantity: 1,
    });
    
    // Setting to a negative string quantity should throw
    expect(() => setQuantity(cart, "p14", "-3")).toThrow(InvalidQuantityError);
    
    // Setting to a negative number quantity should also throw
    expect(() => setQuantity(cart, "p14", -1)).toThrow(InvalidQuantityError);
  });
});
=== END TEST ===
