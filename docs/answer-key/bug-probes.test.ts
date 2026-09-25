// Probes for the eight seeded bugs listed in docs/bugs.md. Each probe asserts the *correct*
// behaviour, so on the seeded history every probe FAILS; reverting a bug's introducing commit
// makes its probe pass. Not part of `npm test`.
import { describe, expect, it } from "vitest";
import { addItem, createCart } from "../src/cart/cart";
import { applyCoupon } from "../src/cart/coupons";
import { computeTotals } from "../src/cart/totals";
import { paginate } from "../src/catalog/paginate";
import { PRODUCTS } from "../src/catalog/products";
import { searchProducts } from "../src/catalog/search";
import { estimateDelivery } from "../src/delivery/estimate";
import { FakePaymentGateway } from "../src/orders/payments";
import { OrderService } from "../src/orders/service";
import { calculateGst } from "../src/tax/gst";

describe("seeded bug probes", () => {
  it("#1 an empty coupon field leaves the total unchanged", () => {
    const cart = addItem(createCart("probe-1"), "p01");
    expect(computeTotals(applyCoupon(cart, "")).total).toBe(computeTotals(cart).total);
  });

  it("#2 GST on the cart is 18% of the subtotal, rounded half-up", () => {
    const totals = computeTotals(addItem(createCart("probe-2"), "p03"));
    expect(totals.tax).toBe(calculateGst(totals.subtotal));
    expect(totals.total).toBe(1238.12);
  });

  it("#3 orders after 8 PM IST are dispatched the next day", () => {
    expect(estimateDelivery(new Date("2026-03-10T21:00:00+05:30"))).toBe("2026-03-14");
  });

  it("#4 the last catalog page includes the last product", () => {
    const last = paginate(PRODUCTS, 5, 6);
    expect(last.totalPages).toBe(5);
    expect(last.items.map((product) => product.id)).toEqual(["p25"]);
  });

  it("#5 search ignores case", () => {
    expect(searchProducts(PRODUCTS, "mug").map((product) => product.id)).toEqual(["p01"]);
  });

  it("#6 negative quantities are rejected", () => {
    expect(() => addItem(createCart("probe-6"), "p14", -3)).toThrow();
  });

  it("#7 a double-click on Place order creates one order", async () => {
    const service = new OrderService({ payments: new FakePaymentGateway(5) });
    const cart = addItem(createCart("probe-7"), "p13");
    await Promise.allSettled([service.placeOrder(cart), service.placeOrder(cart)]);
    expect(service.listOrders()).toHaveLength(1);
  });

  it("#8 applying the same coupon twice does not double the discount", () => {
    const cart = addItem(createCart("probe-8"), "p13");
    const once = computeTotals(applyCoupon(cart, "DIWALI60"));
    const twice = computeTotals(applyCoupon(applyCoupon(cart, "DIWALI60"), "DIWALI60"));
    expect(twice.discount).toBe(once.discount);
    expect(twice.total).toBeGreaterThan(0);
  });
});
