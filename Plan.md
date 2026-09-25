# BugProof — Master Plan
### IBM Bob 2.0 Hackathon · target: 🥇 1st place

> **No fix without proof.** BugProof turns a bug report into a *proven* fix. Inside IBM Bob, a team of
> agents reproduces the bug with a failing test, pinpoints the commit that caused it, fixes it — with
> **no permission to touch the test** — and publishes a Proof of Fix that anyone can verify with two
> commands. A live "Mission Control" web app shows every step as it happens.

| | |
|---|---|
| Event | IBM Bob 2.0 Hackathon · lablab.ai · online · 48 h |
| Hard deadline | **Sun 27 Sep 2026, 20:30 IST** (11:00 AM ET) |
| Our deadline | **Sun 27 Sep 2026, 18:30 IST** (2 h buffer for upload problems) |
| Team | Solo · 30+ h · 40 Bobcoins · Claude Pro + $100 cloud-session credit |
| Live state | `context.md` (read first) · model & token rules: `model.md` |

> Token tip: don't read this whole file. Run `grep -n "^## " Plan.md`, then read only the section you need.

---

## 1. Why this wins

**Lessons from the May 2026 IBM Bob hackathon (503 submissions):**
- 🥇 *Pedigree* — original idea (provenance of AI-written code) + deep Bob-native build (custom mode,
  skill, MCP server, GitHub Action) + one memorable artifact (Code Passport) + watsonx Granite + Vercel.
  It listed Claude Code in its stack openly.
- 🥈 *Atlas* — one unforgettable visual (any repo as a zoomable city).
- 🥉 *Sandbox* — cinematic failure replay + one headline number (risk score).
- The most-voted projects (onboarding copilots, PR reviewers, legacy modernization) won nothing →
  **originality + depth beat popular ideas.**

**BugProof vs the judging criteria:**

| Criterion | Our answer |
|---|---|
| Application of Technology | Bob is the *engine*, not just the editor: 4 permission-scoped custom modes, 3 skills, mode rules, our own MCP server, lifecycle hooks → live dashboard, parallel subagents, subtasks, document understanding (screenshot / PDF / log). Plus watsonx.ai Granite. |
| Presentation | Split screen: Bob working in the IDE ↔ Mission Control updating live. The RED → GREEN moment. A shareable Proof of Fix page. Tight 3-minute story. |
| Business Value | Debugging and "almost-right" AI fixes eat developer time. Every BugProof fix ships with evidence → faster reviews, fewer reopened bugs. Measured on 8 real bugs (time, success rate, cost per fix). |
| Originality | "Proof-carrying fixes"; separation of duties **enforced by Bob mode permissions** (the Fixer cannot edit the test, so it cannot cheat); Bob hooks used as live telemetry (almost nobody uses them); deterministic `git bisect` as an MCP tool. |

## 2. Problem

- **Reproducing is the slowest part of debugging.** "Works on my machine" / "cannot reproduce" stalls bugs for days.
- **AI fixes are guesses.** Assistants propose a patch in seconds, but nobody proves it fixes *this* bug
  or breaks nothing else → review time and rework move downstream.
- **Reviewers lack evidence.** A PR says "fixed NaN total" — with no failing-then-passing test, no root
  cause, no blast radius.

**Target users:** developers on bug-fix / on-call duty · reviewers and tech leads · QA engineers who file bugs.

**Stats to use** (verify + link the source before any of these goes into the video/slides):
- Stack Overflow Developer Survey 2025 — "AI solutions that are almost right, but not quite" was the #1
  frustration (~66%); ~45% say debugging AI-generated code takes longer.
- Cambridge Judge Business School (2013) — developers spend ~50% of programming time debugging (~$312B/yr).
- Stripe "Developer Coefficient" (2018) — ~17 h/week on maintenance work such as debugging and refactoring.

## 3. Solution & user flow

1. **Report arrives:** GitHub issue, error log, screenshot or QA PDF.
2. **Start:** in Bob IDE pick 🕵️ *BugProof Lead* and type `Prove issue #1` (drop in the screenshot).
   A case opens on Mission Control; Bob prints its link.
