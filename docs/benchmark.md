# Benchmark — BugProof on the ShopLite demo repo

_Generated 2026-09-26 06:04 UTC by `scripts/build-benchmark.mjs` from the exported case events
(`apps/web/data/cases/*.json`), IBM Bob's task log (`docs/benchmark/bob-runs.json`) and the answer key
(`docs/answer-key/bugs.md`). Do not edit by hand: re-run `node scripts/export-cases.mjs && node scripts/build-benchmark.mjs`._

## Headline numbers

- **Bugs attempted:** 6 · **proven:** 6 · **unproven:** 0
- **Culprit commit matches the answer key:** 6/6 (5 established by `git bisect`, 1 named by the Historian from git history)
- **Culprit named correctly during the run itself:** 3/6 — bisect found it live in 1 run; earlier runs hit a bisect bug (see caveats) and were re-bisected afterwards
- **Median time to a failing (RED) reproduction test:** 4m 49s
- **Median time to proof:** 17m 52s (fastest 7m 40s; includes time runs waited on a human)
- **Run after the pipeline fixes (bug #5):** culprit by bisect at 4m 01s, proven at 7m 44s, 0 human interventions, 3.06 Bobcoins
- **Runs with zero human interventions:** 4/6
- **Bobcoins per run:** median 2.95 (range 2.39–5.36) · all 6 runs 21.34 · follow-up re-bisects 0.26 · building the Bob pack 4.83 · every Bob task 26.43
- **Test suite at the end:** 117 tests, all passing (each proven bug added its repro test)

## Per case

| Bug | Intake | Case | Time to RED | Time to proof | Tests after | Human interventions | Bobcoins | Culprit | Matches key | How the culprit was established |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| #4 Pagination drops the last product | issue text | `case_20260925_34fd` | 6m 09s | 14m 39s | 107 | 0 | 2.84 | `882203d` refactor(catalog): compute pagination bounds explicitly | ✅ | bisect (follow-up Bob task) |
| #6 Negative quantity accepted → negative total | server log | `case_20260925_318b` | 2m 58s | 7m 40s | 110 | 0 | 2.78 | `c3fb68f` refactor(cart): accept numeric strings for quantities | ✅ | Historian (git history) |
| #1 Empty coupon field → total shows ₹NaN | screenshot | `case_20260925_bf62` | 6m 19s | 21m 06s | 112 | 0 | 4.91 | `c3f394a` refactor(coupons): extract coupon rule parser | ✅ | bisect (run outside Bob after the run) |
| #3 Delivery date one day early after 8 PM IST | PDF (QA report) | `case_20260926_2c6c` | 5m 06s | 43m 49s | 113 | 3 | 2.39 | `b4369d9` perf(delivery): compute IST date without Intl.DateTimeFormat | ✅ | bisect (follow-up Bob task) |
| #8 Coupon applies twice → discount over 100% | screenshot | `case_20260926_db4f` | 4m 32s | 34m 01s | 114 | 4 | 5.36 | `185f248` feat(cart): allow stacking multiple coupon codes | ✅ | bisect (follow-up Bob task) |
| #5 Search became case-sensitive | issue text | `case_20260926_7e5e` | 3m 12s | 7m 44s | 117 | 0 | 3.06 | `649b24a` perf(catalog): memoize search index | ✅ | bisect (live, during the run) |

## Raw timestamps (UTC, from the case events)

| Bug | Case opened | REPRO_READY (RED) | BISECT_DONE (live bisect) | Proven (last publish) |
| --- | --- | --- | --- | --- |
| #4 | 2026-09-25 20:47:43 | 2026-09-25 20:53:52 | — | 2026-09-25 21:02:22 |
| #6 | 2026-09-25 21:19:54 | 2026-09-25 21:22:52 | — | 2026-09-25 21:27:34 |
| #1 | 2026-09-25 21:49:48 | 2026-09-25 21:56:07 | — | 2026-09-25 22:10:54 |
| #3 | 2026-09-26 02:29:18 | 2026-09-26 02:34:24 | — | 2026-09-26 03:13:08 |
| #8 | 2026-09-26 03:23:50 | 2026-09-26 03:28:22 | — | 2026-09-26 03:57:51 |
| #5 | 2026-09-26 05:14:21 | 2026-09-26 05:17:32 | 2026-09-26 05:18:22 | 2026-09-26 05:22:05 |

## Culprit vs answer key

| Bug | Answer key (commit subject) | Found | During the run | Final method | Note |
| --- | --- | --- | --- | --- | --- |
| #4 | refactor(catalog): compute pagination bounds explicitly | `882203d` | correct — named by the Locator from git history after bisect failed | bisect (follow-up Bob task) |  |
| #6 | refactor(cart): accept numeric strings for quantities | `c3fb68f` | correct — named by the Historian from git history; bisect returned no culprit | Historian (git history) | not bisectable with its repro test: the test imports parseQuantity, which the culprit commit itself introduced, so every earlier commit is untestable |
| #1 | refactor(coupons): extract coupon rule parser | `c3f394a` | wrong — Lead named the initial commit after bisect timed out | bisect (run outside Bob after the run) |  |
| #3 | perf(delivery): compute IST date without Intl.DateTimeFormat | `b4369d9` | none — bisect timed out; Lead recorded the root-cause line, not a commit | bisect (follow-up Bob task) |  |
| #8 | feat(cart): allow stacking multiple coupon codes | `185f248` | wrong — Lead named the initial commit from git log after bisect timed out | bisect (follow-up Bob task) |  |
| #5 | perf(catalog): memoize search index | `649b24a` | correct — found by bisect during the run | bisect (live, during the run) |  |

## Bobcoins (IBM Bob task log)

| Bob task | What | Bobcoins |
| --- | --- | --- |
| `e7b06407` | Run bug #4 | 2.84 |
| `8c239418` | Run bug #6 | 2.78 |
| `63a1a929` | Run bug #1 | 4.91 |
| `3f521cac` | Run bug #3 | 2.39 |
| `80751800` | Run bug #8 | 5.36 |
| `630c6c30` | Run bug #5 | 3.06 |
| `9537be04` | re-bisect bugs #3 and #8 (fix already committed, bad = fix commit's parent) | 0.17 |
| `6e20b35a` | re-bisect bug #4 | 0.09 |
| `794925d4` | Setup: /init → AGENTS.md | 1.13 |
| `3c8fbd68` | Setup: custom modes + rules | 0.40 |
| `bd8ce5cf` | Setup: skills | 0.40 |
| `f49dc8b4` | Setup: MCP server | 2.90 |
|  | **Total** | **26.43** |

## Definitions and caveats

- **Time to X** = event timestamp − the case's `startedAt` (when the Lead opened the case). **Time to proof** uses `provenAt`
  (the last `publish_proof`) and includes any time the run waited on a human.
- **Human interventions** = messages typed by the human after the first prompt. Automatic Lead→subtask hand-offs are not counted.
- **Bobcoins** = the root task's recorded cost (it includes its subagents and every subtask that handed back) plus subtasks that
  never handed back. Source: `~/.bob/db/bob.db`; it matches the in-app coin balance.
- The answer key's commit hashes predate a history rewrite of the demo repo, so culprits are matched by **commit subject**.
- Bob passed repoPath as c:\dev\... (lowercase drive); Vitest loaded twice and every bisect step was skipped, overrunning Bob's ~60 s MCP call limit. Fixed 2026-09-26 in packages/mcp/src/session.ts (commit 4563a3d). This is why bisect timed out in runs #4, #1, #3 and #8, why #3 and #8 needed human prompts,
  and why their culprits were attached by a follow-up bisect task.
- Bug #8's RED/GREEN evidence recorded 0 tests (`run_tests` hit the same bug); its tests-after comes from the FIX_GREEN milestone.
  Bug #4's early run attached no RED/GREEN evidence (early MCP version); same fallback.
- **Manual baseline: not measured yet** (Plan.md §9) — no human-vs-Bob time comparison is claimed.
- Bugs #2 and #7 were not attempted (Bobcoin budget).
