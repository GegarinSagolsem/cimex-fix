# context.md — living project state (read this FIRST every session)

_Last updated: Sat 26 Sep 2026 ~22:00 IST · Claude Opus 5.5 · all 8 bugs proven, culprits 8/8; one-shot model comparison on /impact (8 bugs); **start with "▶ Start here next session"**_

## ▶ Start here next session
**Repo rename done (09-26):** GitHub `GegarinSagolsem/cimex-fix` (old URL redirects), Vercel domain
`https://cimex-fix.vercel.app` added (old `bugproof-web.vercel.app` still serves; Vercel project name unchanged, Git
connection survived the rename). Demo repo keeps `bugproof-demo-shoplite`. Local folders, MCP ID, mode slugs unchanged.

**Gemini added to the model comparison (done 09-26):** Gemini 3.1 Pro (High) via the Antigravity CLI headless
(`agy --model gemini-3.1-pro-high --output-format json -p=...`), 8 parallel sessions in `C:\dev\gemini-baseline\` (only the
prompts), commands auto-denied, 0 denied actions, 1 turn each. Result: **7/8 fixed with proof, culprit 7/8**; #1 miss = empty
coupon now throws (own test green, probe red), culprit `185f248`. Raw JSON in `C:\dev\gemini-baselineaw\`, answers +
meta in `docs/benchmark/model-baseline/google_gemini-3.1-pro-high/`. 48 answers total: 31 fixed, 23 with proof.
Same CLI also offers Claude Sonnet/Opus 4.6 and GPT-OSS 120B if more contenders are ever wanted.

**Then:** slides + cover, video script → Bob hooks only if coins remain (**7 Bobcoins left**, user 09-26). Both repos
still **private**; make them public just before submitting (Sun, after the freeze).

## Snapshot
- **Project:** Cimex Fix (formerly BugProof) — "No fix without proof." IBM Bob reproduces a bug with a failing test, finds
  the culprit commit (git bisect), fixes it (the Fixer can't touch tests), a Critic reviews, and a
  Proof of Fix is published. The "Mission Control" website shows every case live.
- **Deadline:** **Sun 27 Sep 2026, 19:30 IST** (10:00 AM ET, IBM form) · our target **18:30 IST**.
  The IBM Cloud / watsonx account also closes at that moment.
- **Team:** solo · Claude Pro (5-h window + weekly) + $100 cloud-session credit (backup only) · Bobcoins **7 / 40 left** (user, 09-26).
- **Phase:** 3 (real runs + numbers). Phases 0–2 done. Plan: `Plan.md` §7.
- **Links:** repo https://github.com/GegarinSagolsem/cimex-fix (private) · live https://cimex-fix.vercel.app
  (also bugproof-web.vercel.app; auto-deploys from main) · demo repo https://github.com/GegarinSagolsem/bugproof-demo-shoplite (private)

## Where things are
| Thing | Location |
|---|---|
| Web app (Next.js 16) | `apps/web` — pages `/` (landing), `/cases`, `/cases/[id]` (live, polls 1 s), `/cases/[id]/proof` (Proof of Fix), `/triage`, `/impact` (from `src/data/benchmark.json`, incl. the model comparison) |
| Benchmark | `node scripts/export-cases.mjs && node scripts/build-benchmark.mjs` → `docs/benchmark.md` + `apps/web/src/data/benchmark.json`. Per-run Bob facts (coins, interventions, bisect) live in `docs/benchmark/bob-runs.json` — add a row after each new run (source: `~/.bob/db/bob.db`) |
| API | `/api/ingest` (bearer `BUGPROOF_INGEST_TOKEN`), `/api/cases`, `/api/cases/[id]` (GET, DELETE w/ token), `/api/cases/[id]/publish`, `/api/triage` |
| Storage | Upstash Redis on Vercel (KV_* env vars) + static replays `apps/web/data/cases/*.json` (all 8 proven cases, re-exported 09-26 ~21:30) |
| Shared types | `packages/shared` (zod: Case, Event, Evidence, TriageResult, plainSummary) |
| MCP server | `packages/mcp` → `dist/index.js` · tools: open_case, record, evidence, run_tests, bisect, publish_proof |
| Bob pack (source) | `bob/pack/` (4 modes, rules, 3 skills, mcp.json) → install: `node scripts/install-bob-pack.mjs C:/dev/bugproof-demo-shoplite` |
| Answer key (never show Bob) | `docs/answer-key/` (bugs.md, probes, build-history.sh) |
| Model comparison | `node scripts/model-baseline.mjs` → `docs/benchmark/model-baseline.json` + raw answers/prompts in `docs/benchmark/model-baseline/` (cached: re-runs only re-score). `build-benchmark.mjs` turns it into the benchmark section + `/impact` table |
| Secrets | `C:\dev\bugproof\.env.local` (ingest token + WATSONX_*) — gitignored, never print |
| Bob screenshots | `bob_sessions/` |

## Decisions (and why)
| When | Decision | Why |
|---|---|---|
| 09-25 | Idea = BugProof (debugging workflow) | not covered by May winners; universal pain; strongest demo |
| 09-25 | UI "Mission Control" (dark-first, IBM Plex, IBM Blue) | user choice |
| 09-25 | TypeScript everywhere; Next.js on Vercel; Upstash Redis | fastest to ship |
| 09-25 | Demo app = separate repo with real history | `git bisect` needs a clean history |
| 09-25 | Bob builds Bob-native parts + runs all cases; Claude builds web/glue | save Bobcoins, maximize Bob evidence |
| 09-25 | Repo at `C:\dev\` (not OneDrive); private until submission; MIT | file locks; protect idea |
| 09-25 | Every claimed number comes from `docs/benchmark.md` or a cited source | credibility |
| 09-25 | Deadline 19:30 IST; cache every Granite output; `/triage` recorded fallback | IBM account closes before judging |
| 09-26 | Cloud sessions only as backup when Pro limit is near/hit and reset is far | user preference |
| 09-26 | Commits: author GegarinSagolsem, one short sentence, no co-author/AI names | user preference |
| 09-26 | Model = `ibm/granite-4-h-small` (us-south) | newest Granite available |
| 09-26 | Skip bug #7 (race condition) unless coins remain | costliest; 7/8 is enough |
| 09-26 | bisect ignores agent-supplied good/bad and never blames the root commit | Lead passed bad refs on the hero run |
| 09-26 | bug #3: bisect MCP timed out twice; Lead fell back to root-cause analysis + RED test confirmation instead of stopping UNPROVEN | culprit was already confirmed by triage/Historian and repro test; honestly logged as a fallback in the case events, not hidden |
| 09-26 | Root cause of stalled runs (from Bob's task DB `~/.bob/db/bob.db`): Reproducer/Fixer/Critic modes lack the `subtask` group, so `end_subtask` is refused and control never returns to the Lead. Recovery by switching the stuck subtask's mode meant the "fixer"/"critic" ran as `spawn_subagent`s (they inherit the current mode's permissions; the bug #3 critic was a generic explore subagent). The bug #3 fix itself was made with the chat in Fixer mode. | replaces the earlier "one-off hiccup" note, which was wrong |
| 09-26 | **Root cause of bisect timeouts + "0 tests":** Bob passes `repoPath: "c:\\dev\\..."` (lowercase drive). Vitest then loads twice and every test errors (`Cannot read properties of undefined (reading 'config')`): bisect skipped all ~41 commits (BISECT_LOG in the stale worktrees), overran Bob's ~60 s MCP limit and orphaned 13 worktrees; `run_tests` returned 0 tests in bug #8. Fix: `resolveRepoPath` uppercases the drive letter. | Reproduced (`c:` vs `C:` is the only difference) and verified with Bob's exact path: #3 → `b4369d9`, #8 → `185f248` (both = answer key), ~25 s each |
| 09-26 | bisect hardening: pre-flight (test must fail on an assertion at `bad`), abort after 8 skips, 45 s budget, async (server stays responsive), clears stale Temp worktrees. `bad` is accepted again but validated; `good` is still always the root commit. | fail fast with a reason instead of a silent timeout; lets us re-bisect bugs whose fix is already committed (`bad=<fix>^`) |
| 09-26 | Bob pack: Reproducer/Fixer/Critic get `subtask` + `todo` groups and must `end_subtask`; Lead must delegate with `start_subtask` and record "culprit commit not found" if bisect fails | fixes the stalled hand-offs and the wrong bug #8 culprit guess |
| 09-26 | Palette changed to "sky & lime" (Aeline reference), **light-first**; dark stays via the toggle (storage key `bugproof-theme-v2`). Text/link blue `#0a62e0`, sky `#1f7aff` only on big surfaces, lime `#d4f25a` only as a background under black text. Replaces the 09-25 "dark-first IBM Blue" choice | user's choice from the WebDemo references; every text colour checked ≥ 4.5:1, chart colours re-validated for both themes |
| 09-26 | `* { border-color }` moved into `@layer base` | unlayered, it overrode every border-colour utility in Tailwind v4 (e.g. the PROVEN stamp's green border rendered grey) |
| 09-26 | Manual human baseline dropped (Plan.md §9): no human-vs-Bob time comparison is claimed anywhere | user can't do a fair manual debug; a single rushed attempt would be a weak, attackable number. Problem framing uses cited industry stats instead (Plan.md §2, verify each source first) |
| 09-26 | Granite summaries now get the Lead's technical summary + the full diff; new `POST /api/cases/[id]/summary` (bearer) regenerates only `plainSummary` (keeps `status`/`provenAt`). Regenerated #4, #5, #6 and checked each by hand | #5's summary stated the wrong root cause (diff was cut at 600 chars of JSON), #6's contradicted itself, #4 had none. `/publish` must not be re-run: it resets `provenAt` |
| 09-26 | **One-shot model comparison** instead of a human baseline: 5 watsonx.ai models (Granite 4 H Small, Llama 3.3 70B, Llama 4 Maverick, Mistral Small 3.1, gpt-oss-120b; us-south, temp 0, one answer each) get the report + all `src/` + git history at Bob's base commit. Bob's fixes and the answers are scored by the same script: answer-key probe (fixed), full suite (nothing broken), own test RED→GREEN, culprit subject. Result on Bob's 7 bugs: Cimex 7/7 fix with proof; gpt-oss-120b 7/7 (culprit 6/7); others 1–3/7; all 35 answers looked complete, 23 fixed the bug, 4 broke tests. Published as-is | user asked for an honest metric vs other models; the probes are independent of Bob and the models, so both sides are judged alike. 0 Bobcoins, ~307k watsonx tokens |
| 09-26 | GitHub repo renamed to `cimex-fix`, Vercel domain `cimex-fix.vercel.app` added; demo repo name kept | product rename; demo repo name is in every case record and verify command |
| 09-26 | Gemini added to the comparison by hand via Antigravity (clean folder, one chat per bug, no tools) | user has no Gemini API key; same prompts and scoring, caveats disclosed |
| 09-26 | Case page evidence tabs read the real MCP/Bob fields (`diff`, `sha`/`subject`, `reasons`, `APPROVE`/`pass`, `failures`, `stepsToReproduce`) | tabs were written against mock data: Diff/Culprit showed empty, Critic badge red |

## Results so far (all verified against the answer key)
| Bug | Intake | Case id | Status | Culprit correct | Tests after |
|---|---|---|---|---|---|
| #4 pagination | issue text | case_20260925_34fd | proven | fix in correct file (evidence thin: early MCP bug) | 107 |
| #6 negative qty | server log | case_20260925_318b | proven | ✅ | 110 |
| #1 ₹NaN (hero) | screenshot | case_20260925_bf62 | proven | ✅ (re-attached after bisect fix) | 112 |
| #3 delivery date | PDF (QA report) | case_20260926_2c6c | proven | ✅ `b4369d9` (re-bisected in Bob, task 10) | 113 |
| #8 coupon twice | screenshot | case_20260926_db4f | proven | ✅ `185f248` (re-bisected in Bob, task 10; older wrong entry superseded) | 114 |
| #5 search case-sensitive | issue text | case_20260926_7e5e | proven in 7 min 44 s (first fully clean run: subtasks hand back, bisect found culprit live) | ✅ `649b24a` | 117 |
| #7 double order (race) | issue text + log | case_20260926_9afc | proven in 8 min 02 s, 0 human prompts, leaner pack (2.54 coins) | ✅ `985e247` via follow-up (first test over-specified) | 118 |
| #2 GST off by ₹0.01 | issue text | case_20260926_b86b | proven in 12 min 51 s, 0 human prompts, bisect live (3.03 coins); fix = answer key (`calculateGst(subtotal)`), demo commit `decb79c` | ✅ `98e2fce` live | 120 |
Culprit commits vs answer key: **6/6** — #1 `c3f394a`, #6 `c3fb68f`, #3 `b4369d9`, #8 `185f248`, #4 `882203d` (re-bisected, task 11), #5 `649b24a` (live).
Bug #5 fix = answer key exactly (lower-case index haystack + query); demo repo commit `6ff3e78`, pushed.
All five fixes are committed and pushed on demo repo `main` (bug #3 = `31835d5`, bug #8 = `0944d88`). Stray case `69ba` deleted.

## Next steps (in order)
1. ✅ Pipeline fixed (see Decisions 09-26): modes hand back, bisect works with Bob's path, tabs show real data.
   👤 In Bob: restart the MCP server (Settings → MCP) so it loads the new `dist/`; modes reload from `.bob/`.
2. ✅ Re-bisected #3, #8 (task 10) and #4 (task 11) in Bob — culprit accuracy 5/5.
3. ✅ #5 done (clean run, recorded). 🅱 #2 only if coins allow (keep ~10 in reserve). After each run, Claude: verify vs
   `docs/answer-key/bugs.md`, run `npx vitest run`, commit the fix in the demo repo, log coins here.
4. ✅ Cases exported to `apps/web/data/cases/`; `docs/benchmark.md` generated (6/6 proven, culprits 6/6, median RED 4m 49s,
   median proof 17m 52s, bug #5 clean run 7m 44s, 2.95 coins/fix median).
5. ✅ Impact page (`/impact`), Proof of Fix page (`/cases/[id]/proof`: PROVEN stamp, 4 checks, fix diff, tested
   verify-it-yourself commands, copy link) and real landing page (`/`: results, bug #5 replay, how it works, Bob features).
   All checked at 1440 px and a true 390 px. Bug #1 re-bisected in Bob (task 13) → 5/6 culprits by Bob's bisect.
6. ~~Manual baseline~~ dropped (see Decisions). ✅ Industry stats verified against primary sources → `docs/sources.md`
   (SO 2025: 66% / 45.2% · Cambridge 2013: 50% of programming time, $312bn · Stripe 2018: >17 h/week maintenance).
7. ✅ UI refresh from the `WebDemo/` references: landing (sky hero, floating stats, evidence-card fan, bento results,
   trace replay, contrast band) and the app pages (sky & lime light theme, pill nav with lime active tab, pill buttons,
   rounded cards). Checked in light and dark at 1440 px. `WebDemo/` is gitignored — never commit it.

**Remaining (as of Sat 26 Sep ~12:30 IST; feature freeze Sun 14:00, submit by Sun 18:30):**
8. ✅ README.md — problem (cited), 7-step flow with mode permissions, results, verify-it-yourself, architecture, setup, demo-repo transparency note, how Bob was used.
9. 🅲 Draft submission texts: title, short + long description (≤500 words), Bob Usage Statement (≤500 words), tags.
10. 🅲 Slides (10, Plan.md §12) + cover image.
11. 👤 Video (≤3:00, ≥90 s live demo): raw take `bugproof_video_run_bug05_raw.mp4` + re-shoot the new landing / Impact /
    Proof pages; voiceover choice (own voice or Watson TTS) still open; label sped-up footage "⏩".
12. 👤 lablab team name (default `bugproof`), then make both repos public just before submitting.
13. Sat 18:17 plan (user): ✅ leaner Bob pack (Historian capped, Fixer attaches diff, Critic attaches verdict, no
    duplicate milestones, deterministic tests for timing bugs) → 🅱 bug #7 (dry run: deterministic RED 3/3, bisect finds
    `985e247` = answer key in 29.6 s) → 🅱 Bob hooks only if coins remain. Bug #2 skipped.
14. ✅ One-shot model comparison (see Decisions) on `/impact`, in `docs/benchmark.md`, README and the submission text.
    ✅ Bug #2 added (8 bugs): Cimex 8/8 fix with proof; gpt-oss-120b 8/8 (culprit 6/8); others 1–3/8; 40 answers, 24 fixed, 16 with proof.
15. ✅ Bug #2 proven (task 16) and committed in the demo repo; benchmark, README, submission, /impact now say 8/8.
    Bug #2's Granite summary regenerated twice via the summary route (1st said "penny" + "stacked across items").
16. ✅ Bob pack modes renamed to "🕵️ Cimex Lead" etc. (slugs unchanged; reinstalled, both repos pushed). Next: 🅱 Bob hooks only if coins remain · slides +
    cover · video script (8 bugs, model comparison, no "lifecycle hooks" unless built).

## Notes / open items
- Demo repo history contains the original build spec (`docs/SPEC.md` in root commit `32d13b1`, deleted in `49f8447`):
  it lists the 8 bug symptoms and example commit messages (incl. `perf: memoize search index`) but no culprit SHAs.
  Bob's task DB shows no run ever opened it (0 hits across 34 run tasks). Disclosed in README → "About the demo repo".
  Don't rewrite history now (every SHA, culprit, verify command and piece of evidence would break).
- **Raw video take of the clean bug #5 run:** `Videos\Screen Recordings\bugproof_video_run_bug05_raw.mp4` (split screen:
  Mission Control + Bob). Best candidate for the 0:25–2:05 live-demo segment (speed up, label "⏩").
- ✅ Cases list cards now show "proof in Xm Ys" (from `startedAt`→`provenAt`); bug #4's repo corrected to `bugproof-demo-shoplite`.
  Times include human-in-the-loop stalls: #4 14m39s, #6 7m40s, #1 21m6s, #3 43m49s, #8 34m1s, #5 7m44s (clean run).
- Bug #8's RED/GREEN evidence shows 0 tests (run_tests hit the `c:` bug during that run) → don't use #8 as a video hero.
- `docs/answer-key` hashes predate a history rewrite; match culprits by commit subject (e.g. #3 `eb3a92e` = `b4369d9`).
- **Hero recording** (Snipping Tool, `Videos\Screen Recordings`): usable, but Bob's chat shows the WRONG culprit
  ("initial spec") at one point → cut that part; show the dashboard's culprit card instead. Retake if coins allow.
- After changing MCP code: rebuild (`npm run build -w bugproof-mcp`) and restart the MCP server in Bob (Settings → MCP).
- The Lead doesn't record triage/locator/reproducer milestones consistently → timeline has few lanes. Consider Bob hooks
  (Bob Settings → Hooks) to stream tool events to `/api/ingest` (`{type:"hook", payload}` is supported).
- `packages/mcp` tsc typecheck can OOM on this machine; `npm run build -w bugproof-mcp` (esbuild) works.
- ShopLite UI: `cd C:\dev\bugproof-demo-shoplite && npm run dev` → http://localhost:5173.
- Waiting on user: lablab team name (default `bugproof`); voiceover choice (own voice or Watson TTS) by Sun noon.

## Environment
- Windows 11 · Node 24.19 · npm 11.17 · git 2.55 · gh 2.97 · Python 3.14 · Docker · Bob IDE 2.2.0 (team `ibm-hackathon-lablab`)
- IBM Cloud account `2825373 - watsonx` (us-south): watsonx project `bugproof` (WML associated), Orchestrate, TTS/STT, Cloudant.

## Bob task log (→ `bob_sessions/` screenshots)
| # | Task | Workspace | Bobcoins | Screenshot |
|---|---|---|---|---|
| 01 | `/init` → AGENTS.md | bugproof | 1.13 | `bugproof_task01_init_agents_md_summary.png` ✅ |
| 02 | Custom modes + rules (Plan→Agent) | bugproof | 0.40 | `bugproof_task02_custom_modes_rules_summary.png` ✅ |
| 03 | Skills | bugproof | ? | `bugproof_task03_skills_summary.png` ✅ |
| 04 | MCP server | bugproof | ? | `bugproof_task04_mcp_server_summary.png` ✅ |
| 05 | Run bug #4 | shoplite | ? | `bugproof_task05_first_run_bug04_summary.png` ✅ |
| 06 | Run bug #6 | shoplite | 2.78 | `bugproof_task06_run_bug06_summary.png` (check saved) |
| 07 | Run bug #1 hero | shoplite | ~5 | `bugproof_task07_run_bug01_hero_summary.png` (check saved) |
| 08 | Run bug #3 (delivery date, PDF intake) | shoplite | 2.39 (≈0.7 caused by the `c:` bug + stalled hand-offs) | `bugproof_task08_run_bug03_summary.png` ✅ |
| 09 | Run bug #8 (coupon twice, screenshot intake) | shoplite | 5.36 (≈1.8 caused by the `c:` bug + stalled hand-offs) | `bugproof_task09_run_bug08_summary.png` ✅ |
| 10 | Re-bisect bugs #3 + #8 (culprits attached) | shoplite | 0.17 | `bugproof_task10_rebisect_bug03_bug08_summary.png` ✅ |
| 11 | Re-bisect bug #4 (culprit attached) | shoplite | 0.09 | `bugproof_task11_rebisect_bug04_summary.png` ✅ |
| 12 | Run bug #5 (search case-sensitive, issue intake) — clean run, recorded | shoplite | 3.06 (16 → 13) | `bugproof_task12_run_bug05_summary.png` ✅ |
| 13 | Re-bisect bug #1 (hero culprit now Bob-verified, `c3f394a`) | shoplite | 0.09 | `bugproof_task13_rebisect_bug01_summary.png` ✅ |
| 14 | Run bug #7 (race condition) with the leaner pack — proven, culprit not found live | shoplite | 2.54 (13 → 10) | `bugproof_task14_run_bug07_summary.png` ✅ |
| 15 | Bug #7 follow-up: symptom-only test + bisect → `985e247` | shoplite | 0.55 | `bugproof_task15_rebisect_bug07_summary.png` ✅ |
| 16 | Run bug #2 (GST rounding, issue intake) — clean run, bisect live, 0 human prompts | shoplite | 3.03 | `bugproof_task16_run_bug02_summary.png` ✅ |
Costs from Bob's task DB `~/.bob/db/bob.db` (`tasks.costs`): a Lead's total includes its subagents and every subtask that
returned via `end_subtask`; subtasks that never returned (#3, #8) must be added. Each model call re-sends the whole thread
(~0.03/step early, ~0.10 late). In run 12 the Lead's own turns ≈1.2, Historian subagent 0.72, a git-diff subagent 0.33,
Reproducer 0.23, Fixer 0.25, Critic 0.13.
Tasks 03–05 together ≈ 6.7 coins (40 − 1.53 − 2.78 − 5 − 24). Task 08: 2.00 coins (24 → 22 left).

## Session log
- 09-25 22:00–22:45 · Opus · research + planning docs
- 09-25 22:50–23:35 · Sonnet subagent · Phase 0 scaffold
- 09-25 23:40 → 09-26 03:50 · Opus (+ Sonnet subagents: backend, Granite) · cloud PRs merged, backend, Bob tasks 02–07, watsonx, 3 proven runs
- 09-26 08:00–10:00 · Sonnet → Opus · bugs #3, #8 proven (Bob tasks 08–09); diagnosed stalls from Bob's task DB; fixed modes, bisect (`c:` casing), evidence tabs
- 09-26 10:00–22:00 · Opus · Impact/Proof/landing pages, UI refresh, README, judge critique, rename to Cimex Fix (site + README + Bob modes),
  bugs #5, #7, #2 proven (tasks 12–16), submission drafts, one-shot model comparison. GitHub repo rename deferred to the next session
