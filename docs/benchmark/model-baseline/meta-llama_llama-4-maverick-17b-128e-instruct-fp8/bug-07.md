CULPRIT: 1ed4c55
ROOT CAUSE: The bug was introduced when the order placement functionality was added without proper synchronization, allowing multiple concurrent requests for the same cart to bypass the duplicate order check.

=== FILE src/orders/service.ts ===
```typescript
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
  private readonly activeCarts: Set<string> = new Set();

  constructor(options: OrderServiceOptions = {}) {
    this.payments = options.payments ?? new FakePaymentGateway();
    this.clock = options.clock ?? (() => new Date());
  }

  /** Places an order for the cart. A cart can only be ordered once. */
  async placeOrder(cart: Cart): Promise<Order> {
    if (cart.items.length === 0) throw new EmptyCartError();
    if (this.activeCarts.has(cart.id)) throw new DuplicateOrderError(cart.id);
    this.activeCarts.add(cart.id);
    try {
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
    } finally {
      this.activeCarts.delete(cart.id);
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
```typescript
import { describe, expect, test, vi } from "vitest";
import { OrderService, DuplicateOrderError } from "../../src/orders/service";
import { FakePaymentGateway } from "../../src/orders/payments";
import { createCart, addItem } from "../../src/cart/cart";

describe("concurrent order placement", () => {
  test("rejects duplicate requests for the same cart", async () => {
    const cart = addItem(createCart("test-cart"), "p01");
    const clock = vi.fn(() => new Date("2026-09-26T12:34:56.789Z"));
    const payments = new FakePaymentGateway(100);
    const service = new OrderService({ clock, payments });

    const [first, second] = await Promise.all([
      expect(service.placeOrder(cart)).resolves.toHaveProperty("cartId", cart.id),
      expect(service.placeOrder(cart)).rejects.toBeInstanceOf(DuplicateOrderError),
    ]);
  });
});
```
=== END TEST ===