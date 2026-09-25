# Seeded bug answer key

> **Private.** This is the answer key for the BugProof demo. Do not link it from the README or
> surface it in the UI.

The ShopLite history is produced by `scripts/build-history.sh`, which weaves eight ordinary-looking
commits into the history, each introducing one bug that the test suite at that point (and the final
suite) does not catch. The SHAs below were written by the same run that created the commits; if the
history is rebuilt, this file is regenerated with the new SHAs.

Probes: `npx vitest run --config docs/vitest.probes.config.ts` runs one probe per bug. Each asserts
the correct behaviour, so on HEAD **all 8 fail**; `git revert <sha>` of a bug's commit makes its
probe pass.

| # | Bug | Type | Arrives as | Introducing commit |
|---|-----|------|------------|--------------------|
| 1 | Empty coupon field → total shows `₹NaN` | type coercion | screenshot | `1bbcaa3` refactor(coupons): extract coupon rule parser |
| 2 | Totals off by ₹0.01 | float rounding | issue text | `70ca017` feat(cart): sum multiple line items in cart totals |
| 3 | Delivery date one day early after 8 PM IST | timezone | QA PDF | `eb3a92e` perf(delivery): compute IST date without Intl.DateTimeFormat |
| 4 | Pagination drops the last product | off-by-one | issue text | `1da00de` refactor(catalog): compute pagination bounds explicitly |
| 5 | Search became case-sensitive | regression | issue text | `7fa83cf` perf(catalog): memoize search index |
| 6 | Negative quantity accepted → negative total | validation | server log | `a41a711` refactor(cart): accept numeric strings for quantities |
| 7 | Double-click "Place order" → two orders | race condition | issue + log | `ff48122` refactor(orders): derive duplicate-order check from order history |
| 8 | Coupon applies twice → discount over 100% | logic | screenshot | `bba42be` feat(cart): allow stacking multiple coupon codes |

---

## 1. Empty coupon field → total shows `₹NaN` (hero)

- **Commit:** `1bbcaa3` — `refactor(coupons): extract coupon rule parser`
- **Files touched:** `src/cart/coupons.ts`, `tests/cart/couponRules.test.ts`
- **Intake:** `intake/bug-01-screenshot.png` (captured manually, see `intake/README.md`)
- **Root cause:** `applyCoupon` stores the normalised input even when it is empty (`""`). The old
  `couponDiscount` guarded with `if (!code)`, which treated `""` as "no coupon". The refactor
  changed the guard to `if (code === undefined)`, so `""` falls through to
  `parseCouponRule(COUPON_RULES[""])` → `parseCouponRule(undefined)`: `PERCENT_SUFFIX.test(undefined)`
  coerces to the string `"undefined"` (false) and `parseFloat(undefined)` is `NaN`, giving a flat
  discount of `NaN`. `Math.min(NaN, subtotal)` is `NaN`, the total becomes `NaN`, and
  `Intl.NumberFormat` renders `₹NaN`.
- **Repro (UI):** `npm run dev`; add *Ceramic Coffee Mug*; leave the coupon field empty; click
  **Apply**. Discount shows `−₹NaN`, Total shows `₹NaN`.
- **Repro (code):** `computeTotals(applyCoupon(addItem(createCart(), "p01"), "")).total` → `NaN`.
- **Fix:** restore the falsy guard (or make `applyCoupon` ignore empty input).

## 2. Totals off by ₹0.01

- **Commit:** `70ca017` — `feat(cart): sum multiple line items in cart totals`
- **Files touched:** `src/cart/totals.ts`, `tests/cart/totals.test.ts`
- **Intake:** `intake/bug-02-issue.md`
- **Root cause:** `computeTotals` switched from `calculateGst(subtotal)` (integer-paise, exact
  half-up rounding) to `roundMoney(sumBy(lines, l => l.lineTotal * GST_RATE))`. In binary floating
  point `1049.25 * 0.18` is `188.86499999999998`, which rounds down to `188.86` instead of `188.87`.
- **Repro (UI):** add *Cast Iron Tawa* (₹1,049.25). GST shows ₹188.86, total ₹1,238.11; expected
  ₹188.87 and ₹1,238.12.
- **Repro (code):** `computeTotals(addItem(createCart(), "p03"))` → `{ tax: 188.86, total: 1238.11 }`
  while `calculateGst(1049.25)` → `188.87`.
- **Fix:** compute GST with `calculateGst(subtotal)` (paise arithmetic).

## 3. Delivery date one day early after 8 PM IST

- **Commit:** `eb3a92e` — `perf(delivery): compute IST date without Intl.DateTimeFormat`
- **Files touched:** `src/delivery/estimate.ts`
- **Intake:** `intake/bug-03-qa-report.pdf` (source: `intake/bug-03-qa-report.md`)
- **Root cause:** the "perf" rewrite shifts the timestamp by +05:30 into `ist`, but checks the
  dispatch cutoff with `orderedAt.getUTCHours()` instead of `ist.getUTCHours()`. 20:00–23:59 IST is
  14:30–18:29 UTC, so the cutoff never triggers in that window and the estimate is one day early.
  (It also fires wrongly for 01:30–05:29 IST, pushing those estimates a day late.)
