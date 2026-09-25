# context.md — living project state (read this FIRST every session)

_Last updated: Fri 25 Sep 2026 ~23:35 IST · Claude Sonnet 5 (Phase 0 scaffold session)_

## Snapshot
- **Project:** BugProof — "No fix without proof." IBM Bob reproduces a bug with a failing test, finds
  the culprit commit, fixes it (the Fixer can't touch tests) and publishes a Proof of Fix. A web
  "Mission Control" shows it live.
- **Hackathon:** IBM Bob 2.0 (lablab.ai). Deadline **Sun 27 Sep 2026, 20:30 IST** · our target **18:30 IST**.
- **Team:** solo · 30+ h · Claude Pro + $100 cloud-session credit · 40 Bobcoins.
- **Phase:** 0 (Setup) — mostly done (0.1 watsonx request and 0.5 cloud sessions still open). Plan: `Plan.md` §7.
- **Links:** repo https://github.com/GegarinSagolsem/bugproof (private) · live URL _TBD_ (Vercel not yet imported) · demo repo _TBD_ (spec written, not launched)

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
- ➕ **Added:** `.claude/agents/{scout,reviewer}.md`, `docs/specs/{demo-app,ui-shell}.md`.
- ➖ **Removed / cut:** create-next-app's default `AGENTS.md`/`CLAUDE.md` in `apps/web` (root ones are
  the source of truth).
- 🔁 **Changed vs plan:** none — scaffold matches Plan.md §4–§6 as specified.

## Next steps (in order)
1. 👤 Request the IBM Cloud hackathon account (watsonx): https://www.ibm.com/account/reg/us-en/signup?formid=urx-54436 (same email as lablab).
2. 👤 Import `C:\dev\bugproof` → Vercel (root dir `apps/web`), deploy the hello page, confirm the live URL.
3. 👤 In this repo, run `/web-setup` once (enables cloud sessions to reach GitHub).
4. ☁ Launch cloud session **A**: `claude --cloud "Implement docs/specs/demo-app.md exactly..."` (new repo `bugproof-demo-shoplite`).
5. ☁ Launch cloud session **B**: `claude --cloud "Implement docs/specs/ui-shell.md exactly. Work only inside apps/web..."`.
6. 🅱 Bob Task 01: open `C:\dev\bugproof` in Bob → `/init` → AGENTS.md (add "read context.md first").

## Waiting on you 👤
- IBM Cloud / watsonx account approval.
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
| 01 | | `/init` → AGENTS.md | bugproof | | `bugproof_task01_init_agents_md_summary.png` |

## Session log (one line per session)
- 09-25 22:00–22:45 · Claude Opus 5.5 (max) · research + planning docs
