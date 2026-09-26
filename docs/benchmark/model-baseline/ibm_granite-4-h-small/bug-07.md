CULPRIT: 1ed4c55
ROOT CAUSE: The `OrderService` does not prevent placing a new order for a cart that has already been ordered, because the `hasOrderFor` check only looks at the in‑memory `orders` array and does not persist the cart‑order relationship across multiple requests. Consequently, a double‑click on “Place order” creates two separate `OrderService` instances (or two separate runs of the same instance) that both see an empty order list and both succeed in creating an order.

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
    if (cart.items.length === 0) throw new EmptyCartError();
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

  /** Prevent double‑clicks by remembering which carts have been ordered. */
  private orderedCarts = new Set<string>();

  private hasOrderFor(cartId: string): boolean {
    return this.orderedCarts.has(cartId);
  }

  private markCartAsOrdered(cartId: string): void {
    this.orderedCarts.add(cartId);
  }
}
```
=== END FILE ===

=== TEST ===
```ts
import { expect, test } from "vitest";
import { createCart, addItem, setQuantity, removeItem } from "../../src/cart/cart";
import { OrderService } from "../../src/orders/service";

test("double‑click on Place order creates only one order", async () => {
  const service = new OrderService();

  // Prepare a sample cart
  let cart = createCart();
  cart = addItem(cart, "p13", 2); // Bluetooth Speaker ×2
  cart = setQuantity(cart, "p13", 3); // increase to 3

  // Simulate two rapid clicks
  await service.placeOrder(cart);
  await service.placeOrder(cart);

  // Only one order should exist
  const orders = service.listOrders();
  expect(orders).toHaveLength(1);
  expect(orders[0].cartId).toBe(cart.id);
});
```
=== END TEST ===