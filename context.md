# context.md — living project state (read this FIRST every session)

_Last updated: Fri 25 Sep 2026 ~23:35 IST · Claude Sonnet 5 (Phase 0 scaffold session)_

## Snapshot
- **Project:** BugProof — "No fix without proof." IBM Bob reproduces a bug with a failing test, finds
  the culprit commit, fixes it (the Fixer can't touch tests) and publishes a Proof of Fix. A web
  "Mission Control" shows it live.
- **Hackathon:** IBM Bob 2.0 (lablab.ai). Deadline **Sun 27 Sep 2026, 19:30 IST** (10:00 AM ET per IBM form; guide said 11 AM ET — use the earlier) · our target **18:30 IST**.
- **Team:** solo · 30+ h · Claude Pro + $100 cloud-session credit · 40 Bobcoins.
- **Phase:** 0 (Setup) — mostly done (0.1 watsonx request and 0.5 cloud sessions still open). Plan: `Plan.md` §7.
- **Links:** repo https://github.com/GegarinSagolsem/bugproof (private) · live URL https://bugproof-web.vercel.app (hello page, auto-deploys from main) · demo repo https://github.com/GegarinSagolsem/bugproof-demo-shoplite (private, contains only `docs/SPEC.md`; cloud session A builds it)

## Decisions (and why)
| When | Decision | Why |
|---|---|---|
| 09-25 | Idea = BugProof (debugging workflow) | not covered by May winners; universal pain; strongest demo; uses every Bob 2.0 feature |
| 09-25 | Solo; UI style = "Mission Control" (dark-first, IBM Plex, IBM Blue) | user choice |
| 09-25 | TypeScript everywhere; Next.js on Vercel; Upstash Redis | user reads TS + Python; fastest to ship; Vercel connector available |
| 09-25 | Demo app = separate repo with real commit history (no backdating) | `git bisect` needs a clean history; hackathon originality rules |
| 09-25 | Bob builds Bob-native parts + runs all cases; Claude builds web app + demo app | save Bobcoins, maximize Bob evidence |
| 09-25 | Repo at `C:\dev\bugproof` (not OneDrive) | OneDrive locks node_modules/.next |
| 09-25 | GitHub private until submission; MIT license | protect the idea; MIT-compliance required |
| 09-25 | Every claimed number must come from `docs/benchmark.md` or a cited source | credibility with judges |
| 09-25 | Default Claude model Sonnet/medium; cloud sessions for big jobs; no Fable | Pro limits + $100 credit |
| 09-26 | Cloud sessions only as backup when Pro limit is near/hit and reset is far | user preference (save the $100 credit) |
| 09-25 | Deadline = 19:30 IST (10 AM ET) | IBM account form states 10 AM ET; earlier of two sources |
| 09-25 | Cache every watsonx/Granite output at generation time; `/triage` falls back to recorded results | IBM Cloud account closes Sep 27 10 AM ET — live Granite dies before judging |
| 09-25 | Demo repo pre-created (private) with SPEC; cloud session A runs inside it | cloud sessions can't create new repos reliably |

## Change log
- ✅ **Done:** researched May 2026 winners + Bob 2.2 features; created Plan.md, context.md, model.md, CLAUDE.md.
  Phase 0 scaffold: `C:\dev\bugproof` created, docs copied, git init, MIT LICENSE, `.gitignore` +
  `.bobignore`, `.env.example`, README stub, `.claude/settings.json` + `agents/scout.md` +
  `agents/reviewer.md`. npm workspaces monorepo (`apps/web`, `packages/shared`, `packages/mcp`).
  `apps/web` = Next.js (TS, Tailwind v4, App Router, src dir) with a dark "hello" landing (IBM Plex
  fonts, Mission Control tokens). `packages/shared` = `@bugproof/shared` (zod schemas for
  Case/Event/Evidence + `mockCase` fixture: hero bug #1, 30 events, 7 evidence kinds).
  `packages/mcp` = stub only (README + package.json), per Plan.md — not implemented (Bob builds it).
  Root `npm run build` and `npm run typecheck` both pass. Private GitHub repo created and pushed.
  Wrote `docs/specs/demo-app.md` and `docs/specs/ui-shell.md` for the two cloud sessions.
- ✅ **UI shell merged** (PR #1, cloud session B): /cases board + /cases/[id] live case view on mock data; build + typecheck pass. Claude GitHub App installed on both repos.
- ✅ **Demo app merged** into bugproof-demo-shoplite main (36 commits, author GegarinSagolsem): 104 tests pass, all 8 seeded bugs confirmed by probes. Answer key + probes + history script moved to `bugproof/docs/answer-key/` (Bob must never see them). Run probes: copy bug-probes.test.ts + vitest.probes.config.ts into the demo repo's docs/ temporarily. Screenshots for bugs #1 and #8 still to capture (see intake/README.md).
- ✅ **Real backend wired up** (Plan.md §4.2): `CaseStore` (`apps/web/src/lib/store/`) with Upstash Redis + in-memory fallback, static replays in `apps/web/data/cases/*.json` (hero case seeded, store+static merged on read, static never overwritten), `/api/ingest` (bearer token, handles event/events/case/evidence/raw Bob hook payloads, never 500s), `/api/cases` + `/api/cases/[id]` (with `?after=`) + `/api/cases/[id]/publish`, live case page now polls every 1 s until proven/unproven. `scripts/install-bob-pack.mjs` and `scripts/send-test-events.mjs` added; smoke-tested locally end to end. To go live on Vercel: set `BUGPROOF_INGEST_TOKEN` and either `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` or (via the Marketplace Upstash integration) `KV_REST_API_URL`/`KV_REST_API_TOKEN` in the project's env vars — without them it silently runs on the in-memory store (fine for the hero-case replay, but live cases won't survive a cold start).
- ✅ **MCP server verified** against demo bug #1: run_tests expect=red → `AssertionError: expected NaN to be 460.82`; bisect found the true culprit `refactor(coupons): extract coupon rule parser` in ~41 s. Claude fixed Bob's bisect (ran twice, npx, 120 s timeout, didn't parse git 2.55 "first 'bad' commit").
- ➕ **Added:** `.claude/agents/{scout,reviewer}.md`, `docs/specs/{demo-app,ui-shell}.md`.
- ➖ **Removed / cut:** create-next-app's default `AGENTS.md`/`CLAUDE.md` in `apps/web` (root ones are
  the source of truth).
- 🔁 **Changed vs plan:** none — scaffold matches Plan.md §4–§6 as specified.

## Next steps (in order)
1. ✅ IBM Cloud/watsonx account requested (activation ≤ 1 h, check spam).
2. 👤 Import `C:\dev\bugproof` → Vercel (root dir `apps/web`), deploy the hello page, confirm the live URL.
3. 👤 In this repo, run `/web-setup` once (enables cloud sessions to reach GitHub).
4. ☁ Launch cloud session **A** from `C:/dev/bugproof-demo-shoplite`: `claude --cloud "Implement docs/SPEC.md exactly..."`.
5. ☁ Launch cloud session **B**: `claude --cloud "Implement docs/specs/ui-shell.md exactly. Work only inside apps/web..."`.
6. 🅱 Bob Task 01: open `C:\dev\bugproof` in Bob → `/init` → AGENTS.md (add "read context.md first").

## Cloud sessions
- A demo app (repo bugproof-demo-shoplite): https://claude.ai/code/session_01813RZXrFBUVqNAxKFpd1CY
- B UI shell (repo bugproof): https://claude.ai/code/session_01Wk2MS9kLR1PMtUwaRALHkT
- Launched 09-25 ~23:59 IST. /web-setup not yet run; check PRs in the morning.
- Old setup commits keep author SagolsemHironika + AI trailers (rewrite skipped so cloud PRs don't break).

## Waiting on you 👤
- IBM Cloud / watsonx account activation email.
- GitHub + Vercel logins confirmed (`gh auth status`).
- Lablab team name (for screenshot file names) — default `bugproof`.
- Voiceover choice by Sunday noon: your own voice or Watson Text-to-Speech.

## Open questions / verify
- Bob hooks: config format; do HTTPS hooks include subagent/mode info? (Bob Settings → Hooks)
- Bob 2.2 `plugins/` folder layout; Bob workflow for a `/prove` command.
- watsonx region + best Granite model available in the account.
- Bobcoins per BugProof run (calibrate on run #1).
- Cloud-credit burn per session (check claude.ai/settings/usage after session A).

## Environment
- Windows 11 · Node 24.19 · npm 11.17 · git 2.55 · gh 2.97 · Python 3.14 · Docker 29.7 · Vercel CLI not installed (connector available)
- IBM Bob IDE 2.2.0 · Bob Shell not installed (optional) · Bob team `ibm-hackathon-lablab` (Enterprise) · 40 Bobcoins

## Bob task log (→ `bob_sessions/` screenshots)
| # | Date | Task | Workspace | Bobcoins | Screenshot |
|---|---|---|---|---|---|
| 01 | 09-25 | `/init` → AGENTS.md ✅ | bugproof | 1.13 | `bugproof_task01_init_agents_md_summary.png` |
| 02 | 09-26 | Custom modes + rules (Plan→Agent) ✅ | bugproof | 0.40 | `bugproof_task02_custom_modes_rules_summary.png` |
| 03 | 09-26 | Skills: repro-test, root-cause, proof-of-fix ✅ | bugproof | ? | `bugproof_task03_skills_summary.png` |
| 04 | 09-26 | MCP server (open_case, record, run_tests, bisect, publish_proof) ✅ | bugproof | ? | `bugproof_task04_mcp_server_summary.png` |

## Session log (one line per session)
- 09-25 22:00–22:45 · Claude Opus 5.5 (max) · research + planning docs
- 09-25 22:50–23:35 · Claude Sonnet 5 (subagent) · Phase 0 scaffold
- 09-25 23:40 · Claude Opus 5.5 · demo repo created; deadline + watsonx-closure decisions
