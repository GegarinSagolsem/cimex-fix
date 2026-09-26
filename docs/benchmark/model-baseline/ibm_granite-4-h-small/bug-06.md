CULPRIT: 1ed4c55
ROOT CAUSE: The `placeOrder` method in `src/orders/service.ts` does not check whether the cart is empty before computing totals and charging the payment gateway, allowing an order to be placed for a cart with no items, which leads to a settlement mismatch later.

=== FILE src/orders/service.ts ===
```ts
import type { Cart, CartItem } from "../cart/cart";
import { computeTotals, type CartTotals } from "../cart/totals";
import { estimateDelivery } from "../delivery/estimate";
import { FakePaymentGateway, type PaymentGateway } from "./payments";

export interface Order {
  id: string;
  cartId: string;
  items: CartItem[];
  totals: CartTotals;
  paymentId: string;
  /** ISO timestamp. */
  placedAt: string;
  /** YYYY-MM-DD in IST. */
  estimatedDelivery: string;
}

export class EmptyCartError extends Error {
  constructor() {
    super("Cannot place an order for an empty cart");
    this.name = "EmptyCartError";
  }
}

export class DuplicateOrderError extends Error {
  constructor(readonly cartId: string) {
    super(`Cart ${cartId} has already been ordered`);
    this.name = "DuplicateOrderError";
  }
}

export interface OrderServiceOptions {
  payments?: PaymentGateway;
  clock?: () => Date;
}

export class OrderService {
  private readonly orders: Order[] = [];
  private readonly payments: PaymentGateway;
  private readonly clock: () => Date;
  private seq = 0;

  constructor(options: OrderServiceOptions = {}) {
    this.payments = options.payments ?? new FakePaymentGateway();
    this.clock = options.clock ?? (() => new Date());
  }

  /** Places an order for the cart. A cart can only be ordered once. */
  async placeOrder(cart: Cart): Promise<Order> {
    if (cart.items.length === 0) throw new EmptyCartError(); // <-- added check
    if (this.hasOrderFor(cart.id)) throw new DuplicateOrderError(cart.id);
    const totals = computeTotals(cart);
    const placedAt = this.clock();
    const { paymentId } = await this.payments.charge(totals.total, cart.id);
    const order: Order = {
      id: `ORD-${String(++this.seq).padStart(4, "0")}`,
      cartId: cart.id,
      items: cart.items.map((item) => ({ ...item })),
      totals,
      paymentId,
      placedAt: placedAt.toISOString(),
      estimatedDelivery: estimateDelivery(placedAt),
    };
    this.orders.push(order);
    return order;
  }

  /** All orders, newest first. */
  listOrders(): Order[] {
    return [...this.orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt) || b.id.localeCompare(a.id));
  }

  getOrder(id: string): Order | undefined {
    return this.orders.find((order) => order.id === id);
  }

  private hasOrderFor(cartId: string): boolean {
    return this.orders.some((order) => order.cartId === cartId);
  }
}
```
=== END FILE ===

=== TEST ===
```ts
import { expect, test } from "vitest";
import { createCart, addItem, setQuantity, removeItem } from "../../src/cart/cart";
import { OrderService } from "../../src/orders/service";

test("placeOrder rejects empty cart", () => {
  const cart = createCart();
  const service = new OrderService();
  expect(() => service.placeOrder(cart)).toThrow(EmptyCartError);
});

test("placeOrder accepts non‑empty cart", () => {
  const cart = createCart();
  addItem(cart, "p01", 2);
  const service = new OrderService();
  expect(() => service.placeOrder(cart)).not.toThrow();
});
```
=== END TEST ===