3. **Investigate in parallel:** the Lead spawns 3 subagents — 🔎 Triage (reads text / screenshot / PDF /
   log → expected vs actual), 🗺️ Locator (code path + blast radius), 🕰️ Historian (recent changes there).
4. **Reproduce (RED):** 🧪 Reproducer writes the smallest failing test. `run_tests` confirms it fails
   *for the right reason* (an assertion, not a crash or typo).
5. **Pinpoint:** MCP `bisect` runs `git bisect` with that test → exact culprit commit + diff.
6. **Fix (GREEN):** 🔧 Fixer edits `src/` only — tests are read-only for it. Repro test passes, full suite passes.
7. **Challenge:** ⚖️ Critic (read-only) attacks the fix: edge cases, side effects. It can send it back once.
8. **Proof:** `publish_proof` finalizes the Proof of Fix page; Bob opens a PR that links to it. The page
   includes *verify it yourself*: 2 commands (the test fails before the fix, passes after).
9. **Learn:** the Impact page aggregates time-to-proof, success rate and cost per fix.

## 4. Architecture

```
                ┌──────────────────────── Developer machine ────────────────────────┐
 GitHub issue   │  IBM Bob IDE 2.2 · workspace = demo repo (shoplite)               │
 screenshot ───►│   .bob/custom_modes.yaml → 🕵️ Lead · 🧪 Reproducer · 🔧 Fixer · ⚖️ Critic │
 QA PDF / log   │   parallel subagents: 🔎 Triage · 🗺️ Locator · 🕰️ Historian          │
                │   .bob/skills/* · .bob/rules*/ · lifecycle hooks                  │
                │        │ MCP (stdio)                        │ hook events         │
                │        ▼                                    ▼                     │
                │   bugproof-mcp (Node/TS)              hook → HTTPS POST           │
                │   open_case · get_issue · run_tests · bisect · record · publish   │
                └────────┬────────────────────────────────────┬─────────────────────┘
                         │  HTTPS + bearer token              │
                         ▼                                    ▼
                ┌──────────────── BugProof Cloud · Next.js on Vercel ───────────────┐
                │ /api/ingest · /api/cases · /api/cases/[id]/publish · /api/triage  │
                │ Upstash Redis (cases, events, evidence) + data/cases/*.json       │
                │ watsonx.ai Granite (live triage + plain-English proof summaries)  │
                │ UI: Landing · Cases · Live Case (swimlanes) · Proof · Impact      │
                └───────────────────────────────────▲───────────────────────────────┘
                                                    │
                        Judges / reviewers / team in the browser (live + replays)
```

### 4.1 Bob pack — the engine (built WITH Bob, lives in `bob/`, installed into a repo's `.bob/`)

**Custom modes** — `.bob/custom_modes.yaml` (schema: `slug`, `name`, `roleDefinition`, `whenToUse`,
`customInstructions`, `groups`; the `edit` group accepts a `fileRegex`). Workspace must be *trusted*.

| Mode | Job | Tool groups | Can edit |
|---|---|---|---|
| 🕵️ `bugproof-lead` | run the case: open it, spawn subagents, delegate subtasks, publish proof | read, mcp, skill, subagent, subtask, todo | `.bugproof/` notes only |
| 🧪 `bugproof-reproducer` | write the minimal failing test | read, edit, execute, mcp, skill | `tests/**` only |
| 🔧 `bugproof-fixer` | smallest source fix | read, edit, execute, mcp | `src/**` only — **never tests** |
| ⚖️ `bugproof-critic` | adversarial review of the diff | read, execute, mcp | nothing |

Example (Fixer):
```yaml
customModes:
  - slug: bugproof-fixer
    name: 🔧 BugProof Fixer
    roleDefinition: You make the smallest change in src/ that turns the failing BugProof test green without breaking any other test.
    whenToUse: After a RED reproduction test exists for the active case.
    groups:
      - read
      - - edit
        - fileRegex: "^src/.*\\.tsx?$"
          description: Source only. Tests are read-only for the Fixer.
      - execute
      - mcp
```

