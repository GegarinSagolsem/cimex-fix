CULPRIT: 985e247
ROOT CAUSE: The `placeOrder` method checks `hasOrderFor(cart.id)` before the `await this.payments.charge(...)` call, so two concurrent calls both pass the duplicate check before either has pushed its order into the `this.orders` array. There is no in-flight tracking to make the second call wait or be rejected while the first is still processing.
=== FILE src/orders/service.ts ===
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
  private readonly inFlight = new Set<string>();

  constructor(options: OrderServiceOptions = {}) {
    this.payments = options.payments ?? new FakePaymentGateway();
    this.clock = options.clock ?? (() => new Date());
  }

  /** Places an order for the cart. A cart can only be ordered once. */
  async placeOrder(cart: Cart): Promise<Order> {
    if (cart.items.length === 0) throw new EmptyCartError();
    if (this.hasOrderFor(cart.id)) throw new DuplicateOrderError(cart.id);
    if (this.inFlight.has(cart.id)) throw new DuplicateOrderError(cart.id);
    this.inFlight.add(cart.id);
    try {
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
    } finally {
      this.inFlight.delete(cart.id);
    }
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
=== END FILE ===
=== TEST ===
import { describe, it, expect } from "vitest";
import { createCart, addItem } from "../../src/cart/cart";
import { OrderService, DuplicateOrderError } from "../../src/orders/service";
import { FakePaymentGateway } from "../../src/orders/payments";

describe("double-click duplicate order bug", () => {
  it("rejects a concurrent placeOrder for the same cart", async () => {
    const gateway = new FakePaymentGateway(50); // 50ms latency to simulate real payment
    const service = new OrderService({ payments: gateway });
    const cart = addItem(createCart("cart-double"), "p13"); // Bluetooth Speaker

    const first = service.placeOrder(cart);
    const second = service.placeOrder(cart);

    const results = await Promise.allSettled([first, second]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(DuplicateOrderError);

    // Only one charge should have been made
    expect(gateway.charges).toHaveLength(1);
  });

  it("still rejects a second order after the first has completed", async () => {
    const gateway = new FakePaymentGateway(0);
    const service = new OrderService({ payments: gateway });
    const cart = addItem(createCart("cart-seq"), "p13");

    await service.placeOrder(cart);
    await expect(service.placeOrder(cart)).rejects.toThrow(DuplicateOrderError);
    expect(gateway.charges).toHaveLength(1);
  });
});
=== END TEST ===