- **Repro (code):** `estimateDelivery(new Date("2026-03-10T21:00:00+05:30"))` → `"2026-03-13"`;
  expected `"2026-03-14"`.
- **Repro (UI):** set the system clock to any time after 20:00 IST, add an item, read "Estimated
  delivery" (or place an order and read "arrives …").
- **Fix:** use `ist.getUTCHours()` for the cutoff check.

## 4. Pagination drops the last product

- **Commit:** `1da00de` — `refactor(catalog): compute pagination bounds explicitly`
- **Files touched:** `src/catalog/paginate.ts`
- **Intake:** `intake/bug-04-issue.md`
- **Root cause:** the page count is now derived from the last index,
  `Math.ceil((items.length - 1) / pageSize)`, instead of `Math.ceil(items.length / pageSize)`.
  Whenever `items.length % pageSize === 1` the final page (holding just one item) is never counted,
  so it is unreachable and requests for it are clamped to the previous page. With 25 products and
  6 per page, *Wool Pashmina Shawl* (`p25`) can never be browsed to.
- **Repro (UI):** empty search, click **Next ›** until disabled → "Page 4 of 4 · Showing 19–24 of
  25"; there is no page 5.
- **Repro (code):** `paginate(PRODUCTS, 5, 6)` → `{ page: 4, totalPages: 4 }` (expected page 5 of 5
  with `["p25"]`).
- **Fix:** `Math.max(1, Math.ceil(items.length / pageSize))`.

## 5. Search became case-sensitive

- **Commit:** `7fa83cf` — `perf(catalog): memoize search index`
- **Files touched:** `src/catalog/search.ts`
- **Intake:** `intake/bug-05-issue.md`
- **Root cause:** the memoised index stores `${name} ${category}` without lower-casing, and the
  query is no longer lower-cased either, so matching became case-sensitive.
- **Repro (UI):** type `mug` → "No products match"; `Mug` works.
- **Repro (code):** `searchProducts(PRODUCTS, "mug")` → `[]`.
- **Fix:** lower-case the haystack when building the index and the needle when querying.

## 6. Negative quantity accepted → negative total

- **Commit:** `a41a711` — `refactor(cart): accept numeric strings for quantities`
- **Files touched:** `src/cart/cart.ts`, `tests/cart/cart.test.ts`
- **Intake:** `intake/bug-06-server.log`
- **Root cause:** `toQuantity` (integer ≥ 1) was replaced by `parseQuantity`, which only checks
  `Number.isFinite` and truncates — the lower bound was lost, so `-3` (or `"-3"`) is accepted.
- **Repro (UI):** add *Power Bank 10000mAh*, type `-3` in its quantity box and tab out. Subtotal
  −₹3,897.00, GST −₹701.46, total −₹4,549.46; the order can be placed.
- **Repro (code):** `computeTotals(addItem(createCart(), "p14", -3)).total` → `-4549.46`.
- **Fix:** reject non-integers and values < 1 in `parseQuantity` (keep 0 → remove in `setQuantity`).

## 7. Double-click "Place order" → two orders

- **Commit:** `ff48122` — `refactor(orders): derive duplicate-order check from order history`
- **Files touched:** `src/orders/service.ts`
- **Intake:** `intake/bug-07-issue.md` (includes a log excerpt)
- **Root cause:** the refactor removed the per-cart in-flight promise map and relies on
  "has this cart already been ordered?" — but the order is only recorded after
  `await payments.charge(...)`. Two concurrent calls both pass the check before either records its
  order (check-then-act race).
- **Repro (UI):** add an item, double-click **Place order** within the 800 ms simulated payment
  latency → two orders for the same cart.
- **Repro (code):** `await Promise.all([svc.placeOrder(cart), svc.placeOrder(cart)])` → two orders.
- **Fix:** restore the in-flight map (share one submission per cart id) or reserve the cart before
  awaiting the payment.

## 8. Coupon applies twice → discount over 100%

- **Commit:** `bba42be` — `feat(cart): allow stacking multiple coupon codes`
- **Files touched:** `src/cart/cart.ts`, `src/cart/coupons.ts`, `src/cart/totals.ts`, `tests/cart/coupons.test.ts`, `ui/src/cartView.ts`
- **Intake:** `intake/bug-08-screenshot.png` (captured manually, see `intake/README.md`)
- **Root cause:** stacking changed `couponCode` to a `couponCodes` list, but `applyCoupon` appends
  without de-duplicating and `computeTotals` sums the per-coupon discounts without the old
  `Math.min(…, subtotal)` cap. Applying `DIWALI60` twice gives a 120% discount.
- **Repro (UI):** add *Bluetooth Speaker* (₹2,499); apply `DIWALI60` twice → "Discount (120% off)
  −₹2,998.80", total −₹49.98.
- **Repro (code):** `computeTotals(applyCoupon(applyCoupon(addItem(createCart(), "p13"), "DIWALI60"), "DIWALI60"))`
  → `{ discount: 2998.8, total: -49.98 }`.
- **Fix:** ignore a code that is already applied and cap the combined discount at the subtotal.