**Subagents** (parallel, spawned by the Lead, each needs one approval click): Triage = `explore`,
Locator = `explore` (lighter model → fewer Bobcoins), Historian = `general` (needs git commands).

**Rules:** `.bob/rules/01-bugproof.md` — no fix before a RED test; minimal diffs; never weaken, skip or
delete tests; report milestones through MCP `record`. Per-mode rules in `.bob/rules-<slug>/NN-*.md`.

**Skills** (`.bob/skills/<name>/SKILL.md`, frontmatter `name` + `description`):
- `repro-test` — minimal failing Vitest test patterns; must fail on an assertion; file `tests/bugproof/<case>.test.ts`.
- `root-cause` — read the culprit diff, 5 whys, blast-radius checklist.
- `proof-of-fix` — evidence checklist + PR body template (with the 2 verify commands).

**MCP server `bugproof-mcp`** (TypeScript, `@modelcontextprotocol/sdk`, stdio, registered in
`.bob/mcp.json` → `mcpServers`; secrets come from environment variables, never committed).
Deterministic tools = reliable and cost no LLM tokens:

| Tool | Does |
|---|---|
| `open_case` | create the case in the cloud, write `.bugproof/active-case`, return the dashboard URL |
| `get_issue` | fetch a GitHub issue + download attachments to `.bugproof/cases/<id>/` |
| `run_tests` | run Vitest (JSON reporter) → counts + failures; `expect: "red"` confirms an *assertion* failure |
| `bisect` | temp git worktree + `git bisect run` with the repro test copied in → culprit commit + diff |
| `record` | milestone / evidence event `{agent, kind, title, data}` |
| `publish_proof` | finalize the proof, return proof URL + PR body |

**Hooks (Bob 2.2 lifecycle hooks: session start, pre/post tool, prompt submit, agent stop; command or
HTTPS):** every event → `POST /api/ingest`, tagged with the active case (from `.bugproof/active-case`)
→ live activity feed + exact swimlane timing. ⚠️ Verify the format in *Bob Settings → Hooks* before
building. Fallback: MCP `record` milestones alone still drive the dashboard.

**Document understanding:** bug #1 arrives as a screenshot, #3 as a QA PDF, #6 as a server log.
Stretch: a QA `.xlsx` with several bugs → batch cases.

**Entry point:** Lead-mode prompt (`Prove issue #1`). Stretch: a Bob workflow `/prove`, Bob 2.2
`plugins/` packaging, `npx bugproof init`.

**Bob feature map** (reuse for the Bob Usage Statement):

| Bob 2.x feature | Where | Evidence |
|---|---|---|
| Custom modes + fileRegex permissions | Lead / Reproducer / Fixer / Critic | Task 02 + every run |
| Rules (project + per mode) | `.bob/rules*` | Task 02 |
| Skills | repro-test, root-cause, proof-of-fix | Task 03 |
| Parallel subagents | Triage · Locator · Historian | every run |
| Subtasks + mode switching | Lead → Reproducer → Fixer → Critic | every run |
| MCP (server built with Bob) | bugproof-mcp | Task 04 |
| Lifecycle hooks | live telemetry → Mission Control | Task 05 |
| Document understanding | screenshot / PDF / log intake | runs #1, #3, #6 |
| Plan + Agent modes, todo lists | building the pack; Lead checklist | Tasks 02–05 |
| `/init` → AGENTS.md | project context | Task 01 |
| Review, commit messages, PRs | review of our repo; one PR per fix | Task 13 + runs |

### 4.2 BugProof Cloud — Mission Control (Next.js on Vercel)

