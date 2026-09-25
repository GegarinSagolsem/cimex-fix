# model.md — Using Claude efficiently (Pro plan + $100 cloud credit)

## TL;DR — 10 rules
1. **Default = Sonnet 5, effort medium** (`/model sonnet`, `/effort medium`). The planning chat
   (Opus 5.5 at max) was a one-time exception.
2. **Opus 5.5 only for design decisions and nasty bugs.** Easiest: `/model opusplan` (Opus while
   planning, Sonnet while executing).
3. **Haiku 4.5 for small stuff:** renames, copy text, formatting, quick lookups, updating context.md.
4. **Never Fable 5.1** — and never `/model best` (it picks Fable, which bills usage credits).
5. **Big, well-specified build jobs → cloud sessions** (`claude --cloud "..."`) so they use the
   $100 credit first instead of your Pro limits. Launch them before you sleep.
6. Every session starts from `context.md` (CLAUDE.md makes this automatic). Use graphify; never ask
   Claude to "read the whole codebase".
7. `/clear` between unrelated tasks · `/compact <what to keep>` when a session gets long · `/context`
   to see what's using space.
8. One precise prompt beats five vague ones: name the files, paste only the error, say what "done" means.
9. Subagents only for parallel or noisy work, on cheap models (definitions in §5).
10. End every session with "update context.md" (Haiku) → commit → push.

## 1. Your budgets

| Pool | What it is | Use it for |
|---|---|---|
| Pro 5-hour window | Rolling limit that starts with your first message; Opus drains it about 2× faster than Sonnet | Interactive local work: integration, debugging, reviews |
| Pro weekly cap | Shared by claude.ai chat + Claude Code | Keep ≥ 30% for Sunday (fixes, writing, video) |
| $100 cloud credit | One-time; applied to Claude Code **cloud sessions** before plan usage (per the promo) | Big parallel build jobs: UI screens, demo app, polish |
| Bobcoins (40) | IBM Bob — separate from Claude | Bob-native parts + all BugProof runs (Plan.md §8) |

Check usage with `/usage` or at claude.ai/settings/usage. **After the first cloud session, confirm the
credit went down (not your Pro limit).** Note: the docs say cloud sessions otherwise share your plan's
rate limits, so once the $100 is spent they count against Pro.

## 2. Models

| Model | Alias | API price in / out (per 1M tokens) | Relative cost | Best for us |
|---|---|---|---|---|
| Opus 5.5 | `opus` | $4 / $20 | ~2× Sonnet, ~4× Haiku | architecture, hard debugging, risky reviews |
| Sonnet 5 | `sonnet` | $2 / $10 | 1× | ~80% of the work: features, UI, API routes, tests (1M context included) |
| Haiku 4.5 | `haiku` | $1 / $5 | ~0.5× | quick edits, docs, context.md updates, simple searches |
| Fable 5.1 | `fable` / `best` | $10 / $50 | ~5× | ❌ banned |

- Prices are Anthropic's API list prices; plan limits and cloud credit burn roughly follow the same ratios (assumption — calibrate).
- **On Pro, the account default model is Opus 5.5** → we pin Sonnet in `.claude/settings.json` (§6).
- `opusplan` = Opus in plan mode, Sonnet when executing — the best mix for Pro.

## 3. Effort levels

Levels: `low` · `medium` · `high` · `xhigh` · `max` (Opus 5.5 default = medium; most others = high).

| Effort | When | Examples |
|---|---|---|
| low | mechanical | rename, move files, update context.md, format text |
| medium | **default** | components, API routes, small features, copywriting |
| high | tricky logic | MCP `bisect`, hooks ingest, replay engine, a bug that survived one fix |
| xhigh | rare | cross-cutting refactor, confusing failure after 2 attempts |
| max | almost never | the master plan; a demo-blocking mystery on Sunday |

Set it with `/effort medium` (session), `claude --effort high` (one launch) or in settings.

## 4. Task → where → model → effort (our hackathon)

| Task | Where | Model | Effort |
|---|---|---|---|
| Repo setup, scaffold, configs | local | sonnet | medium |
| Demo app + 8 seeded bugs + history script (spec A) | ☁ cloud | sonnet | high |
| Design system + shell + case view (spec B) | ☁ cloud | sonnet | high |
| Landing / Proof / Impact / How-it-works (spec C) | ☁ cloud | sonnet | medium |
| Polish list (spec D) | ☁ cloud | sonnet | medium |
| API routes + Redis + ingest | local | sonnet | medium |
| Bob modes / skills / MCP / hooks | **IBM Bob** (Claude only reviews) | — | — |
| Debugging an integration failure | local | sonnet → opus after 2 failed tries | high |
| Architecture change / plan deviation | local | opusplan | high |
| README, descriptions, video script | local | sonnet | medium |
| context.md updates, small text edits | local | haiku | low |

## 5. Subagents (Claude Code)

- **Use for:** parallel independent research; reading many files when you only need the answer;
  reviewing a diff in a clean context.
