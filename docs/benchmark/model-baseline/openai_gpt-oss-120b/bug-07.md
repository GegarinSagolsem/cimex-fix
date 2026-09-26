CULPRIT: 985e247  
ROOT CAUSE: The duplicate‑order check only looks at already‑saved orders, so two concurrent `placeOrder` calls both pass the check, charge the payment gateway twice and create two orders.  

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

  /** Tracks in‑flight order placements to make the operation idempotent. */
  private readonly pendingOrders = new Map<string, Promise<Order>>();

  constructor(options: OrderServiceOptions = {}) {
    this.payments = options.payments ?? new FakePaymentGateway();
    this.clock = options.clock ?? (() => new Date());
  }

  /** Places an order for the cart. A cart can only be ordered once. */
  async placeOrder(cart: Cart): Promise<Order> {
    if (cart.items.length === 0) throw new EmptyCartError();

    // If an order for this cart already exists, reject immediately.
    if (this.hasOrderFor(cart.id)) throw new DuplicateOrderError(cart.id);

    // If a placement is already in progress for this cart, return the same promise.
    const pending = this.pendingOrders.get(cart.id);
    if (pending) return pending;

    // Create the order placement promise and store it as pending.
    const orderPromise = (async () => {
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
    })();

    this.pendingOrders.set(cart.id, orderPromise);
    // Ensure the pending entry is cleared whether the promise resolves or rejects.
    orderPromise.finally(() => {
      this.pendingOrders.delete(cart.id);
    });

    return orderPromise;
  }

  /** All orders, newest first. */
  listOrders(): Order[] {
    return [...this.orders].sort(
      (a, b) => b.placedAt.localeCompare(a.placedAt) || b.id.localeCompare(a.id),
    );
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
import { describe, expect, test } from "vitest";
import { createCart, addItem } from "../../src/cart/cart";
import { OrderService } from "../../src/orders/service";
import { FakePaymentGateway } from "../../src/orders/payments";

describe("OrderService duplicate‑click handling", () => {
  test("concurrent placeOrder calls for the same cart result in a single order and single charge", async () => {
    // Build a cart with a single item.
    let cart = createCart();
    cart = addItem(cart, "p13", 1); // Bluetooth Speaker

    // Use a payment gateway with artificial latency to force overlap.
    const gateway = new FakePaymentGateway(50);
    const service = new OrderService({ payments: gateway });

    // Fire two placements almost simultaneously.
    const [orderA, orderB] = await Promise.all([
      service.placeOrder(cart),
      service.placeOrder(cart),
    ]);

    // Both promises should resolve to the same order (same id).
    expect(orderA.id).toBe(orderB.id);
    expect(orderA.cartId).toBe(cart.id);
    expect(orderB.cartId).toBe(cart.id);

    // Only one order should be stored.
    expect(service.listOrders()).toHaveLength(1);

    // Only one charge should have been sent to the payment gateway.
    expect(gateway.charges).toHaveLength(1);
    expect(gateway.charges[0].reference).toBe(cart.id);
  });
});
```
=== END TEST ===