| Route | Purpose |
|---|---|
| `/` | Landing: the promise, autoplay replay of a real case, how it works, "Powered by IBM Bob 2.0", benchmark numbers |
| `/cases` | Case board: status chips, time-to-proof, source icon (screenshot / PDF / log / issue) |
| `/cases/[id]` | Live or replay: agent swimlanes, activity feed, evidence tabs (Triage · RED · Culprit · Fix · GREEN · Critic), replay 1×/4×/16× with captions |
| `/cases/[id]/proof` | **Proof of Fix** — one shareable page: PROVEN stamp, 4 checks, evidence, verify-it-yourself commands |
| `/impact` | Benchmark table + charts: time vs baseline, success rate, cost per fix |
| `/triage` | Try it live: paste a bug report → watsonx Granite structured triage |
| `/how-it-works` | The Bob pack: modes & permissions, skills, MCP, hooks, install steps |

**API:** `POST /api/ingest` (hooks + MCP, bearer token) · `GET /api/cases` ·
`GET /api/cases/[id]?after=<ts>` (polling) · `POST /api/cases/[id]/publish` · `POST /api/triage`.

**Data** (`packages/shared`, zod):
- `Case {id, repo, issue, title, severity, source, status: open|investigating|reproduced|fixing|proven|unproven, startedAt, provenAt, culprit, metrics}`
- `Event {caseId, ts, agent, kind: spawn|tool|milestone|evidence|status, title, data}`
- `Evidence {caseId, kind: triage|red|culprit|diff|green|suite|blast|critic, data}`

**Storage:** Upstash Redis (Vercel Marketplace, free tier). The live view polls every 1 s (simple and
reliable). Every finished case is exported to `apps/web/data/cases/<id>.json` → **replays work even if
Redis is down; the demo cannot break.**

### 4.3 Demo target repo — `bugproof-demo-shoplite` (separate public repo)

A small TypeScript shop (cart, coupons, tax, ₹ currency, delivery dates, orders) + ~100 passing Vitest
tests + a tiny UI for realistic screenshots. Built commit by commit with a real history (no
backdating) so `git bisect` works. Each bug lands in its own plausible commit.

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

### 4.4 IBM watsonx (hackathon IBM Cloud account, $80 credit)

- `/triage`: Granite turns a messy report into JSON `{severity, component, expected, actual, steps, missingInfo}`.
- Proof page: Granite writes the plain-English "what broke / why / what changed" summary.
- Model: the best Granite instruct model offered in Prompt Lab (pick in Phase 3); region + project ID from the account.
- Optional: Watson Text-to-Speech for the voiceover; watsonx Orchestrate "BugProof Dispatcher" agent (stretch).
- Access: request at https://www.ibm.com/account/reg/us-en/signup?formid=urx-54436 with your lablab email.

## 5. Repo layout

```
C:\dev\bugproof            GitHub "bugproof" — private until submission · MIT license
├─ apps/web/               Next.js app (UI + API routes)
│  └─ data/cases/*.json    exported real runs (replay safety net)
├─ packages/shared/        types + zod schemas + API client
├─ packages/mcp/           bugproof-mcp server
├─ bob/                    Bob pack: custom_modes.yaml, rules*/, skills/, mcp.json template, hooks
├─ scripts/                install-bob-pack, bob-hook, export-case
├─ docs/specs/             task specs for Claude cloud sessions
├─ docs/benchmark.md       raw timing log — the source of every number we claim
├─ docs/hackathon/         hackathon guides (gitignored)
├─ bob_sessions/           Bob task-summary screenshots (REQUIRED)
├─ .bob/                   Bob config for building this repo (+ AGENTS.md from /init)
├─ .claude/                settings.json (Sonnet default) + agents/ (see model.md)
├─ Plan.md · context.md · model.md · CLAUDE.md · Graphify.md
└─ README.md               hero GIF, how it works, install, architecture
```
Keep the repo **outside OneDrive** — OneDrive locks `node_modules` / `.next` and causes random build errors.

## 6. UI / UX — "Mission Control"

**Principles:** calm dark canvas, one accent colour, motion only for meaning (live, success, failure),
every screen answers "what is happening?" and "what is proven?".

