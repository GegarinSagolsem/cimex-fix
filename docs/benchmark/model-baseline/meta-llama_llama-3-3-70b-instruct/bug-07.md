CULPRIT: 985e247
ROOT CAUSE: The bug is caused by the fact that the `placeOrder` function in `src/orders/service.ts` does not check if an order is already being processed for a given cart before creating a new order. This allows multiple orders to be created for the same cart if the function is called multiple times in quick succession. 
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
  private inProgress: Set<string> = new Set();

  constructor(options: OrderServiceOptions = {}) {
    this.payments = options.payments ?? new FakePaymentGateway();
    this.clock = options.clock ?? (() => new Date());
  }

  /** Places an order for the cart. A cart can only be ordered once. */
  async placeOrder(cart: Cart): Promise<Order> {
    if (cart.items.length === 0) throw new EmptyCartError();
    if (this.inProgress.has(cart.id)) throw new DuplicateOrderError(cart.id);
    if (this.hasOrderFor(cart.id)) throw new DuplicateOrderError(cart.id);
    this.inProgress.add(cart.id);
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
      this.inProgress.delete(cart.id);
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
import { describe, expect, it } from "vitest";
import { createCart, addItem } from "../../src/cart/cart";
import { OrderService, EmptyCartError, DuplicateOrderError } from "../../src/orders/service";
import { getProductById } from "../../src/catalog/products";

describe("OrderService", () => {
  it("should throw DuplicateOrderError when placing order for the same cart twice in quick succession", async () => {
    const orderService = new OrderService();
    const cart = createCart();
    const product = getProductById("p13");
    if (!product) throw new Error("Product not found");
    addItem(cart, product.id);
    await orderService.placeOrder(cart);
    await expect(orderService.placeOrder(cart)).rejects.toThrowError(DuplicateOrderError);
  });
});
```
=== END TEST ===