- **Don't use for:** small tasks — every subagent starts cold and re-reads context (you pay twice).
- The built-in Explore agent inherits your main model (Sonnet main → Sonnet Explore).
- Parallel subagents multiply usage — max 2–3 at once.

Create these in Phase 0 (`.claude/agents/`):

`.claude/agents/scout.md`
```markdown
---
name: scout
description: Fast, cheap read-only lookup. Use to find where something is defined or used, or to summarize a few files.
tools: Read, Grep, Glob
model: haiku
effort: low
maxTurns: 8
---
Answer only what was asked. Return file paths with line numbers and a 3–5 line summary. Never paste whole files.
```

`.claude/agents/reviewer.md`
```markdown
---
name: reviewer
description: Reviews the current diff before commit for correctness bugs, type errors and missing edge cases. Read-only.
tools: Read, Grep, Glob, Bash
disallowedTools: Write, Edit
model: sonnet
effort: high
maxTurns: 15
---
Review only changed files (git diff). Run `npm run typecheck` and the relevant tests. Report at most 5 findings, most severe first, each with file:line and a one-line fix. No style nitpicks.
```

## 6. Project settings (Phase 0) — `.claude/settings.json`

```json
{
  "model": "sonnet",
  "effortLevel": "medium",
  "permissions": {
    "deny": [
      "Read(./node_modules/**)",
      "Read(./**/.next/**)",
      "Read(./**/dist/**)",
      "Read(./.env*)"
    ]
  }
}
```
Committed to the repo, so **cloud sessions use Sonnet by default too**. Secrets go in `.env.local`
(never read, never committed); document variable names in `.env.example`.

## 7. Cloud sessions playbook ($100 credit)

**One-time setup:** GitHub repo exists and is pushed · run `/web-setup` once (sends your `gh` token so
cloud sessions can reach the repo).

**Every job:**
1. Write a spec: `docs/specs/<job>.md` — goal, files/paths to create, acceptance checks, "don't touch" list.
2. Commit + push (the cloud clones GitHub, **not** your local disk).
3. Launch:
   `claude --cloud "Implement docs/specs/ui-shell.md exactly. Work only inside apps/web. Don't ask questions — make reasonable choices and list them in the PR description. Before finishing run npm run typecheck and npm test, fix failures, then open a PR."`
4. Watch at claude.ai/code (phone works too). Steer from the terminal with `claude -p "message" --cloud <session-id>`.
5. Review the diff → merge the PR → `git pull`. To continue a session locally: `claude --teleport`.

**Cost control:**
- Sonnet only (from settings.json); `/effort high` for complex specs, `medium` otherwise.
- One spec per session · at most 2–3 sessions in parallel · stop any session that loops.
- Rough guess: about $3–8 per hour of Sonnet cloud work → $100 ≈ 15–30 session-hours.
  **Calibrate:** note the credit before and after session A.
- In cloud sessions `/clear` doesn't work → start a new session instead; `/compact` works.

## 8. Token-saving habits

- **Session start:** CLAUDE.md auto-loads → read context.md → `graphify query "..."` before opening files.
- Paste only the failing test output / last ~30 lines of a stack trace, not whole logs.
- Ask for targeted edits, not "rewrite the file".
- Name the files; never "check everything".
- `/compact keep: current task, file list, open bugs` when context passes ~50% (`/context` shows it).
- `/clear` after each finished task — context.md is the memory.
- Batch small edits into one request.
- Keep CLAUDE.md short (it's loaded every session).
- Don't let Claude read generated files (lockfiles, `.next`, `dist`) — the deny rules above block them.

## 9. 5-hour window strategy (solo, 48 h)

- Your window starts with your first message → do heavy local work at the start of a window.
- Near the limit → switch to cloud sessions (credit), Bob tasks (Bobcoins) or non-AI work
  (recording, screenshots, slides, testing the app by hand).
- Sleep blocks (01:00–06:30) let the window reset and cloud sessions keep building.
- Sunday afternoon is submission time — keep headroom for last fixes and writing.

## 10. Who does what

| IBM Bob (engine + evidence) | Claude (speed) | You |
|---|---|---|
| modes, skills, rules, MCP server, hooks, AGENTS.md, every BugProof run, Review, commit messages | web app, API, demo app, integration, debugging, docs, video script, slides | Bob approvals, screenshots, manual baseline, voiceover, submission |

## 11. Prompt templates

**Session start**
> Read context.md. Task: <task> (Plan.md §<n>). Use graphify before opening files. Done = <acceptance check>. When finished, update context.md.

**Cloud job**
> Implement docs/specs/<x>.md exactly. Stay inside <paths>. Don't ask questions — decide and list assumptions in the PR. Before finishing run `npm run typecheck` and `npm test`, fix failures, then open a PR titled "<x>". Don't edit Plan.md or context.md.

**Handoff (Haiku, low)**
> Update context.md: Done / Added / Removed / Changed, Bob task log, next 3 steps. Keep it under 120 lines.

**Stuck bug (escalate)**
> Two fixes failed. Here is the exact error: <paste>. Files: <paths>. Think it through, find the root cause, propose the smallest fix. (Run with `/model opus`, `/effort high`, then switch back to Sonnet.)
