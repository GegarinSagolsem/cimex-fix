# Spec: `bugproof-demo-shoplite` (separate repo)

**For:** a Claude cloud session, executed autonomously. Read this whole spec before writing any
code. Don't ask questions — make reasonable choices and list every assumption in the PR
description. This is a NEW, SEPARATE repository, not a folder inside `bugproof`.

## Goal

Build a small, realistic TypeScript "shop" codebase with a real, sequential git history (built by a
script, not backdated), ~100 passing Vitest tests, and a tiny static UI for screenshots — such that
8 specific, pre-planned bugs are present in the final state, each introduced by its own plausible
commit, none caught by the test suite that exists at the time it's introduced, and the **final**
test suite (~100 tests) passes cleanly with all 8 bugs still present. This repo is the target that
IBM Bob will later debug with `git bisect` — the history must be real (`git log` shows normal
incremental commits) so bisect works.

## Tech

- TypeScript, Node 24, npm (NOT pnpm/yarn).
- Domain logic as plain TS modules in `src/` — no framework needed for the logic itself.
- Vitest for tests, in `tests/`.
- A tiny static UI in `ui/` built with Vite (vanilla TS or a minimal React), just enough to take
  realistic screenshots of the shop (cart, coupon field, totals, orders list, search, pagination).
  It should visually surface bugs #1 and #8 when triggered manually (see below).
- Currency: INR, formatted with `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })`
  (renders `₹`).
- Timezone: delivery-date estimates computed in `Asia/Kolkata`.

## Repo layout

```
bugproof-demo-shoplite/
├─ src/
│  ├─ cart/          cart state, applyCoupon, totals
│  ├─ tax/           tax calculation
│  ├─ currency/       INR formatting helpers
│  ├─ delivery/       delivery-date estimate (Asia/Kolkata)
│  ├─ catalog/        product list, search, pagination
│  └─ orders/         order placement, order list
├─ tests/             vitest tests mirroring src/ (unit + a few integration)
├─ ui/                tiny Vite static UI for screenshots (imports from src/ where practical)
├─ scripts/
│  └─ build-history.sh   builds the whole repo's git history from scratch (see below)
├─ docs/
│  └─ bugs.md         PRIVATE answer key (see below) — gitignore this file's exposure? see note
├─ intake/            artifacts used as "how the bug arrived" (QA PDF, server log, issue texts)
├─ package.json
├─ vitest.config.ts
└─ README.md
```

## The 8 bugs (Plan.md §4.3) — must match exactly

| # | Bug | Type | Arrives as |
|---|---|---|---|
| 1 | Empty coupon field → total shows `₹NaN` (**hero**) | type coercion | screenshot |
| 2 | Totals off by ₹0.01 | float rounding | issue text |
| 3 | Delivery date one day early after 8 PM IST | timezone | QA PDF |
| 4 | Pagination drops the last product | off-by-one | issue text |
| 5 | Search became case-sensitive | regression | issue text |
| 6 | Negative quantity accepted → negative total | validation | server log |
| 7 | Double-click "Place order" → two orders | race condition | issue + log |
| 8 | Coupon applies twice → discount over 100% | logic | screenshot |

Each bug must be introduced by exactly one commit, chosen so it's a plausible, ordinary-looking
change (a refactor, a "feature", a "perf improvement") — not a commit that says "introduce bug".
The test suite that exists *at that point in history* must NOT catch it (i.e. don't regress a test
that was passing). By the final commit, the full ~100-test suite passes (bugs are real but
untested/undertested gaps, not suite failures).

## `scripts/build-history.sh`

A bash script that, when run once against an empty target directory, creates the entire repo from
scratch as ~30-40 sequential commits with realistic, conventional-commit-style messages (e.g. `feat:
add cart totals`, `refactor: extract tax calculation`, `perf: memoize search index`,
`fix: paginate products`). Rules:

- **No backdated commit dates** — let git use real wall-clock commit times as the script runs (do
  not set `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE` to fake historical dates).
- Each commit should be a coherent, reviewable unit (add one module, add its tests, a small
  refactor, etc.) — not one giant commit.
- The 8 bug-introducing commits are woven naturally into this sequence at plausible points (e.g.
  bug #2's float-rounding issue lands in the same commit that adds a "sum multiple line items"
  feature).
- The script must be idempotent/rerunnable against a clean directory (safe to `rm -rf` and rerun).
- At the end, print a summary: total commits, short SHA of each bug-introducing commit.

## `docs/bugs.md` (private answer key)

Not a secret from the repo's perspective (this repo is separate from `bugproof`), but it must never
be surfaced in the shop's own README or UI. For each bug: number, one-line description, introducing
commit's short SHA + message, file(s) touched, and the exact repro steps. This is what "Historian"
and the benchmark script will eventually be checked against.

## Intake artifacts (`intake/`)

- **Bug #3** (QA report): `intake/bug-03-qa-report.pdf` — generate from a markdown source
  (`intake/bug-03-qa-report.md`) describing the timezone repro, then render to PDF (pandoc, or any
  available tool; if no PDF tool is available in the sandbox, commit the `.md` and a short note in
  the PR that PDF rendering needs to happen locally).
- **Bug #6** (server log): `intake/bug-06-server.log` — a realistic-looking Node/Express-style log
  snippet showing an order placed with a negative quantity and the resulting negative total.
- **Bugs #2, #4, #5, #7**: `intake/bug-0N-issue.md` — GitHub-issue-style text (title, body,
  repro steps, expected/actual) for each, plain markdown, ready to paste into a GitHub issue.
- **Bugs #1 and #8** (screenshots): do NOT attempt to generate these. Instead add
  `intake/README.md` explaining: run `npm run dev` in `ui/`, trigger the bug manually (empty
  coupon field for #1; apply the same coupon code twice for #8), and save a screenshot as
  `intake/bug-01-screenshot.png` / `intake/bug-08-screenshot.png`. Leave those two files absent.

## Acceptance checks

1. `npm install && npm test` at repo root passes: ~100 tests, 0 failing.
2. `npm run build` (if a build step exists for `ui/`) succeeds.
3. `git log --oneline` shows 30-40 real sequential commits with normal timestamps (verify with
   `git log --format=%ai | sort -u | wc -l` > 1, i.e. not all one instant).
4. `docs/bugs.md` lists exactly 8 bugs with correct commit SHAs (cross-check
   `git show <sha> --stat` touches the file(s) named).
5. Manually reintroducing the fix for any one bug (revert its commit) makes at least one existing
   or new test fail — bugs must be real, reachable code paths, not dead code.
6. No bug's introducing commit message mentions "bug", "break", or similar — keep them plausible.

## Don't touch / out of scope

- Do not implement any part of the `bugproof` monorepo, the Bob pack, or the MCP server here — this
  is only the target shop app.
- Do not add a real backend/DB — everything is in-memory, plain TS.
- Do not attempt PDF generation via a heavyweight headless-browser dependency if a lighter option
  (pandoc, markdown-pdf) is available; if none is available, ship the markdown and say so in the PR.

## When finished

Run `npm test` and fix until green, then open a PR titled "Initial shoplite demo app with seeded
bug history" summarizing: total commits, list of 8 bug commits (short SHA + message), test count,
and any assumptions made.
