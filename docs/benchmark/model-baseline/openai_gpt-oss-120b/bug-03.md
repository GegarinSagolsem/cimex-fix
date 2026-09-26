CULPRIT: b4369d9  
ROOT CAUSE: The delivery estimate logic checks the cutoff hour against the UTC hour of the order timestamp (`orderedAt.getUTCHours()`), but the cutoff is defined in IST. This causes orders placed after 20:00 IST to be treated as before the cutoff, resulting in a one‑day‑early estimate.

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
 * Dispatch happens on the IST order date, or the next day after the 8 PM cutoff.
 */
export function estimateDelivery(orderedAt: Date, transitDays: number = DEFAULT_TRANSIT_DAYS): string {
  // Shift the timestamp to IST so that UTC getters give us IST components.
  const ist = new Date(orderedAt.getTime() + IST_OFFSET_MS);
  // Start of the dispatch day in UTC (midnight IST).
  let dispatch = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());

  // Use the IST hour (derived from the shifted date) for the cutoff comparison.
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
import { describe, it, expect } from "vitest";
import { estimateDelivery } from "../../src/delivery/estimate";

describe("delivery estimate cutoff regression", () => {
  it("dispatches next day for orders at or after 20:00 IST", () => {
    // 2026-03-10 21:00 IST = 2026-03-10T15:30:00Z
    const orderedAt = new Date("2026-03-10T15:30:00Z");
    expect(estimateDelivery(orderedAt)).toBe("2026-03-14"); // 3 transit days, skipping Sunday
  });

  it("dispatches same day for orders before 20:00 IST", () => {
    // 2026-03-10 19:55 IST = 2026-03-10T14:25:00Z
    const orderedAt = new Date("2026-03-10T14:25:00Z");
    expect(estimateDelivery(orderedAt)).toBe("2026-03-13");
  });
});
```
=== END TEST ===