| Token | Dark (default) | Light |
|---|---|---|
| bg | `#0B0D12` | `#FFFFFF` |
| surface | `#12151C` | `#F4F4F4` |
| border | `#232836` | `#E0E0E0` |
| text | `#E8EAF0` | `#161616` |
| muted | `#8B93A5` | `#525252` |
| accent (IBM Blue) | `#4589FF` | `#0F62FE` |
| success / GREEN | `#42BE65` | `#198038` |
| danger / RED | `#FA4D56` | `#DA1E28` |
| warning | `#F1C21B` | `#B28600` |
| agent / AI | `#A56EFF` | `#8A3FFC` |

- **Type:** IBM Plex Sans (UI) + IBM Plex Mono (code, IDs, timers).
- **Stack:** Tailwind v4 · shadcn/ui (Radix) · motion · lucide-react · Recharts · Shiki (code + diffs) · sonner · cmdk.
- **Signature moments:**
  1. Agent swimlanes like a trace waterfall — bars grow live, the active agent glows.
  2. RED → GREEN flip card for the repro test.
  3. Culprit-commit card (like Sentry's "suspect commit") with the diff.
  4. "PROVEN" stamp animation + copy-link on the Proof page.
  5. Count-up metrics on Impact.
- **Quality bar:** skeleton loaders, helpful empty states, ⌘K palette, keyboard nav, visible focus rings,
  WCAG AA contrast, `prefers-reduced-motion`, responsive Proof page, OG image per proof, favicon, never
  colour-only status (icon + label).
- **Inspiration:** Linear, Vercel dashboard, Sentry issue page, GitHub Actions run graph,
  Honeycomb / Jaeger traces, Raycast. Pinterest/Dribbble searches: "devtools dashboard dark",
  "trace waterfall UI", "CI pipeline UI".

## 7. Timeline (IST) — solo, ~33 h of work + 2 sleeps

Legend: 🅱 Bob task (screenshot it!) · 🅲 Claude local · ☁ Claude cloud session ($100 credit) · 👤 you

### Phase 0 — Setup · Fri 25 Sep 22:30 → Sat 01:00
- 0.1 👤 Request the IBM Cloud (watsonx) account · check Bob shows team `ibm-hackathon-lablab` + 40 Bobcoins · `gh auth status` · Vercel login · Claude: `/model sonnet`, `/effort medium`.
- 0.2 🅲 Create `C:\dev\bugproof`, move the docs, git init, MIT license, `.gitignore` + `.bobignore`, private GitHub repo, `/web-setup` (enables cloud sessions).
- 0.3 🅲 Scaffold the monorepo (web + shared + mcp), shared types, deploy "hello" to Vercel.
- 0.4 🅲 Write `docs/specs/demo-app.md` (A) and `docs/specs/ui-shell.md` (B, uses mock data from shared types).
- 0.5 ☁ Launch cloud sessions **A** (demo app + 8 bugs) and **B** (design system + shell + case view) → they work while you sleep.
- 0.6 🅱 Task 01: open the repo in Bob → `/init` → AGENTS.md (add "read context.md first").
- ✅ **M0:** live URL shows the hello page; A and B running.

😴 **Sleep 01:00 → 06:30**

### Phase 1 — Engine · Sat 26 Sep 06:30 → 13:00
- 1.1 🅲 Review + merge A (demo repo) and B (UI shell).
- 1.2 🅱 Task 02 (Plan mode → Agent mode): custom modes + rules (permission-scoped).
- 1.3 🅱 Task 03: skills `repro-test`, `root-cause`, `proof-of-fix`.
- 1.4 🅱 Task 04: build `bugproof-mcp` (open_case, get_issue, run_tests, bisect, record, publish_proof).
- 1.5 🅲 API routes + Upstash Redis + ingest token.
- 1.6 🅱 Task 05: hooks → ingest (verify the Bob hook format first).
- 1.7 🅱 Task 06: first full run — bug #1 (hero, screenshot).
- ✅ **M1 (13:00):** bug #1 goes RED → culprit → GREEN, and its events appear in the API.

### Phase 2 — Mission Control UI · Sat 10:00 → 20:00 (overlaps Phase 1)
- 2.1 ☁ Session **C**: Landing + Proof of Fix + Impact + How it works (after B is merged).
- 2.2 🅲 Wire the UI to real data from M1; replay player with captions; deploy after every merge.
- ✅ **M2 (20:00):** the deployed UI shows bug #1 live and as a replay.

### Phase 3 — Runs, numbers, watsonx · Sat 20:00 → Sun 01:00, Sun 06:30 → 10:00
- 3.1 🅱 Tasks 07–13: BugProof on bugs 2–8 (one Bob task each; note Bobcoins after each).
- 3.2 👤 Baseline: fix one bug by hand with a timer (honest human baseline, ~30–45 min).
- 3.3 🅲 Export cases → `data/cases/*.json`; fill `docs/benchmark.md`; Impact page from real data.
- 3.4 🅲 watsonx Granite: `/triage` + proof summaries.
- 3.5 ☁ Before sleeping, launch session **D** (polish list: loading/empty states, a11y, OG images).
- ✅ **M3 (Sun 10:00):** ≥ 6 proven cases, real metrics live.

😴 **Sleep 01:00 → 06:30**

### Phase 4 — Polish & package · Sun 27 Sep 10:00 → 14:00
- 4.1 🅲 Merge D; final UX pass on desktop + phone.
- 4.2 🅱 Task 14: Bob Review of our repo + fixes; Bob-generated commit messages / PRs.
- 4.3 🅲 README (hero GIF, architecture, install), secrets scan, make both repos public.
- 4.4 (stretch) `plugins/` packaging · `npx bugproof init` · XLSX batch intake · Orchestrate agent.
- ✅ **M4 (14:00): feature freeze.** Only bug fixes after this.

### Phase 5 — Submission · Sun 14:00 → 18:30
- 5.1 👤🅲 Record the demo (OBS or Win+G), voiceover, edit in Clipchamp → MP4 ≤ 3:00.
- 5.2 🅲 Slides (Canva connector or Claude slides) + cover image.
- 5.3 🅲 Long description + Bob Usage Statement (≤ 500 words each) + tags.
- 5.4 👤 Screenshot every Bob task summary → `bob_sessions/`.
- 5.5 👤 Submit on lablab by **18:30 IST**; open every link in an incognito window.

## 8. Budgets

**Bobcoins — 40 total, no refills:**

| Bucket | Coins |
|---|---|
| Tasks 01–05: build the Bob pack | ~12 |
| Tasks 06–13: 8 real runs | ~14 (calibrate on run #1) |
| Task 14: Review + commit/PR | ~3 |
| Video take | ~3 |
| Buffer | ~8 |

Rules: check *Settings → General* after every task and log it in context.md · if run #1 costs > 2.5
coins → cut the benchmark to 5 bugs and make Historian an `explore` subagent · one Bob task per job
(smaller context = cheaper) · always point Bob at specific files, never "explore the whole repo".

**Claude:** Sonnet by default, cloud sessions for big jobs, Opus rarely → see `model.md`.

## 9. Metrics & honesty rules

- Every number in the video, slides and README comes from `docs/benchmark.md` (raw event timestamps)
  or a linked source.
- Per case: time-to-RED, time-to-culprit, time-to-proof, tests run, human approvals, Bobcoins (from the
  task summary).
- Baseline: your timed manual attempt (+ literature numbers, cited).
- Failures stay visible: a case that couldn't be proven shows as **unproven** — honesty is credibility.
- Sped-up footage in the video is labelled (e.g. "⏩ 4×" + a real-time clock).

## 10. Risks & fallbacks

| Risk | Fallback |
|---|---|
| Bob hook format differs / no HTTPS hooks | command hook script; or MCP `record` milestones only |
| Bob can't reproduce a bug | pick clear bugs; Triage hints for the Reproducer; show it honestly as "unproven" |
| Bobcoins run low | calibrate on run #1; `explore` subagents; 5-bug benchmark; reuse replays in the video |
| Subagent approvals slow the demo | narrate them as human-in-the-loop; cut waiting time in the edit |
| watsonx account delayed | Bob writes the proof summaries; `/triage` goes live when Granite is ready |
| Redis / Vercel problem | static replays from `data/cases/*.json` |
| Cloud session writes messy code | small specs, review the diff, `typecheck` + tests before merge |
| Running out of time | cut from the bottom of §11 |
| Secret leaks | `.gitignore` + `.bobignore`, scan before going public, tokens only in env vars |

## 11. Scope — cut from the bottom

- **MUST:** Bob pack (4 modes, 3 skills, rules, MCP with run_tests + bisect + record + open_case) ·
  ≥ 5 proven cases · Cases + Live/Replay case + Proof + Impact + Landing, deployed · video · slides ·
  descriptions · `bob_sessions/`.
- **SHOULD:** hooks live feed · watsonx `/triage` + summaries · PR per fix · How-it-works page · light mode.
- **COULD:** `plugins/` packaging · `npx bugproof init` · XLSX batch intake · Orchestrate agent ·
  Watson TTS voiceover · GitHub Action that runs BugProof on labelled issues.
- **Cut order:** COULD (bottom up) → light mode → How-it-works (fold into Landing) → PR per fix.

## 12. Submission kit

**Checklist:** title · short description · long description (≤ 500 words) · Bob Usage Statement
(≤ 500 words) · tags · public repo URL · `bob_sessions/` screenshots · live URL (Vercel) · cover
image · slides · MP4 video (≤ 3:00, ≥ 90 s live demo).

**Video script (3:00):**

| Time | Shot | Voiceover (idea) |
|---|---|---|
| 0:00–0:12 | Customer screenshot "Total: ₹NaN" | "A customer sends this. Where do you start? Reproducing is the slowest part of debugging — and AI fixes today are guesses." |
| 0:12–0:25 | Logo + tagline | "Meet BugProof. No fix without proof. Built on IBM Bob 2.0." |
| 0:25–2:05 | Split screen: Bob IDE + Mission Control (≥ 90 s live) | Lead mode · drop the screenshot · 3 parallel subagents · RED test · bisect finds the culprit · Fixer *can't* touch tests · GREEN, all tests pass · Critic approves · PR + Proof page |
| 2:05–2:30 | Impact page | "Across 8 real bugs: X proven, median Y min vs Z by hand; cost per fix …" (real numbers only) |
| 2:30–2:50 | How-it-works diagram | "Permission-scoped custom modes, skills, our MCP server, lifecycle hooks, parallel subagents, document understanding, watsonx Granite." |
| 2:50–3:00 | Proof page + URL | "Stop guessing. Prove it." |

**Slides (10):** Title · Problem · Insight ("a fix is only as good as its proof") · Solution ·
How Bob powers it · Demo screens · Impact · Architecture · What's next (GitHub Action via Bob Shell,
plugin marketplace, Orchestrate) · Thank you + links.

**Long description skeleton:** Problem (~120 words) · Users & flow (~120) · Solution & novelty (~160) · Impact (~80).

**Bob Usage Statement skeleton:** Bob as the runtime engine (the §4.1 feature map) · Bob during
development (Plan/Agent modes, `/init`, MCP server, Review, commit messages) · Bobcoins used ·
watsonx.ai · one honest line: "Claude Code helped build the web dashboard."

**Tags:** IBM Bob, watsonx.ai, Granite, Debugging, Developer Tools, MCP, AI Agents, Next.js, TypeScript, Vercel.

**Screenshot names:** `bugproof_task01_init_agents_md_summary.png` (use your lablab team name instead
of `bugproof` if you have one).

## 13. Working rules (how we stick to the plan)

1. `context.md` is updated at the end of every session: Done / Added / Removed / Changed + next steps.
2. Any deviation from this plan is written in context.md → *Decisions* (with the reason) **before** doing it.
3. Deploy after every merged feature — never more than 1 hour away from a working live URL.
4. Bob-native parts are built and run in Bob (evidence!); Claude builds the web app and glue.
5. Feature freeze Sunday 14:00. Submit by 18:30.
