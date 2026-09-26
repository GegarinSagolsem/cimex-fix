CULPRIT: 985e247
ROOT CAUSE: The duplicate-order check was refactored to look at completed orders (`this.orders`), missing orders that are currently in progress awaiting payment. This race condition allowed multiple concurrent `placeOrder` calls for the same cart to proceed before the first one completes.

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
  private readonly placing = new Set<string>();

  constructor(options: OrderServiceOptions = {}) {
    this.payments = options.payments ?? new FakePaymentGateway();
    this.clock = options.clock ?? (() => new Date());
  }

  /** Places an order for the cart. A cart can only be ordered once. */
  async placeOrder(cart: Cart): Promise<Order> {
    if (cart.items.length === 0) throw new EmptyCartError();
    if (this.hasOrderFor(cart.id) || this.placing.has(cart.id)) throw new DuplicateOrderError(cart.id);
    
    this.placing.add(cart.id);
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
      this.placing.delete(cart.id);
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

describe("OrderService concurrent orders", () => {
  it("rejects concurrent orders for the same cart", async () => {
    // Add latency so the first call is still running when the second is invoked
    const payments = new FakePaymentGateway(50);
    const service = new OrderService({ payments });
    
    let cart = createCart("cart-dup-test");
    cart = addItem(cart, "p01", 1);

    const promise1 = service.placeOrder(cart);
    const promise2 = service.placeOrder(cart);
    
    // The second call should immediately fail
    await expect(promise2).rejects.toThrowError(DuplicateOrderError);
    
    // The first call should still succeed
    const order1 = await promise1;
    expect(order1.cartId).toBe("cart-dup-test");
    
    // Only one order should have been created and charged
    expect(service.listOrders()).toHaveLength(1);
    expect(payments.charges).toHaveLength(1);
  });
});
=== END TEST ===
