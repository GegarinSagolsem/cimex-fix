# context.md — living project state (read this FIRST every session)

_Last updated: Fri 25 Sep 2026 ~22:45 IST · Claude Opus 5.5 (planning session)_

## Snapshot
- **Project:** BugProof — "No fix without proof." IBM Bob reproduces a bug with a failing test, finds
  the culprit commit, fixes it (the Fixer can't touch tests) and publishes a Proof of Fix. A web
  "Mission Control" shows it live.
- **Hackathon:** IBM Bob 2.0 (lablab.ai). Deadline **Sun 27 Sep 2026, 20:30 IST** · our target **18:30 IST**.
- **Team:** solo · 30+ h · Claude Pro + $100 cloud-session credit · 40 Bobcoins.
- **Phase:** 0 (Setup) — not started. Plan: `Plan.md` §7. Model rules: `model.md`.
- **Links:** repo _TBD_ · live URL _TBD_ · demo repo _TBD_

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
- ➕ **Added:** —
- ➖ **Removed / cut:** —
- 🔁 **Changed vs plan:** —

## Next steps (in order)
1. 👤 Request the IBM Cloud hackathon account (watsonx): https://www.ibm.com/account/reg/us-en/signup?formid=urx-54436 (same email as lablab).
2. 👤 Claude Code: `/model sonnet` and `/effort medium`.
3. 🅲 Plan.md 0.2–0.4: `C:\dev\bugproof`, move docs, git init, private GitHub repo, scaffold, deploy hello, specs A + B.
4. ☁ Launch cloud sessions A (demo app) + B (UI shell) before sleeping.
5. 🅱 Task 01: Bob `/init` → AGENTS.md.

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
