CULPRIT: b4369d9
ROOT CAUSE: The bug was introduced when the `estimateDelivery` function was refactored to compute the IST date without using `Intl.DateTimeFormat`, which caused the function to incorrectly determine the dispatch date for orders placed after the cutoff time. The issue arises from the fact that the `orderedAt` date is not being converted to the IST timezone correctly before being used to determine the dispatch date.

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
  const hours = ist.getUTCHours();
  let dispatch = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  if (hours >= DISPATCH_CUTOFF_HOUR) dispatch += DAY_MS;
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
```typescript
import { describe, expect, it } from "vitest";
import { estimateDelivery } from "../../src/delivery/estimate";

describe("estimateDelivery", () => {
  it("should estimate delivery date correctly for orders placed before cutoff time", () => {
    const orderedAt = new Date("2026-03-10T10:00:00.000Z");
    const estimatedDelivery = estimateDelivery(orderedAt);
    expect(estimatedDelivery).toBe("2026-03-13");
  });

  it("should estimate delivery date correctly for orders placed after cutoff time", () => {
    const orderedAt = new Date("2026-03-10T21:00:00.000Z");
    const estimatedDelivery = estimateDelivery(orderedAt);
    expect(estimatedDelivery).toBe("2026-03-14");
  });
});
```
=== END TEST ===