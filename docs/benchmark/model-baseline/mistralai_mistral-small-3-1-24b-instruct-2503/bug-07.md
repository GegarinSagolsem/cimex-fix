CULPRIT: 1ed4c55
ROOT CAUSE: The `placeOrder` method does not handle concurrent requests for the same cart, allowing multiple orders to be placed for the same cart.

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
  private pendingOrders: Set<string> = new Set();

  constructor(options: OrderServiceOptions = {}) {
    this.payments = options.payments ?? new FakePaymentGateway();
    this.clock = options.clock ?? (() => new Date());
  }

  /** Places an order for the cart. A cart can only be ordered once. */
  async placeOrder(cart: Cart): Promise<Order> {
    if (cart.items.length === 0) throw new EmptyCartError();
    if (this.hasOrderFor(cart.id)) throw new DuplicateOrderError(cart.id);
    if (this.pendingOrders.has(cart.id)) {
      throw new DuplicateOrderError(cart.id);
    }
    this.pendingOrders.add(cart.id);
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
      this.pendingOrders.delete(cart.id);
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
```
=== END FILE ===
=== TEST ===
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { OrderService, EmptyCartError, DuplicateOrderError } from "../../src/orders/service";
import { createCart, addItem } from "../../src/cart/cart";
import { FakePaymentGateway } from "../../src/orders/payments";

describe("OrderService", () => {
  let orderService: OrderService;
  let paymentGateway: FakePaymentGateway;

  beforeEach(() => {
    paymentGateway = new FakePaymentGateway(100); // Simulate payment delay
    orderService = new OrderService({ payments: paymentGateway });
  });

  it("should not allow placing multiple orders for the same cart concurrently", async () => {
    const cart = createCart();
    addItem(cart, "p13", 1); // Add Bluetooth Speaker

    const placeOrder1 = orderService.placeOrder(cart);
    const placeOrder2 = orderService.placeOrder(cart);

    await expect(placeOrder1).resolves.toBeDefined();
    await expect(placeOrder2).rejects.toThrow(DuplicateOrderError);

    const orders = orderService.listOrders();
    expect(orders).toHaveLength(1);
  });
});
```
=== END TEST ===