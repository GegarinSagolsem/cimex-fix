CULPRIT: 6f7ca14
ROOT CAUSE: The `estimateDelivery` function adds transit days to the UTC date after converting the order time to IST, but it does not account for the fact that the dispatch cutoff is based on the IST date. This causes orders placed after 20:00 IST to be dispatched on the same UTC day, resulting in a delivery estimate that is one day too early.

=== FILE src/delivery/estimate.ts ===
```ts
export const DELIVERY_TIME_ZONE = "Asia/Kolkata";
/** Orders placed at or after 20:00 IST are dispatched the next day. */
export const DISPATCH_CUTOFF_HOUR = 20;
export const DEFAULT_TRANSIT_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;
const SUNDAY = 0;

// India has no daylight saving, so IST is always UTC+05:30. Shifting the timestamp is much
// cheaper than building an Intl.DateTimeFormat on every cart render.
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** Couriers do not deliver on Sundays, so Sundays are not counted as transit days. */
function addDeliveryDays(start: number, days: number): number {
  let day = start;
  for (let added = 0; added < days; ) {
    day += DAY_MS;
    if (new Date(day).getUTCDay() !== SUNDAY) added++;
  }
  return day;
}

function toIsoDate(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/**
 * Estimated delivery date (YYYY-MM-DD, IST calendar) for an order placed at `orderedAt`.
 * Dispatch happens on the IST order date, or the next day after the 8 PM cutoff.
 */
export function estimateDelivery(orderedAt: Date, transitDays: number = DEFAULT_TRANSIT_DAYS): string {
  const ist = new Date(orderedAt.getTime() + IST_OFFSET_MS);
  let dispatch = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  if (ist.getUTCHours() >= DISPATCH_CUTOFF_HOUR) dispatch += DAY_MS;
  return toIsoDate(addDeliveryDays(dispatch, transitDays));
}

const displayFormat = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "2026-03-16" → "Mon, 16 Mar". */
export function formatDeliveryDate(isoDate: string): string {
  return displayFormat.format(new Date(`${isoDate}T00:00:00Z`));
}
```
=== END FILE ===

=== TEST ===
```ts
import { describe, expect, test } from "vitest";
import { estimateDelivery } from "../../src/delivery/estimate";

describe("estimateDelivery", () => {
  test("orders placed before 20:00 IST are dispatched the same day", () => {
    const orderTime = new Date("2026-03-10T19:55:00+05:30");
    expect(estimateDelivery(orderTime)).toBe("2026-03-13");
  });

  test("orders placed at or after 20:00 IST are dispatched the next day", () => {
    const orderTime = new Date("2026-03-10T20:05:00+05:30");
    expect(estimateDelivery(orderTime)).toBe("2026-03-14");
  });

  test("orders placed on Sunday are dispatched on Monday", () => {
    const orderTime = new Date("2026-03-09T21:00:00+05:30"); // Sunday 21:00 IST
    expect(estimateDelivery(orderTime)).toBe("2026-03-11");
  });
});
```
=== END TEST ===